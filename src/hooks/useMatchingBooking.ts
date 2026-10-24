import { useCallback } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useBooking, type BookingRequest } from '../context/BookingContext';
import { supabase } from '../lib/supabase';
import { logGraphQLError } from '../lib/logGraphQLError';
import { buildBookingPayload, buildOnBehalfInput } from '../lib/buildBookingPayload';
import { CREATE_BOOKING_ON_BEHALF } from '../graphql/familyGroup';
import { MATCHING_BOOKING_STATUS, SELECT_BOOKING_CAREGIVER } from '../graphql/queries';
import {
  BOOKING_SESSION_EXPIRED_MESSAGE,
  BOOKING_UNCONFIRMED_MESSAGE,
  BOOKING_UNKNOWN_ERROR_MESSAGE,
  bookingHttpErrorMessage,
  isAssessmentRequiredError,
  onBehalfBookingErrorMessage,
} from '../lib/bookingSubmitError';
import {
  BOOKING_NOT_SELECTABLE,
  isCaregiverNotEligibleError,
  matchErrorCode,
} from '../lib/caregiverMatch';
import { useCaregiverMatchStrings } from '../lib/caregiverMatchStrings';
import { useDropRejectedActivities } from './useDropRejectedActivities';

/**
 * PYG-648 · S18 — จองแบบ "สร้าง booking ก่อน แล้วค่อยเลือกผู้ดูแล" (contract PYG-646)
 *
 * ทำไมต้องสร้างก่อน: ระดับ + Required Skills ของงานคำนวณจากแบบประเมินและกิจกรรมของ booking
 *   (S16/S17) — ยังไม่มี booking ก็กรองผู้ดูแลไม่ได้ เดิมหน้ารายชื่อใช้ searchCaregivers ที่ไม่กรอง
 *   ญาติจึงเลือกคนที่ไม่ผ่านได้ แล้วไปโดน 422 CAREGIVER_NOT_ELIGIBLE ตอนกดยืนยัน
 *
 *   prepare — ขั้นตรวจสอบกด "เริ่มต้นค้นหาผู้ดูแล" → สร้าง booking แบบ unmatched (ไม่ส่ง caregiverId)
 *             error ของการจอง (แบบประเมิน / ความยินยอม / เวลา / กิจกรรม) จึงขึ้นที่ขั้นนี้ ก่อนเห็นรายชื่อ
 *   select  — ยืนยันใน modal → selectBookingCaregiver ผูกผู้ดูแล (BE ตรวจเงื่อนไข + ตารางว่างซ้ำ
 *             ตารางไม่ว่าง/นัดชนก็ตอบ CAREGIVER_NOT_ELIGIBLE เหมือนกัน → พากลับไปเลือกคนอื่น)
 */

export type PrepareResult =
  | { ok: true; bookingId: string }
  | { ok: false; message: string; assessmentRequired: boolean };

export type SelectResult =
  | { ok: true; bookingId: string }
  | { ok: false; message: string; notEligible: boolean };

const API_BASE = import.meta.env.VITE_GRAPHQL_URL?.replace('/graphql', '') ?? '';

/** ใบเดียวกันถ้า payload ที่จะส่งเหมือนเดิมทุกช่อง (รวมผู้รับบริการของการจองแทน) */
function draftFingerprint(draft: BookingRequest): string {
  return JSON.stringify([buildBookingPayload(draft), draft.onBehalf ?? null]);
}

