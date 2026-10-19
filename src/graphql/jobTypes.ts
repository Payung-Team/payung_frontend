import { gql } from '@apollo/client';

/**
 * ประเภทงานที่ผู้ดูแลที่ล็อกอินเลือกได้ (PYG-593 · BE PYG-592)
 * query แยกจาก GET_WORK_CONDITION โดยตั้งใจ: ถ้า BE ยังไม่มี field นี้ จะล้มแค่ query นี้
 * หน้าตั้งค่าการรับงานยังใช้ได้ (ทุกประเภทเปิด แล้วให้ BE ตัดสินตอนบันทึก)
 */
export const GET_MY_JOB_TYPE_OPTIONS = gql`
  query MyJobTypeOptions {
    myJobTypeOptions {
      jobType
      selectable
      blockedReason
    }
  }
`;
