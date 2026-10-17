import { gql } from "@apollo/client";

/**
 * PYG-557 · S02 — กำหนด / แก้ / อ่านระดับผู้ดูแล
 *
 * ⚠ ข้อเสนอ contract ฝั่ง FE ตาม PYG-579 — BE ยังไม่มี operation เหล่านี้ (PYG-579 / PYG-581)
 *   ยังไม่ถูกเรียกใช้ ตอนนี้ useCareLevel เป็น mock · ถ้า BE ตั้งชื่อต่างจากนี้ แก้ที่ไฟล์นี้ที่เดียว
 *
 * enum CareLevel { BASIC INTERMEDIATE ADVANCED } — ใช้ร่วมกับระดับ booking (S16)
 * careLevelSetBy = null แปลว่าได้ค่าเริ่มต้นจาก migration ยังไม่ผ่านการทบทวน (R6 · E3)
 * กำหนดเป็นค่าเดิม: ตอบสำเร็จ ไม่เพิ่มประวัติ (E4)
 * Error code (422): CARE_LEVEL_REQUIRED (อนุมัติโดยยังไม่มีระดับ) · CARE_LEVEL_INVALID (ค่านอกรายการ)
 *
 * ยังไม่เคาะ (PYG-579): ส่งระดับพร้อม approveKyc หรือกำหนดด้วย setCaregiverCareLevel ก่อนอนุมัติ
 *   FE ตอนนี้: อนุมัติก่อนแล้วบันทึกระดับลง mock — เปลี่ยนจุดเดียวที่ useCareLevel.setLevel / KycReviewDetailPage.handleApprove
 */

export const SET_CAREGIVER_CARE_LEVEL = gql`
  mutation SetCaregiverCareLevel($caregiverId: ID!, $level: CareLevel!, $reason: String) {
    setCaregiverCareLevel(caregiverId: $caregiverId, level: $level, reason: $reason) {
      id
      careLevel
      careLevelSetAt
      careLevelSetBy {
        id
        displayName
        email
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
      reason
      createdAt
      changedBy {
        id
        displayName
        email
      }
    }
  }
`;

export interface CareLevelActor {
  id: string;
  displayName?: string | null;
  email?: string | null;
}

export interface CareLevelHistoryEntry {
  id: string;
  oldLevel: string | null;
  newLevel: string;
  reason: string | null;
  createdAt: string | null;
  /** null = ระบบ (ค่าเริ่มต้นจาก migration) */
  changedBy: CareLevelActor | null;
}
