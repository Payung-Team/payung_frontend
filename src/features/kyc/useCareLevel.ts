import { useRef } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { ADMIN_KYC_DETAIL } from '../../graphql/queries';
import {
  CAREGIVER_CARE_LEVEL_HISTORY,
  SET_CAREGIVER_CARE_LEVEL,
  type CareLevelChange,
  type CaregiverCareLevelInfo,
} from '../../graphql/careLevel';
import { toCareLevel, type CareLevel } from '../../lib/careLevels';

/**
 * ระดับผู้ดูแลฝั่งแอดมิน (PYG-557 · S02 · BE PYG-581) — ใช้ในหน้า KYC review
 *
 * ระดับปัจจุบันมากับ ADMIN_KYC_DETAIL (careLevelInfo) — hook นี้รับมาแสดง แล้วดึงประวัติ + แก้ระดับเพิ่ม
 * แก้ระดับสำเร็จ → refetch ADMIN_KYC_DETAIL + ประวัติ บนหน้าเดิม
 * ฝั่งผู้ดูแลไม่ใช้ hook นี้ — อ่าน Caregiver.careLevel ตรงๆ (ไม่มีสิทธิ์เห็นผู้กำหนด / ประวัติ)
 */

export interface CareLevelData {
  level: CareLevel | null;
  setByName: string | null;
  setAt: string | null;
  /** ค่าเริ่มต้นจาก migration ยังไม่ทบทวน (S02-AC6 · E3) */
  unreviewed: boolean;
  /** ใหม่ไปเก่า */
  history: CareLevelChange[];
  historyLoading: boolean;
  saving: boolean;
  /**
   * แก้ระดับของผู้ดูแลที่อนุมัติแล้ว · ค่าเดิมคืน changed = false (E4) · เรียกซ้ำระหว่างบันทึกถูกเมิน
   * โยน error ต่อให้หน้าจอแปลง code (CARE_LEVEL_REASON_REQUIRED ฯลฯ) เป็นข้อความ
   */
  setLevel: (level: CareLevel, reason: string) => Promise<{ changed: boolean }>;
}

export function useAdminCareLevel(
  caregiverId: string | null | undefined,
  info: CaregiverCareLevelInfo | null | undefined,
  options: { kycStatus?: string | null } = {},
): CareLevelData {
  const inFlight = useRef(false);
  const isVerified = options.kycStatus === 'verified';

  // ผู้ดูแลที่ยังไม่อนุมัติยังไม่มีประวัติให้ดู (ระดับแรกตั้งตอนกดอนุมัติ)
  const { data: historyData, loading: historyLoading } = useQuery<{ caregiverCareLevelHistory: CareLevelChange[] }>(
    CAREGIVER_CARE_LEVEL_HISTORY,
    { variables: { caregiverId }, skip: !caregiverId || !isVerified, fetchPolicy: 'cache-and-network' },
  );

  const [setCareLevel, { loading: saving }] = useMutation<{ setCaregiverCareLevel: { changed: boolean } }>(
    SET_CAREGIVER_CARE_LEVEL,
    {
      refetchQueries: [
        { query: ADMIN_KYC_DETAIL, variables: { caregiverId } },
        { query: CAREGIVER_CARE_LEVEL_HISTORY, variables: { caregiverId } },
      ],
      awaitRefetchQueries: true,
    },
  );

  return {
    level: toCareLevel(info?.level),
    setByName: info?.setByName ?? null,
    setAt: info?.setAt ?? null,
    unreviewed: !!info?.needsReview,
    history: historyData?.caregiverCareLevelHistory ?? [],
    historyLoading,
    saving,

    async setLevel(level, reason) {
      if (!caregiverId || inFlight.current) return { changed: false };
      inFlight.current = true;
      try {
        const result = await setCareLevel({
          variables: { input: { caregiverId, level, reason: reason.trim() } },
        });
        return { changed: result.data?.setCaregiverCareLevel.changed ?? false };
      } finally {
        inFlight.current = false;
      }
    },
  };
}
