/**
 * รายชื่อผู้ดูแลตามเงื่อนไขของ booking (S18 · PYG-648) — ข้อความไทย/อังกฤษทั้งหมด ตาม Design PYG-645
 *
 * ข้อความทุกจุดของฟีเจอร์นี้อยู่ที่นี่ที่เดียว (DoD: ไม่มีข้อความ hardcode นอกไฟล์ข้อความกลาง)
 * ป้ายวิชาชีพ / ป้ายระดับใช้ข้อความของ professions.ts / careLevels.ts เดิม ไม่ซ้ำที่นี่
 * ★ ห้ามเพิ่มข้อความที่บอกเหตุผลรายคน หรือจำนวนผู้ดูแลที่ถูกตัดออก (S18 R9)
 *
 * แอปยังไม่มีตัวสลับภาษา useCaregiverMatchStrings จึงคืนภาษาไทยเสมอ (แบบเดียวกับ infectionStrings)
 */

export interface CaregiverMatchStrings {
  /** หัวรายชื่อ: "3 คนรับงานนี้ได้" */
  count: (n: number) => string;
  /** เหตุผลที่รายชื่อสั้น ต่อท้ายจำนวน — ไม่มีกล่อง ไม่มีไอคอน */
  scoped: string;

  // AC7 · ไม่มีผู้ดูแลที่รับงานนี้ได้
  emptyTitle: string;
  emptyBody: string;
  editBooking: string;

  // ช่องติดต่อแอดมิน — ปุ่มใช้ label จาก adminContact · ค่านี้ใช้เมื่อ label ว่าง
  contact: string;
  /** ไม่มี adminContact → ข้อความแทนปุ่ม ยังบอกขั้นถัดไป */
  contactMissing: string;

  // โหลดไม่สำเร็จ
  errorTitle: string;
  errorBody: string;
  retry: string;

  // E2 · BOOKING_NOT_MATCHABLE (ข้อเสนอ · รอทีมเคาะ)
  notMatchableTitle: string;
  notMatchableBody: string;
  backToBooking: string;

  // E9 · CAREGIVER_NOT_ELIGIBLE ตอนกดยืนยัน
  notEligible: string;
  notEligibleAction: string;
  notEligibleBanner: (name: string) => string;
  dismiss: string;

  // ยืนยันเลือกผู้ดูแล (selectBookingCaregiver)
  /** draft ไม่มี booking ที่รอเลือกผู้ดูแล — ต้องกดค้นหาจากขั้นตรวจสอบใหม่ */
  noMatchingBooking: string;
  /** BOOKING_NOT_SELECTABLE — เลือกไปแล้ว / ถูกยกเลิก */
  notSelectable: string;
  selectFailed: string;
}

const TH: CaregiverMatchStrings = {
  count: (n) => `${n.toLocaleString()} คนรับงานนี้ได้`,
  scoped: 'คัดตามระดับการดูแลและทักษะที่งานนี้ต้องใช้',

  emptyTitle: 'ตอนนี้ยังไม่มีผู้ดูแลที่รับงานนี้ได้',
  emptyBody: 'งานนี้ต้องการผู้ดูแลที่มีทักษะเฉพาะ ทีมงาน Payung ช่วยหาผู้ดูแลให้ได้ รายละเอียดการจองที่กรอกไว้ยังอยู่ครบ',
  editBooking: 'กลับไปแก้รายละเอียดการจอง',

  contact: 'ติดต่อทีมงาน Payung',
  contactMissing: 'ติดต่อทีมงาน Payung ได้ตามช่องทางที่แจ้งไว้ในแอป',

  errorTitle: 'โหลดรายชื่อผู้ดูแลไม่สำเร็จ',
  errorBody: 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต แล้วลองอีกครั้ง',
  retry: 'ลองอีกครั้ง',

  notMatchableTitle: 'ข้อมูลการจองยังไม่พอสำหรับหาผู้ดูแล',
  notMatchableBody: 'กลับไปตรวจรายละเอียดการจองอีกครั้ง ถ้ายังเห็นข้อความนี้ ติดต่อทีมงาน Payung',
  backToBooking: 'กลับไปที่การจอง',

  notEligible: 'ผู้ดูแลคนนี้รับงานนี้ไม่ได้แล้ว กรุณาเลือกผู้ดูแลคนอื่น รายละเอียดการจองยังอยู่ครบ',
  notEligibleAction: 'เลือกผู้ดูแลคนอื่น',
  notEligibleBanner: (name) => `อัปเดตรายชื่อแล้ว · ${name} รับงานนี้ไม่ได้แล้ว กรุณาเลือกผู้ดูแลคนอื่น`,
  dismiss: 'ปิด',

  noMatchingBooking: 'ข้อมูลการจองไม่ครบ กรุณากลับไปที่หน้าการจองแล้วกด "เริ่มต้นค้นหาผู้ดูแล" อีกครั้ง',
  notSelectable: 'การจองนี้เลือกผู้ดูแลไปแล้วหรือถูกยกเลิกแล้ว กรุณาตรวจสอบที่หน้า "การจองของฉัน"',
  selectFailed: 'เลือกผู้ดูแลไม่สำเร็จ กรุณาตรวจสอบที่หน้า "การจองของฉัน" ก่อนลองใหม่ เพื่อไม่ให้จองซ้ำ',
};

const EN: CaregiverMatchStrings = {
  count: (n) => `${n.toLocaleString()} caregiver${n === 1 ? '' : 's'} can take this booking`,
  scoped: 'Matched on the care level and skills it needs',

  emptyTitle: 'No caregivers can take this booking right now',
  emptyBody: 'This booking needs specific skills. Our team can help you find a caregiver. Your booking details are saved.',
  editBooking: 'Edit booking details',

  contact: 'Contact the Payung team',
  contactMissing: 'Contact the Payung team using the channels shown in the app.',

  errorTitle: 'Couldn’t load caregivers',
  errorBody: 'Check your internet connection and try again.',
  retry: 'Try again',

  notMatchableTitle: 'We need more booking details to find caregivers',
  notMatchableBody: 'Go back and check your booking details. If you still see this, contact the Payung team.',
  backToBooking: 'Back to booking',

  notEligible: 'This caregiver can no longer take this booking. Please choose another caregiver. Your booking details are saved.',
  notEligibleAction: 'Choose another caregiver',
  notEligibleBanner: (name) => `List updated · ${name} can no longer take this booking. Please choose another caregiver.`,
  dismiss: 'Dismiss',

  noMatchingBooking: 'Your booking details are incomplete. Go back to the booking page and tap "Find caregivers" again.',
  notSelectable: 'A caregiver has already been chosen for this booking, or it was cancelled. Please check "My bookings".',
  selectFailed: 'Couldn’t choose this caregiver. Please check "My bookings" before trying again so you don’t book twice.',
};

export const CAREGIVER_MATCH_STRINGS = { th: TH, en: EN };

export function useCaregiverMatchStrings(): CaregiverMatchStrings {
  return TH;
}
