/**
 * สมัคร / ล็อกอิน / ผูกเบอร์ด้วยเบอร์โทรศัพท์ (PYG-604)
 *
 * ★ ไฟล์นี้เขียนตาม "ข้อเสนอ" ใน PYG-601 — contract ยังไม่เคาะ และ BE (PYG-603) ยังไม่มี
 *   operation เหล่านี้ ทุกอย่างที่ FE สมมติเรื่อง API อยู่ในไฟล์นี้ที่เดียว
 *   เมื่อ contract สรุปแล้วให้แก้ที่นี่ + src/hooks/usePhoneAuth.ts
 *
 * จุดที่ต่างจากข้อเสนอเดิมใน PYG-601 (เขียนเหตุผลไว้ในการ์ดแล้ว):
 *   1. เพิ่ม verifyPhoneOtp แล้วให้ signUpWithPhone รับ verificationToken แทน code
 *      เพราะ flow สมัครคือ ยืนยันเบอร์ → เลือก role → อ่านและยอมรับเงื่อนไข → สร้างบัญชี
 *      ถ้าส่ง code ตอนท้าย รหัสจะหมดอายุระหว่างผู้ใช้อ่านเงื่อนไข และรหัสผิดจะรู้ตอนจบ
 *   2. เวลาเป็นจำนวนวินาที (resendAfterSeconds) ไม่ใช่เวลาแบบ timestamp
 *      นาฬิกาเครื่องผู้ใช้ที่ไม่ตรงทำให้ตัวนับเวลาผิดถ้าเทียบกับ timestamp ของ server
 */
import { gql } from '@apollo/client';
import type { ConsentAnswer } from './consent';

export type PhoneOtpPurpose = 'SIGNUP' | 'LOGIN' | 'LINK';

/** ขอรหัสยืนยัน — ไม่ตอบรหัสกลับมา (R10) */
export const REQUEST_PHONE_OTP = gql`
  mutation RequestPhoneOtp($phone: String!, $purpose: PhoneOtpPurpose!) {
    requestPhoneOtp(input: { phone: $phone, purpose: $purpose }) {
      resendAfterSeconds
      expiresInSeconds
    }
  }
`;

/** ตรวจรหัสของการสมัคร — ได้ token ไว้ใช้สร้างบัญชีหลังยอมรับเงื่อนไข */
export const VERIFY_PHONE_OTP = gql`
  mutation VerifyPhoneOtp($phone: String!, $code: String!) {
    verifyPhoneOtp(input: { phone: $phone, code: $code, purpose: SIGNUP }) {
      verificationToken
      expiresInSeconds
    }
  }
`;

/** สร้างบัญชีด้วยเบอร์ที่ยืนยันแล้ว — response รูปเดียวกับ register เดิม */
export const SIGN_UP_WITH_PHONE = gql`
  mutation SignUpWithPhone(
    $verificationToken: String!
    $role: Int!
    $consents: [ConsentAnswerInput!]
  ) {
    signUpWithPhone(input: {
      verificationToken: $verificationToken
      role: $role
      consents: $consents
    }) {
      accessToken
      refreshToken
      user {
        id
        email
        phone
        role
      }
    }
  }
`;

/** ล็อกอินด้วยเบอร์และรหัส — response รูปเดียวกับ login เดิม (S07-AC5) */
export const LOGIN_WITH_PHONE = gql`
  mutation LoginWithPhone($phone: String!, $code: String!) {
    loginWithPhone(input: { phone: $phone, code: $code }) {
      accessToken
      refreshToken
      user {
        id
        email
        role
        isActive
        mustChangePassword
        phone
      }
    }
  }
`;

/** ผูกเบอร์กับบัญชีที่ล็อกอินอยู่ (R6) */
export const LINK_PHONE = gql`
  mutation LinkPhone($phone: String!, $code: String!) {
    linkPhone(input: { phone: $phone, code: $code }) {
      id
      phone
      phoneVerified
    }
  }
`;

/**
 * ★ แยกจาก GET_USER โดยตั้งใจ — phoneVerified ยังไม่มีใน schema
 *   ถ้าใส่ใน GET_USER ทั้งแอปจะพังทันที เพราะ query นั้นถูกเรียกแทบทุกหน้า
 */
export const MY_PHONE_STATUS = gql`
  query MyPhoneStatus {
    me {
      id
      phone
      phoneVerified
    }
  }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestPhoneOtpData {
  requestPhoneOtp: { resendAfterSeconds: number; expiresInSeconds: number };
}

export interface VerifyPhoneOtpData {
  verifyPhoneOtp: { verificationToken: string; expiresInSeconds: number };
}

export interface PhoneSessionUser {
  id: string;
  /** null เมื่อบัญชีสมัครด้วยเบอร์อย่างเดียว */
  email: string | null;
  phone: string | null;
  role: number;
  isActive?: boolean;
  mustChangePassword?: boolean;
}

export interface PhoneSession {
  accessToken: string;
  refreshToken: string;
  user: PhoneSessionUser;
}

export interface SignUpWithPhoneData {
  signUpWithPhone: PhoneSession;
}

export interface SignUpWithPhoneVars {
  verificationToken: string;
  role: number;
  consents: ConsentAnswer[];
}

export interface LoginWithPhoneData {
  loginWithPhone: PhoneSession;
}

export interface LinkPhoneData {
  linkPhone: { id: string; phone: string; phoneVerified: boolean };
}

export interface MyPhoneStatusData {
  me: { id: string; phone: string | null; phoneVerified: boolean };
}

/**
 * รหัส error ใน extensions.code — FE แยกทางตาม code ไม่อ่านข้อความ
 * ข้อมูลประกอบที่ FE ใช้: OTP_RATE_LIMITED → extensions.resendAfterSeconds
 */
export const PHONE_AUTH_ERROR = {
  PHONE_INVALID_FORMAT: 'PHONE_INVALID_FORMAT',
  PHONE_ALREADY_IN_USE: 'PHONE_ALREADY_IN_USE',
  PHONE_NOT_REGISTERED: 'PHONE_NOT_REGISTERED',
  PHONE_NOT_VERIFIED: 'PHONE_NOT_VERIFIED',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_ATTEMPTS_EXCEEDED: 'OTP_ATTEMPTS_EXCEEDED',
  OTP_RATE_LIMITED: 'OTP_RATE_LIMITED',
  SMS_SEND_FAILED: 'SMS_SEND_FAILED',
  /** verificationToken ของการสมัครหมดอายุ — ต้องยืนยันเบอร์ใหม่ */
  PHONE_VERIFICATION_EXPIRED: 'PHONE_VERIFICATION_EXPIRED',
} as const;
