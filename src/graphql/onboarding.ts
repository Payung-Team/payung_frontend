/**
 * Onboarding ของผู้สูงอายุ — PYG-500 (สัญญาตาม PYG-498)
 *
 * ⚠ ยังไม่มีใน backend ณ วันที่เขียน — PYG-498 เป็นคนสร้าง mutation นี้
 *   หน้า Onboarding เรียกได้ทันทีที่ PR ของ PYG-498 เข้า dev โดยไม่ต้องแก้ฝั่งนี้
 *
 * ★ ตั้งใจแยกไฟล์ ไม่ไปเติม firstName / lastName / onboardingCompleted ใน GET_USER
 *   เพราะ GET_USER ถูกใช้หลายหน้าทั่วแอป ถ้าใส่ฟิลด์ที่ BE ยังไม่มี GraphQL จะตอบ error
 *   ทั้งคำขอ → ทุกหน้าที่เรียก GET_USER พังพร้อมกัน ทั้งที่ยังไม่เกี่ยวกับ Onboarding เลย
 */
import { gql } from '@apollo/client';

/**
 * บันทึกข้อมูลผู้รับบริการของตัวเองตอน Onboarding
 *
 * `details` ใช้รูปทรงเดียวกับ PatientProfile (PYG-460) — ชุดเดียวกับฟอร์มเลือกผู้รับบริการ
 * BE บังคับ age / gender / supportLevel เพิ่มเฉพาะเส้นทางนี้ (DTO เดิมยัง optional ทั้งหมด)
 */
export const COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding(
    $firstName: String!
    $lastName: String!
    $nickname: String
    $details: PatientProfileInput!
  ) {
    completeOnboarding(
      firstName: $firstName
      lastName: $lastName
      nickname: $nickname
      details: $details
    ) {
      id
      firstName
      lastName
      onboardingCompleted
    }
  }
`;

/** ตัวแปรของ completeOnboarding — ให้ TS ช่วยจับตอนเรียก */
export interface CompleteOnboardingVars {
  firstName: string;
  lastName: string;
  nickname?: string;
  details: {
    age: number;
    gender: string;
    supportLevel: string;
    weight?: number;
    height?: number;
    bloodGroup?: string;
    conditions?: string[];
    medicines?: string;
    allergies?: string;
    careInstructions?: string;
    regularHospital?: string;
  };
}

export interface CompleteOnboardingData {
  completeOnboarding: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    onboardingCompleted: boolean;
  };
}