export function useMatchingBooking() {
  const { setBookingDraft } = useBooking();
  const client = useApolloClient();
  const dropRejectedActivities = useDropRejectedActivities();
  const matchText = useCaregiverMatchStrings();

  // ★ ยกเลิก/ใช้ซ้ำได้เฉพาะใบที่ยัง unmatched — ใบที่เลือกผู้ดูแลแล้วเป็นการจองจริง ห้ามแตะ
  //   อ่านสถานะไม่ได้ → ถือว่าไม่ใช่ (สร้างใบใหม่ ไม่ยกเลิกอะไร) ดีกว่าเสี่ยงยกเลิกการจองจริงของผู้ใช้
  const isUnmatched = useCallback(
    async (bookingId: string): Promise<boolean> => {
      try {
        const { data } = await client.query<{ myBooking: { status: string } }>({
          query: MATCHING_BOOKING_STATUS,
          variables: { id: bookingId },
          fetchPolicy: 'network-only',
        });
        return data?.myBooking.status === 'unmatched';
      } catch {
        return false;
      }
    },
    [client],
  );

  /** ใบ unmatched ที่ไม่ใช้แล้ว — ไม่มีผู้ดูแลจึงไม่มีใครได้แจ้งเตือน · ล้มเหลวก็ไม่ขวางการจองใบใหม่ */
  const cancelMatchingBooking = useCallback(
    async (bookingId: string): Promise<void> => {
      if (!(await isUnmatched(bookingId))) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        await fetch(`${API_BASE}/api/v1/bookings/${encodeURIComponent(bookingId)}/cancel`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      } catch {
        // ใบค้างเป็นแค่ unmatched ที่ไม่มีผู้ดูแล — ไม่ต้องบอกผู้ใช้
      }
    },
    [isUnmatched],
  );

  const prepare = useCallback(
    async (draft: BookingRequest): Promise<PrepareResult> => {
      const fingerprint = draftFingerprint(draft);
      const current = draft.matchingBooking;
      if (current) {
        // กดค้นหาซ้ำโดยไม่ได้แก้อะไร (เช่น ย้อนกลับจากหน้ารายชื่อ) → ใช้ใบเดิม ไม่สร้างซ้ำ
        if (current.fingerprint === fingerprint && (await isUnmatched(current.id))) {
          return { ok: true, bookingId: current.id };
        }
        await cancelMatchingBooking(current.id);
        setBookingDraft((prev) => (prev ? { ...prev, matchingBooking: undefined } : prev));
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return { ok: false, message: BOOKING_SESSION_EXPIRED_MESSAGE, assessmentRequired: false };

        const payload = buildBookingPayload(draft);
        let bookingId: string | undefined;

        if (draft.onBehalf) {
          // PYG-385: จองแทนสมาชิกในกลุ่ม — payload เดียวกัน คนละ endpoint (booker ยังเป็นเจ้าของ booking)
          try {
            const { data } = await client.mutate<{ createBookingOnBehalf?: { id: string } }>({
              mutation: CREATE_BOOKING_ON_BEHALF,
              variables: { input: buildOnBehalfInput(draft, draft.onBehalf, payload) },
            });
            bookingId = data?.createBookingOnBehalf?.id;
          } catch (err) {
            // PYG-540: อ่าน code แบบ Apollo 4 + รองรับ CONSENT_WITHDRAWN (ดู bookingSubmitError.ts)
            dropRejectedActivities(err);
            return {
              ok: false,
              message: onBehalfBookingErrorMessage(err, draft.onBehalf.recipientName),
              assessmentRequired: false,
            };
          }
        } else {
          const res = await fetch(`${API_BASE}/api/v1/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            dropRejectedActivities(errData);
            return {
              ok: false,
              message: bookingHttpErrorMessage(res.status, errData, draft.recipient?.patientDetails?.name),
              assessmentRequired: isAssessmentRequiredError(errData),
            };
          }
          const resData = (await res.json().catch(() => null)) as { id?: string } | null;
          bookingId = resData?.id;
        }

        if (!bookingId) return { ok: false, message: BOOKING_UNCONFIRMED_MESSAGE, assessmentRequired: false };
        const created = bookingId;
        setBookingDraft((prev) => (prev ? { ...prev, matchingBooking: { id: created, fingerprint } } : prev));
        return { ok: true, bookingId: created };
      } catch (err) {
        // ไม่รู้ว่าคำขอไปถึงหรือไม่ — ข้อความบอกให้ตรวจ "การจองของฉัน" ก่อนลองใหม่
        // PYG-700: error ของการจองสะท้อนค่าที่ส่ง (ชื่อ เบอร์ ที่อยู่) — log ผ่านตัว redact เท่านั้น
        logGraphQLError('CreateMatchingBooking', err);
        return { ok: false, message: BOOKING_UNKNOWN_ERROR_MESSAGE, assessmentRequired: false };
      }
    },
    [client, isUnmatched, cancelMatchingBooking, setBookingDraft, dropRejectedActivities],
  );

  const select = useCallback(
    async (draft: BookingRequest, caregiverId: string): Promise<SelectResult> => {
      const bookingId = draft.matchingBooking?.id;
      if (!bookingId) return { ok: false, message: matchText.noMatchingBooking, notEligible: false };
      try {
        // ★ ไม่ล้าง matchingBooking ออกจาก draft ตรงนี้ — หน้ารายชื่อจะ redirect ทันทีที่ค่าหาย
        //   (ก่อนพาไปหน้าสำเร็จ / ระหว่าง modal แสดง error) · หน้าสำเร็จล้างทั้ง draft อยู่แล้ว
        //   และใบที่เลือกแล้วไม่ใช่ unmatched → prepare / cancelMatchingBooking ไม่แตะเอง
        await client.mutate({
          mutation: SELECT_BOOKING_CAREGIVER,
          variables: { bookingId, caregiverId },
        });
        return { ok: true, bookingId };
      } catch (err) {
        if (isCaregiverNotEligibleError(err)) {
          return { ok: false, message: matchText.notEligible, notEligible: true };
        }
        if (matchErrorCode(err) === BOOKING_NOT_SELECTABLE) {
          // เลือกไปแล้ว (เช่น กดซ้ำ / อีกแท็บ) หรือถูกยกเลิก — กดค้นหาใหม่ prepare จะเห็นว่าไม่ใช่ unmatched แล้วสร้างใบใหม่
          return { ok: false, message: matchText.notSelectable, notEligible: false };
        }
        logGraphQLError('SelectBookingCaregiver', err);
        return { ok: false, message: matchText.selectFailed, notEligible: false };
      }
    },
    [client, matchText],
  );

  return { prepare, select, cancelMatchingBooking };
}
