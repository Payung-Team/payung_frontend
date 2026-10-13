/**
 * ข้อความของการสมัคร / ล็อกอิน / ผูกเบอร์ด้วยเบอร์โทรศัพท์ (PYG-604) — ไทยและอังกฤษ
 *
 * ข้อความทุกจุดของ flow เบอร์โทรอยู่ที่นี่ที่เดียว ห้ามเขียนแทรกใน component
 * R9 ของ story: ข้อความ error ต้องบอกว่าผิดที่ใดและต้องทำอะไรต่อ
 *
 * แอปยังไม่มีตัวสลับภาษา (ทั้งแอปเป็นภาษาไทย) usePhoneAuthStrings จึงคืนภาษาไทยเสมอ
 * ตาราง EN มีไว้ให้พร้อมใช้เมื่อมีตัวสลับ — type บังคับให้ครบทุก key เท่ากับ TH
 */

const TH = {
  methodPhone: 'เบอร์โทรศัพท์',
  methodEmail: 'อีเมล',
  loginMethodsLabel: 'วิธีเข้าสู่ระบบ',
  registerMethodsLabel: 'วิธีสมัคร',
  loginLead: 'เลือกวิธีที่สะดวกเพื่อเข้าใช้งาน Payung',
  registerLead: 'เลือกวิธีสมัครเพื่อเริ่มต้นใช้งาน Payung',

  phoneLabel: 'เบอร์โทรศัพท์',
  phonePlaceholder: '081 234 5678',
  phoneHintLogin: 'เราจะส่งรหัสยืนยัน 6 หลักทาง SMS ไปที่เบอร์นี้',
  phoneHintSignup: 'เราจะส่งรหัสยืนยัน 6 หลักทาง SMS ไปที่เบอร์นี้ ไม่ต้องใช้อีเมลหรือรหัสผ่าน',
  phoneHintLinkExisting: 'นี่คือเบอร์ที่อยู่ในบัญชีของคุณ ตรวจสอบให้ถูกต้องแล้วกดส่งรหัสยืนยัน',
  phoneHintLinkNew: 'กรอกเบอร์มือถือที่รับ SMS ได้ เราจะส่งรหัสยืนยัน 6 หลักไปที่เบอร์นี้',
  phoneRequired: 'กรุณากรอกเบอร์โทรศัพท์',
  phonePrefix: 'เบอร์มือถือต้องขึ้นต้นด้วย 06, 08 หรือ 09',
  phoneLength: (entered: number) => `เบอร์โทรศัพท์ต้องมี 10 หลัก ตอนนี้กรอกแล้ว ${entered} หลัก`,

  requestCode: 'รับรหัสยืนยัน',
  sendCode: 'ส่งรหัสยืนยัน',
  requestingCode: 'กำลังส่งรหัส...',

  otpTitle: 'กรอกรหัสยืนยัน',
  otpLead: 'เราส่งรหัส 6 หลักทาง SMS ไปที่',
  otpLabel: 'รหัสยืนยัน 6 หลัก',
  otpDigitLabel: (position: number) => `หลักที่ ${position}`,
  verify: 'ยืนยันรหัส',
  verifying: 'กำลังตรวจสอบ...',
  otpIncomplete: 'กรุณากรอกรหัสยืนยันให้ครบ 6 หลัก',
  otpVerified: 'ยืนยันเบอร์สำเร็จ',
  otpLoginSuccess: 'ยืนยันสำเร็จ กำลังเข้าสู่ระบบ...',
  resendPrompt: 'ยังไม่ได้รับรหัส?',
  resendIn: (time: string) => `ขอรหัสใหม่ใน ${time}`,
  resend: 'ขอรหัสใหม่',
  resending: 'กำลังส่งรหัสใหม่...',
  resent: 'ส่งรหัสใหม่แล้ว รหัสเดิมใช้ไม่ได้อีก',
  editPhone: 'แก้ไขเบอร์โทรศัพท์',
  otpTrust: 'รหัสนี้ใช้ได้ครั้งเดียว Payung จะไม่ขอรหัสนี้จากคุณทางโทรศัพท์',

  roleTitle: 'เลือกประเภทผู้ใช้',
  roleLead: 'ยืนยันเบอร์โทรศัพท์แล้ว เลือกแบบที่ตรงกับการใช้งานของคุณ',
  next: 'ถัดไป',
  consentLoading: 'กำลังโหลดข้อความความยินยอม กรุณาลองอีกครั้ง',
  goRegister: 'สมัครสมาชิก',
  goLogin: 'เข้าสู่ระบบ',

  errPhoneInvalidFormat: 'เบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเบอร์มือถือ 10 หลัก เช่น 081 234 5678',
  errPhoneInUseSignup: 'เบอร์นี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบด้วยเบอร์นี้แทน',
  errPhoneInUseLink: 'เบอร์นี้ผูกกับบัญชีอื่นอยู่แล้ว กรุณาใช้เบอร์อื่น',
  errPhoneNotRegistered: 'ไม่พบบัญชีที่ใช้เบอร์โทรนี้',
  errPhoneNotVerified: 'เบอร์นี้ยังไม่ได้ยืนยัน กรุณาเข้าสู่ระบบด้วยอีเมล แล้วยืนยันเบอร์ที่เมนูเบอร์โทรศัพท์',
  errOtpInvalid: 'รหัสไม่ถูกต้อง กรุณาตรวจสอบรหัสใน SMS แล้วกรอกใหม่อีกครั้ง',
  errOtpExpired: 'รหัสนี้หมดอายุแล้ว กรุณากด "ขอรหัสใหม่" ด้านล่าง',
  errOtpAttemptsExceeded: 'กรอกรหัสผิดเกินจำนวนครั้งที่กำหนด รหัสนี้ใช้ไม่ได้แล้ว กรุณากด "ขอรหัสใหม่" ด้านล่าง',
  errOtpRateLimited: 'ขอรหัสบ่อยเกินไป กรุณารอจนตัวนับเวลาด้านล่างหมด แล้วขอรหัสใหม่',
  errOtpRateLimitedOnForm: (time: string) => `ขอรหัสบ่อยเกินไป กรุณารอ ${time} แล้วลองใหม่อีกครั้ง`,
  errSmsSendFailed: 'ส่ง SMS ไม่สำเร็จ กรุณาตรวจสอบสัญญาณโทรศัพท์แล้วลองใหม่อีกครั้ง',
  errVerificationExpired: 'การยืนยันเบอร์หมดเวลาแล้ว กรุณายืนยันเบอร์โทรศัพท์ใหม่อีกครั้ง',
  errNetwork: 'เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง',
  errUnknown: 'ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',

  settingsMenuTitle: 'เบอร์โทรศัพท์',
  settingsMenuSub: 'ยืนยันเบอร์เพื่อใช้เข้าสู่ระบบ',
  settingsTitle: 'เบอร์โทรศัพท์',
  settingsLead: 'ยืนยันเบอร์เพื่อใช้เข้าสู่ระบบด้วยรหัส SMS ได้อีกช่องทางหนึ่ง',
  statusVerified: 'ยืนยันแล้ว',
  statusUnverified: 'ยังไม่ยืนยัน',
  linkedSuccess: 'ยืนยันเบอร์แล้ว ครั้งต่อไปใช้เบอร์นี้เข้าสู่ระบบได้เลย',
  settingsLoadFailed: 'โหลดข้อมูลเบอร์โทรศัพท์ไม่สำเร็จ',
  retry: 'ลองใหม่อีกครั้ง',
};

