import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { JOB_QR, ROTATE_JOB_QR } from '../graphql/queries';
import { extractGraphQLErrorMessage } from '../lib/apolloErrors';
import type { JobQr } from '../lib/jobQr';

// ── QR เช็คอิน/เช็คเอาท์ ฝั่งผู้รับบริการ (PYG-437 · การ์ดแม่ PYG-433) ─────────
//
// หน้าที่ของ hook นี้มีอย่างเดียว: ดึง `jobQr(bookingId)` มาให้การ์ด QR วาด
// และคอยรีเฟรชให้ "สถานะบนจอตรงกับความจริง" โดยที่ผู้ใช้ไม่ต้องกด F5
//
// ทำไมต้องรีเฟรช: ตอนผู้ดูแลสแกน QR สถานะฝั่งเซิร์ฟเวอร์จะขยับเอง
//   PENDING → CHECKED_IN → CHECKED_OUT
// ถ้าไม่รีเฟรช ผู้รับบริการจะยังเห็น "รอผู้ดูแลเช็คอิน" ค้างอยู่ ทั้งที่เช็คอินไปแล้ว
// ซึ่งเป็นความเข้าใจผิดแบบเดียวกับที่หน้า tracking (PYG-361) พยายามกันไว้
//
// ★ ทำไมไม่ใช้ Supabase realtime เหมือน useJobEvents:
//   ตาราง job_sessions มีคอลัมน์ token_hash อยู่ด้วย การ subscribe แถวนั้นตรง ๆ
//   = ลากค่าที่ไม่ควรถึงมือ browser ลงมาโดยไม่จำเป็น จึงเลือก poll ธรรมดาแทน
//   (การสแกนเกิดขึ้นแค่ 2 ครั้งต่องาน ช้าไป 30 วิ ไม่ได้ทำให้ใครเสียหาย)

/** ถี่แค่ไหนถึงจะถามเซิร์ฟเวอร์ซ้ำว่าสถานะเปลี่ยนหรือยัง (เท่ากับ useJobEvents) */
const POLL_INTERVAL_MS = 30_000;

interface UseJobQrOptions {
  /** true = ไม่ต้องยิง query เลย (เช่น งานยังไม่จ่ายเงิน / ผู้ใช้ไม่ใช่ผู้รับบริการ) */
  skip?: boolean;
}

export interface UseJobQrResult {
  qr: JobQr | null;
  loading: boolean;
  /**
   * ข้อความไทยจากเซิร์ฟเวอร์ พร้อมแสดงให้ผู้ใช้อ่านตรง ๆ — null = ไม่มี error
   *
   * backend เขียน message พวกนี้ไว้ให้ผู้ใช้อ่านอยู่แล้ว เช่น
   *   · "งานนี้ยังไม่มี QR (เป็นงานที่จองไว้ก่อนระบบ QR เปิดใช้)"
   *   · "งานนี้ไม่ใช่ของคุณ"        ← สมาชิกครอบครัวที่ไม่ได้เป็นคนกดจอง
   *   · "งานนี้ถูกยกเลิกแล้ว QR จึงใช้ไม่ได้"
   * เราจึงส่งต่อตรง ๆ แทนที่จะ map เป็นโค้ดแล้วเขียนคำใหม่ให้เพี้ยนจากของจริง
   */
  errorMessage: string | null;
  refetch: () => void;

  // ── PYG-437: ออก QR ใบใหม่ ──────────────────────────────────────────────

  /**
   * ขอ token ใหม่จากเซิร์ฟเวอร์ — ★ ใบเก่าใช้ไม่ได้ทันทีที่ทำงานเสร็จ
   *
   * ไม่ throw — ถ้าพลาดจะไปโผล่ที่ rotateErrorMessage แทน
   * เพราะปุ่มนี้อยู่กลางการ์ดที่กำลังแสดง QR ที่ใช้งานได้อยู่
   * ถ้าปล่อย error ทะลุขึ้นไป ทั้งหน้าจะพังทั้งที่ QR ใบเดิมยังใช้ได้ปกติ
   */
  rotate: () => void;
  /** true = กำลังขอใบใหม่อยู่ (ปุ่มควรกดซ้ำไม่ได้) */
  rotating: boolean;
  /** ข้อความไทยจากเซิร์ฟเวอร์ เช่น "งานนี้ปิดเรียบร้อยแล้ว จึงไม่ต้องออก QR ใหม่" */
  rotateErrorMessage: string | null;
}

