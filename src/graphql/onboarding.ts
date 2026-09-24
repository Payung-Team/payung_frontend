/**
 * Onboarding ของผู้สูงอายุ — PYG-500 (สัญญาตาม PYG-498)
 *
 * ต้องการ backend จาก PYG-498 (mutation completeOnboarding + User.onboardingCompleted)
 *   — ต้อง merge PR ฝั่ง backend ก่อน หน้านี้ถึงจะบันทึกได้จริง
 *
 * ★ ตั้งใจแยกไฟล์ ไม่ไปเติม firstName / lastName / onboardingCompleted ใน GET_USER
 *   เพราะ GET_USER ถูกใช้หลายหน้าทั่วแอป ถ้าใส่ฟิลด์ที่ BE ยังไม่มี GraphQL จะตอบ error
 *   ทั้งคำขอ → ทุกหน้าที่เรียก GET_USER พังพร้อมกัน ทั้งที่ยังไม่เกี่ยวกับ Onboarding เลย
 *   (และ onboardingCompleted ต้องยิง query ตาราง care_recipients + consent เพิ่มทุกครั้ง)
 */
import { gql } from '@apollo/client';
import type { ConsentAnswer } from './consent';

/**
 * สถานะ Onboarding ของผู้ใช้ปัจจุบัน — ใช้ใน route guard หลัง login (PYG-501)
 *
 * BE คืน true เสมอสำหรับ role อื่นที่ไม่ใช่ผู้สูงอายุ และคืน false ถ้าถอนความยินยอม
 * ข้อมูลสุขภาพแล้ว (PYG-538) แม้โปรไฟล์เดิมจะยังอยู่
 *
 * ★ ต้องขอ id ด้วย — Apollo จะ normalize เป็น User:<id> ก้อนเดียวกับผลของ
 *   completeOnboarding ข้างล่าง พอบันทึกเสร็จ guard เห็น true ทันทีโดยไม่ต้อง refetch
 *   ถ้าไม่มี id หลังกดบันทึกจะโดนเด้งกลับมาหน้า Onboarding ซ้ำ
 */
export const GET_ONBOARDING_STATUS = gql`
  query GetOnboardingStatus {
    me {
      id
      role
      onboardingCompleted
    }
  }
`;

export interface OnboardingStatusData {
  me: {
    id: string;
    role: number;
    onboardingCompleted: boolean;
  } | null;
}

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