export type PhoneAuthStrings = typeof TH;

const EN: PhoneAuthStrings = {
  methodPhone: 'Phone number',
  methodEmail: 'Email',
  loginMethodsLabel: 'Sign-in method',
  registerMethodsLabel: 'Sign-up method',
  loginLead: 'Choose how you would like to sign in to Payung',
  registerLead: 'Choose how you would like to sign up for Payung',

  phoneLabel: 'Phone number',
  phonePlaceholder: '081 234 5678',
  phoneHintLogin: 'We will text a 6-digit verification code to this number',
  phoneHintSignup: 'We will text a 6-digit verification code to this number. No email or password needed',
  phoneHintLinkExisting: 'This is the number on your account. Check that it is correct, then send the code',
  phoneHintLinkNew: 'Enter a mobile number that can receive SMS. We will text a 6-digit code to it',
  phoneRequired: 'Please enter your phone number',
  phonePrefix: 'Mobile numbers must start with 06, 08 or 09',
  phoneLength: (entered: number) => `Phone numbers have 10 digits. You have entered ${entered}`,

  requestCode: 'Get verification code',
  sendCode: 'Send verification code',
  requestingCode: 'Sending code...',

  otpTitle: 'Enter verification code',
  otpLead: 'We texted a 6-digit code to',
  otpLabel: '6-digit verification code',
  otpDigitLabel: (position: number) => `Digit ${position}`,
  verify: 'Verify code',
  verifying: 'Checking...',
  otpIncomplete: 'Please enter all 6 digits of the code',
  otpVerified: 'Phone number verified',
  otpLoginSuccess: 'Verified. Signing you in...',
  resendPrompt: "Didn't get the code?",
  resendIn: (time: string) => `Request a new code in ${time}`,
  resend: 'Request a new code',
  resending: 'Sending a new code...',
  resent: 'New code sent. The previous code no longer works',
  editPhone: 'Change phone number',
  otpTrust: 'This code works once. Payung will never ask you for it over the phone',

  roleTitle: 'Choose your account type',
  roleLead: 'Your phone number is verified. Pick the option that fits how you will use Payung',
  next: 'Next',
  consentLoading: 'Loading the consent text. Please try again',
  goRegister: 'Sign up',
  goLogin: 'Sign in',

  errPhoneInvalidFormat: 'That phone number is not valid. Enter a 10-digit mobile number, e.g. 081 234 5678',
  errPhoneInUseSignup: 'This number already has an account. Please sign in with it instead',
  errPhoneInUseLink: 'This number is linked to another account. Please use a different number',
  errPhoneNotRegistered: 'No account uses this phone number',
  errPhoneNotVerified: 'This number is not verified yet. Sign in with email, then verify it under Phone number',
  errOtpInvalid: 'That code is incorrect. Check the SMS and enter it again',
  errOtpExpired: 'This code has expired. Tap "Request a new code" below',
  errOtpAttemptsExceeded: 'Too many incorrect attempts. This code no longer works. Tap "Request a new code" below',
  errOtpRateLimited: 'Too many code requests. Wait for the timer below to finish, then request a new code',
  errOtpRateLimitedOnForm: (time: string) => `Too many code requests. Please wait ${time} and try again`,
  errSmsSendFailed: 'We could not send the SMS. Check your phone signal and try again',
  errVerificationExpired: 'Your phone verification timed out. Please verify your number again',
  errNetwork: 'Cannot connect. Check your internet connection and try again',
  errUnknown: 'Something went wrong. Please try again',

  settingsMenuTitle: 'Phone number',
  settingsMenuSub: 'Verify your number to sign in with it',
  settingsTitle: 'Phone number',
  settingsLead: 'Verify your number to sign in with an SMS code as well',
  statusVerified: 'Verified',
  statusUnverified: 'Not verified',
  linkedSuccess: 'Number verified. You can sign in with it next time',
  settingsLoadFailed: 'Could not load your phone number',
  retry: 'Try again',
};

export const PHONE_AUTH_STRINGS = { th: TH, en: EN };

export function usePhoneAuthStrings(): PhoneAuthStrings {
  return TH;
}

/** วินาที → "01:05" */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
