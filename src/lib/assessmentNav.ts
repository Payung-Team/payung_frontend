// ทางเข้า/ทางออกของแบบประเมิน (S08 · PYG-610)
//
// แบบประเมินชุดเดียวใช้ 3 ทางเข้า ต่างกันที่ค่าเริ่มต้นและปลายทางหลังบันทึก:
//   onboarding — ต่อจากหน้า Onboarding → บันทึกแล้วไปหน้าหลัก
//   booking    — ถูกกันตอนจอง (AC9/AC10) → บันทึกแล้วกลับขั้น 4 ของการจอง โดยเลือกคนนี้ไว้ให้
//   profile    — แก้ไขจากโปรไฟล์ → บันทึกแล้วกลับหน้าที่กดมา
//
// ★ จำปลายทางไว้ใน URL ไม่ใช่ storage: รีเฟรชหน้าแล้วยังกลับถูกที่ และไม่มีข้อมูลสุขภาพปนอยู่

export type AssessmentEntry = 'onboarding' | 'booking' | 'profile';

/**
 * ใช้แทน id ใน URL ว่า "โปรไฟล์ของตัวเอง" (is_self) — หน้า Onboarding ยังไม่รู้ id ตอนบันทึกเสร็จ
 * และต้อง navigate ทันทีหลัง completeOnboarding ไม่งั้น OnboardingGuard เห็นสถานะใหม่แล้วพาไปหน้าหลักก่อน
 */
export const SELF_RECIPIENT_ALIAS = 'self';

export function parseAssessmentEntry(value: string | null): AssessmentEntry {
  return value === 'onboarding' || value === 'booking' ? value : 'profile';
}

/** กัน open redirect — รับเฉพาะ path ในแอป ("/x" แต่ไม่ใช่ "//host") */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return null;
  }
  return value;
}

export function assessmentPath(
  careRecipientId: string,
  entry: AssessmentEntry,
  returnTo?: string,
): string {
  const params = new URLSearchParams({ from: entry });
  const back = safeReturnTo(returnTo);
  if (back) params.set('returnTo', back);
  return `/assessment/${encodeURIComponent(careRecipientId)}?${params.toString()}`;
}

/**
 * state ที่ส่งให้ /booking/new ตอนกลับจากแบบประเมิน
 * BookingRequestPage เห็นค่านี้แล้วจะไม่ล้าง draft และเปิดขั้นผู้รับบริการทันที
 */
export const BOOKING_RESUME_STEP = 4;

export interface BookingResumeState {
  resumeStep: typeof BOOKING_RESUME_STEP;
}

export function isBookingResumeState(state: unknown): state is BookingResumeState {
  return (state as { resumeStep?: unknown } | null)?.resumeStep === BOOKING_RESUME_STEP;
}

/**
 * ปลายทางของปุ่ม "ทำแบบประเมิน" ตอนส่งคำขอจองแล้ว BE ตอบ ASSESSMENT_REQUIRED
 *   เลือกโปรไฟล์ไว้ → ไปประเมินคนนั้นเลย
 *   กรอกเอง (ไม่มีโปรไฟล์) → กลับขั้นผู้รับบริการ ซึ่งมีปุ่มบันทึกโปรไฟล์แล้วพาไปประเมิน
 */
export function bookingAssessmentRedirect(
  selectedRecipientId: string | null | undefined,
): { to: string; state?: BookingResumeState } {
  return selectedRecipientId
    ? { to: assessmentPath(selectedRecipientId, 'booking') }
    : { to: '/booking/new', state: { resumeStep: BOOKING_RESUME_STEP } };
}
