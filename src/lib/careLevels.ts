/**
 * ระดับผู้ดูแล ต้น / กลาง / สูง (PYG-557 · S02) — แหล่งเดียวของค่า ลำดับ และข้อความของระดับทั้ง FE
 *
 * ค่าที่ใช้ใน FE = GraphQL enum `CareLevel` ตาม contract ที่เสนอ (PYG-579): BASIC | INTERMEDIATE | ADVANCED
 * DB เก็บเป็นตัวเล็ก (caregivers.care_level: basic | intermediate | advanced) — toCareLevel รับได้ทั้งสองแบบ
 * ระดับ booking (S16 · PYG-569) ใช้ชุดเดียวกัน: ใช้ CareLevelBadge + ไฟล์นี้ได้เลย
 *
 * ข้อความทุกจุดของ S02 อยู่ที่นี่ที่เดียว ห้ามเขียนแทรกใน component (DoD ของ PYG-582)
 * แอปยังไม่มีตัวสลับภาษา useCareLevelStrings จึงคืนภาษาไทยเสมอ · EN มีไว้ให้พร้อมใช้ type บังคับครบทุก key
 */

export const CARE_LEVELS = ['BASIC', 'INTERMEDIATE', 'ADVANCED'] as const;
export type CareLevel = (typeof CARE_LEVELS)[number];

/** 1 = ต่ำสุด · ใช้เทียบ ระดับผู้ดูแล >= ระดับ booking (S18) และจำนวนแท่งในป้าย */
export const CARE_LEVEL_RANK: Record<CareLevel, 1 | 2 | 3> = {
  BASIC: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
};

/** รับค่าจาก API / DB / mock แล้วคืนค่าที่รู้จัก · ค่าที่ไม่รู้จักหรือ null → null (ป้ายแสดง "ยังไม่ได้กำหนดระดับ") */
export function toCareLevel(value: unknown): CareLevel | null {
  if (typeof value !== 'string') return null;
  const upper = value.trim().toUpperCase();
  return (CARE_LEVELS as readonly string[]).includes(upper) ? (upper as CareLevel) : null;
}

const TH = {
  levelLabel: {
    BASIC: 'ระดับต้น',
    INTERMEDIATE: 'ระดับกลาง',
    ADVANCED: 'ระดับสูง',
  } as Record<CareLevel, string>,
  levelShort: {
    BASIC: 'ต้น',
    INTERMEDIATE: 'กลาง',
    ADVANCED: 'สูง',
  } as Record<CareLevel, string>,
  levelEn: {
    BASIC: 'Basic',
    INTERMEDIATE: 'Intermediate',
    ADVANCED: 'Advanced',
  } as Record<CareLevel, string>,
  none: 'ยังไม่ได้กำหนดระดับ',
  badgeAria: (label: string) => `ระดับผู้ดูแล: ${label}`,

  // หน้า KYC review · ตัวเลือก
  title: 'ระดับผู้ดูแล',
  pickerHint: 'ต้องเลือกก่อนอนุมัติ · ไม่ต้องเลือกถ้าปฏิเสธ',
  required: 'กรุณาเลือกระดับผู้ดูแลก่อนอนุมัติ KYC',
  invalid: 'ระดับที่เลือกไม่ถูกต้อง กรุณาเลือกใหม่',
  criteriaPending: 'เกณฑ์ของแต่ละระดับ: รอทีมเคาะ',
  /** แยกเป็นส่วนให้หน้าจอทำตัวหนาที่ชื่อและระดับได้: before + ชื่อ + between + ระดับ + after */
  approveConfirm: { before: 'อนุมัติ ', between: ' เป็นผู้ดูแล ', after: ' – ผู้ดูแลจะได้รับการแจ้งเตือนทันที' },
  approvedToast: (level: string) => `อนุมัติ KYC เรียบร้อยแล้ว · ${level}`,

  // ระดับปัจจุบัน · แก้ระดับ · ประวัติ (แอดมิน)
  setBy: 'กำหนดโดย',
  setAt: 'เมื่อ',
  edit: 'แก้ระดับ',
  editTitle: 'แก้ระดับผู้ดูแล',
  current: 'ปัจจุบัน',
  reason: 'เหตุผล',
  reasonPlaceholder: 'เช่น ผ่านอบรมเพิ่ม หรือทบทวนจากประวัติการทำงาน',
  reasonRequired: 'กรุณาระบุเหตุผลของการเปลี่ยนระดับ',
  kycNotVerified: 'แก้ระดับได้เฉพาะผู้ดูแลที่อนุมัติ KYC แล้ว',
  sameValue: 'เป็นระดับเดิม · เลือกระดับอื่นเพื่อบันทึก',
  cancel: 'ยกเลิก',
  save: 'บันทึก',
  saving: 'กำลังบันทึก...',
  confirmTitle: (name: string) => `เปลี่ยนระดับของ ${name}?`,
  confirmBody: (from: string, to: string) => `${from} → ${to}`,
  confirm: 'ยืนยันเปลี่ยนระดับ',
  savedToast: (level: string) => `บันทึกระดับแล้ว · ${level}`,
  saveFailed: 'บันทึกระดับไม่สำเร็จ กรุณาลองใหม่',
  history: 'ประวัติระดับ',
  historyEmpty: 'ยังไม่มีประวัติ',
  historySystem: 'ระบบ (ค่าเริ่มต้น)',
  historyReviewed: '(ทบทวนค่าเริ่มต้น)',
  historyKycApproval: '(ตอนอนุมัติ KYC)',
  unreviewed: 'ค่าเริ่มต้น · ยังไม่ทบทวน',
  unreviewedShort: 'ยังไม่ทบทวน',
  listColumn: 'ระดับ',
  unreviewedNote: 'ระบบตั้งเป็นระดับต้นให้ผู้ดูแลที่อนุมัติก่อนมีระบบระดับ · ยังไม่มีแอดมินยืนยัน',
  review: 'ทบทวนระดับ',
  confirmSame: (level: string) => `ยืนยัน${level}`,
  reviewConfirmTitle: (name: string) => `ยืนยันระดับของ ${name}?`,
  reviewConfirmBody: (level: string) => `ยืนยันว่าเป็น${level} · ระบบจะบันทึกคุณเป็นผู้กำหนด`,
  noneAdmin: 'กำหนดได้ตอนอนุมัติ KYC',
  noneVerified: 'อนุมัติ KYC แล้วแต่ยังไม่มีระดับ · กำหนดระดับก่อนผู้ดูแลรับงานที่ต้องการระดับ',
  assign: 'กำหนดระดับ',

  // โปรไฟล์ของผู้ดูแล (BE ให้ผู้ดูแลเห็นแค่ระดับ ไม่มีผู้กำหนด / เวลา)
  profileInfo: 'ทีมงานเป็นผู้กำหนดระดับ ใช้จับคู่คุณกับงานที่ต้องการระดับเท่ากันหรือต่ำกว่า',
  profileNone: 'ทีมงานจะกำหนดระดับเมื่ออนุมัติการยืนยันตัวตน (KYC)',
};

