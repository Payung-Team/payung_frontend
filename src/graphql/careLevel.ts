import { gql } from "@apollo/client";
import { CARE_LEVEL_INFO_FIELDS } from "./queries";

/**
 * PYG-557 · S02 — แก้ / อ่านระดับผู้ดูแลฝั่งแอดมิน (BE PYG-581 · contract PYG-579)
 *
 * ระดับแรกของผู้ดูแลใหม่ตั้งตอนอนุมัติ: APPROVE_KYC(careLevel) ใน queries.ts — ไม่ใช่ที่นี่
 * setCaregiverCareLevel ใช้กับผู้ดูแลที่ KYC อนุมัติแล้วเท่านั้น
 *   - ค่าเดิมที่แอดมินกำหนดไว้แล้ว → changed: false ไม่เพิ่มประวัติ (E4)
 *   - ยืนยันค่าเริ่มต้นจาก migration (ค่าเดิม แต่ยังไม่มีผู้กำหนด) → นับเป็นการเปลี่ยน ต้องมีเหตุผล
 *   - เปลี่ยนจริงต้องมีเหตุผล (มติ 2026-10-18)
 * Error (extensions.code): CARE_LEVEL_REQUIRED · CARE_LEVEL_INVALID · CARE_LEVEL_REASON_REQUIRED · CARE_LEVEL_KYC_NOT_VERIFIED
 */

export const SET_CAREGIVER_CARE_LEVEL = gql`
  mutation SetCaregiverCareLevel($input: SetCaregiverCareLevelInput!) {
    setCaregiverCareLevel(input: $input) {
      changed
      careLevel {
        ${CARE_LEVEL_INFO_FIELDS}
      }
    }
  }
`;

/** แอดมินเท่านั้น · เรียงใหม่ไปเก่า */
export const CAREGIVER_CARE_LEVEL_HISTORY = gql`
  query CaregiverCareLevelHistory($caregiverId: ID!) {
    caregiverCareLevelHistory(caregiverId: $caregiverId) {
      id
      oldLevel
      newLevel
      changedBy
      changedByName
      reason
      source
      createdAt
    }
  }
`;

export interface CaregiverCareLevelInfo {
  caregiverId: string;
  /** null = ยังไม่มีระดับ */
  level: string | null;
  /** มีระดับแต่ยังไม่มีแอดมินทบทวน (ค่าเริ่มต้นจาก migration · E3 / AC6) */
  needsReview: boolean;
  setAt: string | null;
  /** null = ระบบตั้งให้ (migration) */
  setBy: string | null;
  setByName: string | null;
}

export type CareLevelChangeSource = 'MIGRATION_DEFAULT' | 'KYC_APPROVAL' | 'ADMIN_UPDATE';

export interface CareLevelChange {
  id: string;
  /** null = กำหนดครั้งแรก */
  oldLevel: string | null;
  newLevel: string;
  changedBy: string | null;
  changedByName: string | null;
  reason: string | null;
  source: CareLevelChangeSource;
  createdAt: string;
}
