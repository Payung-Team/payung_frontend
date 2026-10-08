import { useCallback, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import {
  LINK_PHONE,
  LOGIN_WITH_PHONE,
  REQUEST_PHONE_OTP,
  SIGN_UP_WITH_PHONE,
  VERIFY_PHONE_OTP,
  type LinkPhoneData,
  type LoginWithPhoneData,
  type PhoneOtpPurpose,
  type PhoneSession,
  type RequestPhoneOtpData,
  type SignUpWithPhoneData,
  type SignUpWithPhoneVars,
  type VerifyPhoneOtpData,
} from '../graphql/phoneAuth';
import { useAuth } from '../context/AuthContext';
import { logGraphQLError } from '../lib/logGraphQLError';
import { toE164 } from '../lib/phone';
import { toPhoneAuthFailure, type PhoneAuthResult } from '../lib/phoneAuthErrors';
import { usePhoneAuthStrings } from '../lib/phoneAuthStrings';
import { startRegisteredSession } from './useRegister';

/**
 * เรียก API ของ flow เบอร์โทรศัพท์ (PYG-604) — ทุกฟังก์ชันคืน PhoneAuthResult ไม่ throw
 *
 * ★ ห้าม log ตัวแปรหรือ response: มีเบอร์โทร รหัสยืนยัน และ token (R10)
 *   logGraphQLError ตัดค่าอ่อนไหวออกจากข้อความ error ให้แล้ว
 */
export function usePhoneAuth() {
  const client = useApolloClient();
  const s = usePhoneAuthStrings();
  const { setUserRole } = useAuth();
  // กดปุ่มซ้ำเร็ว ๆ ต้องไม่ขอรหัสซ้ำ — แต่ละครั้งเสียค่า SMS
  // ใช้ ref ไม่ใช่ state: คลิกที่สองมาถึงก่อน React render รอบถัดไป
  const requesting = useRef(false);

  /** @returns null เมื่อมีคำขอค้างอยู่แล้ว (ผู้เรียกไม่ต้องทำอะไร) */
  const requestOtp = useCallback(
    async (
      digits: string,
      purpose: PhoneOtpPurpose,
    ): Promise<PhoneAuthResult<{ resendAfterSeconds: number }> | null> => {
      if (requesting.current) return null;
      requesting.current = true;
      try {
        const { data } = await client.mutate<RequestPhoneOtpData>({
          mutation: REQUEST_PHONE_OTP,
          variables: { phone: toE164(digits), purpose },
        });
        return { ok: true, data: { resendAfterSeconds: data?.requestPhoneOtp.resendAfterSeconds ?? 0 } };
      } catch (err) {
        logGraphQLError('RequestPhoneOtp', err);
        return { ok: false, failure: toPhoneAuthFailure(err, purpose, s) };
      } finally {
        requesting.current = false;
      }
    },
    [client, s],
  );

  /** ตรวจรหัสของการสมัคร → token สำหรับสร้างบัญชีหลังยอมรับเงื่อนไข */
  const verifySignupOtp = useCallback(
    async (digits: string, code: string): Promise<PhoneAuthResult<{ verificationToken: string }>> => {
      try {
        const { data } = await client.mutate<VerifyPhoneOtpData>({
          mutation: VERIFY_PHONE_OTP,
          variables: { phone: toE164(digits), code },
        });
        const token = data?.verifyPhoneOtp.verificationToken;
        if (!token) return { ok: false, failure: { message: s.errUnknown } };
        return { ok: true, data: { verificationToken: token } };
      } catch (err) {
        logGraphQLError('VerifyPhoneOtp', err);
        return { ok: false, failure: toPhoneAuthFailure(err, 'SIGNUP', s) };
      }
    },
    [client, s],
  );

  /** สร้างบัญชีและเริ่ม session — เรียกหลังผู้ใช้กดยินยอมเท่านั้น */
  const signUp = useCallback(
    async (variables: SignUpWithPhoneVars): Promise<PhoneAuthResult<PhoneSession>> => {
      try {
        const { data } = await client.mutate<SignUpWithPhoneData, SignUpWithPhoneVars>({
          mutation: SIGN_UP_WITH_PHONE,
          variables,
        });
        const session = data?.signUpWithPhone;
        if (!session) return { ok: false, failure: { message: s.errUnknown } };
        await startRegisteredSession(session, setUserRole);
        return { ok: true, data: session };
      } catch (err) {
        logGraphQLError('SignUpWithPhone', err);
        return { ok: false, failure: toPhoneAuthFailure(err, 'SIGNUP', s) };
      }
    },
    [client, s, setUserRole],
  );

  /** ตรวจรหัสและคืน session — หน้า Login เป็นคนเริ่ม session (ใช้ทางเดียวกับล็อกอินด้วยอีเมล) */
  const login = useCallback(
    async (digits: string, code: string): Promise<PhoneAuthResult<PhoneSession>> => {
      try {
        const { data } = await client.mutate<LoginWithPhoneData>({
          mutation: LOGIN_WITH_PHONE,
          variables: { phone: toE164(digits), code },
        });
        const session = data?.loginWithPhone;
        if (!session) return { ok: false, failure: { message: s.errUnknown } };
        return { ok: true, data: session };
      } catch (err) {
        logGraphQLError('LoginWithPhone', err);
        return { ok: false, failure: toPhoneAuthFailure(err, 'LOGIN', s) };
      }
    },
    [client, s],
  );

  const link = useCallback(
    async (digits: string, code: string): Promise<PhoneAuthResult<LinkPhoneData['linkPhone']>> => {
      try {
        const { data } = await client.mutate<LinkPhoneData>({
          mutation: LINK_PHONE,
          variables: { phone: toE164(digits), code },
        });
        if (!data?.linkPhone) return { ok: false, failure: { message: s.errUnknown } };
        return { ok: true, data: data.linkPhone };
      } catch (err) {
        logGraphQLError('LinkPhone', err);
        return { ok: false, failure: toPhoneAuthFailure(err, 'LINK', s) };
      }
    },
    [client, s],
  );

  return { requestOtp, verifySignupOtp, signUp, login, link };
}
