/**
 * Onboarding ของผู้สูงอายุ — PYG-500 (สัญญาตาม PYG-498)
 *
 * ต้องการ backend จาก PYG-498 (mutation completeOnboarding + User.onboardingCompleted)
 *   — ต้อง merge PR ฝั่ง backend ก่อน หน้านี้ถึงจะบันทึกได้จริง
 *
 * ★ ตั้งใจแยกไฟล์ ไม่ไปเติม firstName / lastName / onboardingCompleted ใน GET_USER
 *   เพราะ GET_USER ถูกใช้หลายหน้าทั่วแอป ถ้าใส่ฟิลด์ที่ BE ยังไม่มี GraphQL จะตอบ error
 *   ทั้งคำขอ → ทุกหน้าที่เรียก GET_USER พังพร้อมกัน ทั้งที่ยังไม่เกี่ยวกับ Onboarding เลย
 */
import { gql } from '@apollo/client';
import type { ConsentAnswer } from './consent';

/**
 * บันทึกข้อมูลผู้รับบริการของตัวเองตอน Onboarding
 *
 * `details` ใช้รูปทรงเดียวกับ PatientProfile (PYG-460) — ชุดเดียวกับฟอร์มเลือกผู้รับบริการ
 * BE บังคับ age / gender / supportLevel เพิ่มเฉพาะเส้นทางนี้ (DTO เดิมยัง optional ทั้งหมด)
 */
export const COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding($input: CompleteOnboardingInput!) {
    completeOnboarding(input: $input) {
      id
      firstName
      lastName
      onboardingCompleted
    }
  }
`;

/** ตัวแปรของ completeOnboarding — ให้ TS ช่วยจับตอนเรียก */
export interface CompleteOnboardingVars {
  input: {
    firstName: string;
    lastName: string;
    nickname?: string;
    /**
     * PYG-538/539 — ความยินยอมที่ผู้ใช้กดบนหน้า Onboarding
     * ต้องมี sensitive_health_data ที่ granted = true ไม่งั้น BE ปฏิเสธทั้งคำขอ
     * policyVersion ต้องมาจาก consentPolicy.version ห้าม hardcode
     */
    consents: ConsentAnswer[];
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
