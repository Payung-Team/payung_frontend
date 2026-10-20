import { gql } from '@apollo/client';

/**
 * กิจกรรมการดูแลกลาง (PYG-635 · S15 · BE PYG-634 · contract PYG-632)
 *
 * - careActivities = เฉพาะที่เปิดใช้งาน เรียงตามหมวดแล้ว sortOrder (หน้าจอง)
 * - adminCareActivities = ทุกสถานะ (แอดมิน) · ไม่มีการลบ มีแค่ปิด/เปิดใช้งาน
 * - กิจกรรมของ booking เป็น snapshot ณ วันจอง — แก้ชื่อ/ปิดใช้งานทีหลังไม่กระทบการจองเดิม
 *
 * ★ กิจกรรมของ booking อยู่ใน query แยก (ไม่ใส่ใน GET_MY_BOOKING / GET_CAREGIVER_BOOKING) โดยตั้งใจ:
 *   ถ้า FE ขึ้นก่อน BE PYG-634 จะล้มแค่ส่วนกิจกรรม หน้ารายละเอียดการจองยังเปิดได้
 */

export type CareActivityLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';

export interface CareActivity {
  id: string;
  /** รหัส T-01 (A01…) · null = แอดมินเพิ่มเอง */
  code: string | null;
  nameTh: string;
  nameEn: string | null;
  category: string;
  careLevel: CareActivityLevel;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

/** snapshot ที่บันทึกกับ booking */
export interface BookingActivity {
  activityId: string;
  name: string;
  category: string;
  careLevel: CareActivityLevel;
}

const CARE_ACTIVITY_FIELDS = `
  id
  code
  nameTh
  nameEn
  category
  careLevel
  isActive
  sortOrder
  updatedAt
`;

const BOOKING_ACTIVITY_FIELDS = `
  activityId
  name
  category
  careLevel
`;

export const CARE_ACTIVITIES = gql`
  query CareActivities {
    careActivities {
      ${CARE_ACTIVITY_FIELDS}
    }
  }
`;

export const ADMIN_CARE_ACTIVITIES = gql`
  query AdminCareActivities($filter: AdminCareActivitiesFilter) {
    adminCareActivities(filter: $filter) {
      ${CARE_ACTIVITY_FIELDS}
    }
  }
`;

export const CREATE_CARE_ACTIVITY = gql`
  mutation CreateCareActivity($input: CreateCareActivityInput!) {
    createCareActivity(input: $input) {
      ${CARE_ACTIVITY_FIELDS}
    }
  }
`;

export const UPDATE_CARE_ACTIVITY = gql`
  mutation UpdateCareActivity($id: ID!, $input: UpdateCareActivityInput!) {
    updateCareActivity(id: $id, input: $input) {
      ${CARE_ACTIVITY_FIELDS}
    }
  }
`;

export const SET_CARE_ACTIVITY_ACTIVE = gql`
  mutation SetCareActivityActive($id: ID!, $isActive: Boolean!) {
    setCareActivityActive(id: $id, isActive: $isActive) {
      ${CARE_ACTIVITY_FIELDS}
    }
  }
`;

export const MY_BOOKING_ACTIVITIES = gql`
  query MyBookingActivities($id: ID!) {
    myBooking(id: $id) {
      id
      activities {
        ${BOOKING_ACTIVITY_FIELDS}
      }
    }
  }
`;

export const CAREGIVER_BOOKING_ACTIVITIES = gql`
  query CaregiverBookingActivities($id: ID!) {
    caregiverBooking(id: $id) {
      id
      activities {
        ${BOOKING_ACTIVITY_FIELDS}
      }
    }
  }
`;