export type CareLevelStrings = typeof TH;

const EN: CareLevelStrings = {
  levelLabel: { BASIC: 'Basic', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' },
  levelShort: { BASIC: 'Basic', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' },
  levelEn: { BASIC: 'Basic', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' },
  none: 'Level not set',
  badgeAria: (label) => `Caregiver level: ${label}`,

  title: 'Caregiver level',
  pickerHint: 'Required to approve · not needed to reject',
  required: 'Please choose a caregiver level before approving KYC',
  invalid: 'That level isn’t valid. Please choose again',
  criteriaPending: 'Level criteria: to be confirmed',
  approveConfirm: { before: 'Approve ', between: ' as a ', after: ' caregiver – they’ll be notified right away' },
  approvedToast: (level) => `KYC approved · ${level}`,

  setBy: 'Set by',
  setAt: 'Set on',
  edit: 'Change level',
  editTitle: 'Change caregiver level',
  current: 'Current',
  reason: 'Reason',
  reasonPlaceholder: 'e.g. completed extra training, or reviewed work history',
  reasonRequired: 'Please give a reason for the level change',
  kycNotVerified: 'Levels can only be changed for caregivers whose KYC is approved',
  sameValue: 'This is the current level · choose another level to save',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving...',
  confirmTitle: (name) => `Change ${name}’s level?`,
  confirmBody: (from, to) => `${from} → ${to}`,
  confirm: 'Confirm change',
  savedToast: (level) => `Level saved · ${level}`,
  saveFailed: 'Couldn’t save the level. Please try again',
  history: 'Level history',
  historyEmpty: 'No history yet',
  historySystem: 'System (default)',
  historyReviewed: '(default reviewed)',
  historyKycApproval: '(at KYC approval)',
  unreviewed: 'Default · not yet reviewed',
  unreviewedShort: 'Not reviewed',
  listColumn: 'Level',
  unreviewedNote: 'Set to Basic automatically for caregivers approved before levels existed · not yet confirmed by an admin',
  review: 'Review level',
  confirmSame: (level) => `Confirm ${level}`,
  reviewConfirmTitle: (name) => `Confirm ${name}’s level?`,
  reviewConfirmBody: (level) => `Confirm ${level} · you’ll be recorded as the admin who set it`,
  noneAdmin: 'Set when approving KYC',
  noneVerified: 'KYC is approved but no level is set yet · set one before they take jobs that need a level',
  assign: 'Set level',

  profileInfo: 'Our team sets your level. It’s used to match you with jobs at or below your level',
  profileNone: 'Our team will set your level when your identity verification (KYC) is approved',
};

export const CARE_LEVEL_STRINGS = { th: TH, en: EN };

export function useCareLevelStrings(): CareLevelStrings {
  return TH;
}

/** เวลาที่กำหนด / เปลี่ยนระดับ → "13 ต.ค. 2569 14:05" (พ.ศ. · เวลาไทย) · ค่าว่าง / ผิดรูปแบบ → "-" */
export function formatCareLevelTime(iso: string | null | undefined, withTime = true): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

/** ข้อความของระดับ · ค่าที่ไม่รู้จัก / null → "ยังไม่ได้กำหนดระดับ" */
export function careLevelLabel(value: unknown, strings: CareLevelStrings = TH): string {
  const level = toCareLevel(value);
  return level ? strings.levelLabel[level] : strings.none;
}
