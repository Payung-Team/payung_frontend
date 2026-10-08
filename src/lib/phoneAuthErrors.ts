import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { PHONE_AUTH_ERROR, type PhoneOtpPurpose } from '../graphql/phoneAuth';
import { extractGraphQLErrorExtensions } from './apolloErrors';
import { formatCountdown, type PhoneAuthStrings } from './phoneAuthStrings';

/**
 * ผลของการเรียก API เบอร์โทรที่ไม่สำเร็จ — แปลงจาก error ของ Apollo เป็นสิ่งที่หน้าจอใช้
 * S07-AC7: แต่ละ code มีข้อความของตัวเอง และบอกว่าต้องทำอะไรต่อ
 */
export interface PhoneAuthFailure {
  /** code จาก BE — undefined เมื่อเป็นปัญหาเครือข่ายหรือ error ที่ไม่มี code */
  code?: string;
  message: string;
  /** มีเมื่อ BE บอกว่าขอรหัสใหม่ได้ในอีกกี่วินาที (OTP_RATE_LIMITED) */
  resendAfterSeconds?: number;
}

export type PhoneAuthResult<T> = { ok: true; data: T } | { ok: false; failure: PhoneAuthFailure };

export function toPhoneAuthFailure(
  err: unknown,
  purpose: PhoneOtpPurpose,
  s: PhoneAuthStrings,
): PhoneAuthFailure {
  const extensions = extractGraphQLErrorExtensions(err);
  const code = typeof extensions?.code === 'string' ? extensions.code : undefined;
  const seconds = extensions?.resendAfterSeconds;
  const resendAfterSeconds = typeof seconds === 'number' && seconds > 0 ? seconds : undefined;

  switch (code) {
    case PHONE_AUTH_ERROR.PHONE_INVALID_FORMAT:
      return { code, message: s.errPhoneInvalidFormat };
    case PHONE_AUTH_ERROR.PHONE_ALREADY_IN_USE:
      return { code, message: purpose === 'LINK' ? s.errPhoneInUseLink : s.errPhoneInUseSignup };
    case PHONE_AUTH_ERROR.PHONE_NOT_REGISTERED:
      return { code, message: s.errPhoneNotRegistered };
    case PHONE_AUTH_ERROR.PHONE_NOT_VERIFIED:
      return { code, message: s.errPhoneNotVerified };
    case PHONE_AUTH_ERROR.OTP_INVALID:
      return { code, message: s.errOtpInvalid };
    case PHONE_AUTH_ERROR.OTP_EXPIRED:
      return { code, message: s.errOtpExpired };
    case PHONE_AUTH_ERROR.OTP_ATTEMPTS_EXCEEDED:
      return { code, message: s.errOtpAttemptsExceeded };
    case PHONE_AUTH_ERROR.OTP_RATE_LIMITED:
      return {
        code,
        resendAfterSeconds,
        message: resendAfterSeconds
          ? s.errOtpRateLimitedOnForm(formatCountdown(resendAfterSeconds))
          : s.errOtpRateLimited,
      };
    case PHONE_AUTH_ERROR.SMS_SEND_FAILED:
      return { code, message: s.errSmsSendFailed };
    case PHONE_AUTH_ERROR.PHONE_VERIFICATION_EXPIRED:
      return { code, message: s.errVerificationExpired };
    default: {
      // ไม่ใช่ error ที่ server ตอบ = ไปไม่ถึง server
      const reachedServer = CombinedGraphQLErrors.is(err) || ServerError.is(err);
      // ★ code ที่ไม่รู้จักใช้ข้อความกลางเสมอ ไม่แสดงข้อความดิบจาก BE (อาจเป็นอังกฤษหรือมีรายละเอียดภายใน)
      return { code, message: reachedServer ? s.errUnknown : s.errNetwork };
    }
  }
}
