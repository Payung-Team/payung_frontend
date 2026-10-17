import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toCareLevel, type CareLevel } from '../../lib/careLevels';
import type { CareLevelActor, CareLevelHistoryEntry } from '../../graphql/careLevel';
import { migrationDefault, mockDelay, saveMockCareLevel, useCareLevelMockState } from '../../mocks/careLevelMock';

/**
 * ข้อมูลระดับผู้ดูแล (PYG-557 · S02) — หน้าจอ (KYC review / โปรไฟล์ผู้ดูแล) ใช้ผ่าน interface นี้เท่านั้น
 *
 * ตอนนี้เป็น MOCK — เก็บใน localStorage (mocks/careLevelMock.ts)
 * ค่าจริงจาก BE ถูกใช้ก่อน mock เสมอ: ส่ง careLevel ที่ query ได้มาใน `api` (ดู CARE_LEVEL_FIELDS ใน graphql/queries.ts)
 * TODO(PYG-582): เชื่อมแต่ละจุดกับ operation ใน graphql/careLevel.ts ตามที่ระบุไว้ข้างล่าง แล้วไม่ต้องแก้หน้าจอ
 */

export interface CareLevelApiFields {
  careLevel?: string | null;
  careLevelSetAt?: string | null;
  careLevelSetBy?: CareLevelActor | null;
}

export interface CareLevelData {
  level: CareLevel | null;
  setBy: CareLevelActor | null;
  setAt: string | null;
  /** มีระดับแต่ไม่มีผู้กำหนด = ค่าเริ่มต้นจาก migration ยังไม่ทบทวน (S02-AC6 · E3) */
  unreviewed: boolean;
  /** ใหม่ไปเก่า · ฝั่งแอดมินเท่านั้น */
  history: CareLevelHistoryEntry[];
  saving: boolean;
  /** แอดมินเท่านั้น · ค่าเดิมคืน changed = false และไม่เพิ่มประวัติ (E4) · เรียกซ้ำระหว่างบันทึกถูกเมิน */
  setLevel: (level: CareLevel, reason?: string) => Promise<{ changed: boolean }>;
}

export function useCareLevel(
  caregiverId: string | null | undefined,
  options: { kycStatus?: string | null; api?: CareLevelApiFields | null } = {},
): CareLevelData {
  const mock = useCareLevelMockState();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);

  const apiLevel = toCareLevel(options.api?.careLevel);
  // TODO(PYG-582): history = useQuery(CAREGIVER_CARE_LEVEL_HISTORY, { variables: { caregiverId }, skip: !isAdmin })
  const stored = caregiverId ? mock[caregiverId] ?? null : null;
  const record = stored ?? (options.kycStatus === 'verified' ? migrationDefault() : null);

  const level = apiLevel ?? record?.level ?? null;
  const setBy = apiLevel ? options.api?.careLevelSetBy ?? null : record?.setBy ?? null;
  const setAt = apiLevel ? options.api?.careLevelSetAt ?? null : record?.setAt ?? null;

  return {
    level,
    setBy,
    setAt,
    unreviewed: !!level && !setBy,
    history: record?.history ?? [],
    saving,

    // TODO(PYG-582): SET_CAREGIVER_CARE_LEVEL { caregiverId, level, reason } แล้ว refetch ADMIN_KYC_DETAIL + CAREGIVER_CARE_LEVEL_HISTORY
    //   error: CARE_LEVEL_INVALID → strings.invalid (ดู KycReviewDetailPage.careLevelErrorMessage)
    async setLevel(next, reason) {
      if (!caregiverId || inFlight.current) return { changed: false };
      inFlight.current = true;
      setSaving(true);
      try {
        await mockDelay();
        const actor: CareLevelActor = {
          id: user?.id ?? 'admin',
          email: user?.email ?? null,
          displayName: (user?.user_metadata?.full_name as string | undefined) ?? null,
        };
        return saveMockCareLevel(caregiverId, record, next, actor, reason?.trim() || null);
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
    },
  };
}