export function useJobQr(
  bookingId: string | undefined,
  { skip = false }: UseJobQrOptions = {},
): UseJobQrResult {
  const { data, loading, error, refetch } = useQuery<{ jobQr: JobQr }>(JOB_QR, {
    variables: { bookingId: bookingId ?? '' },
    skip: skip || !bookingId,
    fetchPolicy: 'cache-and-network',
    // งานที่ยังไม่มี QR / ไม่ใช่ของเรา เป็น "สถานะปกติของการ์ดใบนี้" ไม่ใช่หน้าพัง
    // errorPolicy: 'all' ทำให้ error ไหลมาที่ตัวแปร error แทนที่จะโยนทิ้งทั้งหน้า
    errorPolicy: 'all',
  });

  const qr = data?.jobQr ?? null;

  // ── PYG-437: ออก QR ใบใหม่ ────────────────────────────────────────────────
  //
  // ★ ทำไมต้องเขียนแคชเองด้วย cache.writeQuery แทนที่จะปล่อยให้ Apollo จัดการ:
  //   Apollo อัปเดตแคชให้อัตโนมัติได้ก็ต่อเมื่อ object มี id ให้อ้างอิง
  //   แต่ JobQr ไม่มีฟิลด์ id (มีแค่ bookingId ซึ่ง Apollo ไม่รู้ว่าเป็นกุญแจ)
  //   ถ้าไม่เขียนเอง: mutation สำเร็จแต่การ์ดบนจอยังโชว์ QR ใบเก่าค้างอยู่
  //   จนกว่าจะครบรอบ poll 30 วินาที — ผู้ใช้จะกดปุ่มซ้ำเพราะคิดว่าไม่ทำงาน
  const [rotateMutation, { loading: rotating }] = useMutation<{
    rotateJobQr: JobQr;
  }>(ROTATE_JOB_QR, {
    update(cache, { data: mutationData }) {
      const fresh = mutationData?.rotateJobQr;
      if (!fresh) return;
      cache.writeQuery({
        query: JOB_QR,
        variables: { bookingId: fresh.bookingId },
        data: { jobQr: fresh },
      });
    },
  });

  const [rotateErrorMessage, setRotateErrorMessage] = useState<string | null>(
    null,
  );

  const rotate = useCallback(() => {
    if (!bookingId || skip) return;
    setRotateErrorMessage(null);
    rotateMutation({ variables: { bookingId } }).catch((err: unknown) => {
      // ★ ห้ามเอา err ทั้งก้อนเข้า console — response ของ operation นี้มี token อยู่ในนั้น
      setRotateErrorMessage(
        extractGraphQLErrorMessage(err) ?? 'ออก QR ใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง',
      );
    });
  }, [bookingId, skip, rotateMutation]);

  // หยุด poll เมื่อปิดงานแล้ว — CHECKED_OUT เป็นสถานะสุดท้าย ถามซ้ำไปก็ได้คำตอบเดิม
  const pollInterval = qr?.status === 'CHECKED_OUT' ? 0 : POLL_INTERVAL_MS;

  const safeRefetch = useCallback(() => {
    if (!bookingId || skip) return;
    // กลืน error ของ network ที่เกิดชั่วคราว — รอบ poll ถัดไปจะตามเก็บให้เอง
    refetch().catch(() => {});
  }, [bookingId, skip, refetch]);

  // ── 1. poll เป็นระยะ ──────────────────────────────────────────────────────
  // ตั้ง interval เองแทนการส่ง pollInterval เข้า useQuery เพราะเราต้อง "ปิด" มัน
  // ตอนงานจบ ซึ่งเป็นเงื่อนไขที่เพิ่งรู้หลังจาก query รอบแรกคืนค่ามาแล้ว
  // (pollInterval === 0 → effect นี้ return ทิ้งตั้งแต่บรรทัดแรก ไม่มี timer ค้าง)
  useEffect(() => {
    if (!bookingId || skip || pollInterval === 0) return;
    const timer = setInterval(safeRefetch, pollInterval);
    return () => clearInterval(timer);
  }, [bookingId, skip, pollInterval, safeRefetch]);

  // ── 2. กลับมาที่แท็บนี้เมื่อไหร่ ให้ตามเก็บทันที ─────────────────────────────
  // browser หรี่ timer ของแท็บที่อยู่ข้างหลังทิ้ง ถ้าไม่มีอันนี้ ผู้ใช้สลับแท็บกลับมา
  // จะเห็นข้อมูลเก่าค้างอยู่จนกว่าจะครบรอบ poll ถัดไป
  useEffect(() => {
    if (!bookingId || skip) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') safeRefetch();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [bookingId, skip, safeRefetch]);

  return {
    qr,
    loading,
    // ★ ห้ามเอา error object ไปเข้า console — ดูคำอธิบายที่ lib/logGraphQLError.ts
    //   (ที่นี่ยิ่งต้องระวังเป็นพิเศษ เพราะ response ของ query นี้มี token อยู่ในนั้น)
    errorMessage: error ? (extractGraphQLErrorMessage(error) ?? 'โหลด QR ไม่สำเร็จ') : null,
    refetch: safeRefetch,
    rotate,
    rotating,
    rotateErrorMessage,
  };
}

export default useJobQr;
