/**
 * ข้อความของใบประกอบวิชาชีพ (PYG-588) — ไทยและอังกฤษ
 *
 * ข้อความทุกจุดของส่วนใบประกอบฯ อยู่ที่นี่ที่เดียว ห้ามเขียนแทรกใน component
 * ถ้อยคำตามดีไซน์ PYG-584 (N2 · ข้อความ TH / EN)
 *
 * แอปยังไม่มีตัวสลับภาษา (ทั้งแอปเป็นภาษาไทย) useLicenseStrings จึงคืนภาษาไทยเสมอ
 * ตาราง EN มีไว้ให้พร้อมใช้เมื่อมีตัวสลับ — type บังคับให้ครบทุก key เท่ากับ TH
 */
import type { LicenseErrorCode, LicenseStatus } from './license';

const TH = {
  // ── ฟอร์ม KYC ขั้น 2 ──────────────────────────────────────────────────
  sectionTitle: 'ใบประกอบวิชาชีพ',
  sectionRequiredFor: (profession: string) => `จำเป็นสำหรับ${profession}`,
  changeProfession: 'เปลี่ยนวิชาชีพ (ขั้น 1)',
  fileLabel: 'ไฟล์ใบอนุญาต',
  fileTitle: 'ภาพหรือ PDF ของใบอนุญาต',
  fileHint: 'เห็นชื่อ เลขที่ และวันหมดอายุชัดเจน',
  fileChoose: 'เลือกไฟล์',
  fileChooseAgain: 'เลือกใหม่',
  fileUploading: (name: string) => `กำลังอัปโหลด... ${name}`,
  fileReplacing: (name: string, oldName: string) => `กำลังแทนที่ด้วย ${name} · ไฟล์เดิม ${oldName}`,
  fileUploaded: (name: string, size: string) => `${name} · ${size}`,
  fileView: 'ดูไฟล์',
  fileReplace: 'เปลี่ยนไฟล์',
  fileRemove: 'ลบไฟล์',
  fileRetry: 'ลองอีกครั้ง',
  numberLabel: 'เลขที่ใบอนุญาต',
  numberPlaceholder: 'กรอกตามที่ระบุบนใบอนุญาต',
  numberHint: 'ตัวเลขและตัวอักษรตามบนใบอนุญาต',
  expiryLabel: 'วันหมดอายุ',
  expiryHint: 'ต้องเป็นวันหลังจากวันนี้ (เวลาประเทศไทย)',
  expiryFilled: (date: string, remaining: string) => `หมดอายุ ${date} · ${remaining}`,
  expiryNotice: 'เมื่อใบอนุญาตหมดอายุ ระบบจะแจ้งเตือนให้อัปโหลดใบใหม่ และทีมงานจะตรวจอีกครั้ง',
  previousRejected: (reason: string) => `ใบเดิมไม่ผ่านการตรวจ: ${reason} · กรุณาแนบใบใหม่`,
  previousExpired: 'ใบเดิมหมดอายุแล้ว · กรุณาแนบใบที่ต่ออายุแล้ว',
  extraDocsTitle: 'เอกสารเพิ่มเติม (ไม่บังคับ)',
  certificateTitle: 'ใบรับรองการอบรม (ถ้ามี)',
  certificateHint: 'เช่น ใบประกาศหลักสูตรผู้ช่วยพยาบาล · ช่วยให้ตรวจเร็วขึ้น',
  blockedNext: (count: number) => `ยังไปขั้นถัดไปไม่ได้ · กรอกข้อมูลใบประกอบวิชาชีพให้ครบ ${count} รายการ`,
  savingLicense: 'กำลังบันทึกข้อมูลใบประกอบวิชาชีพ...',

  // ── error ใต้ช่อง (client) ─────────────────────────────────────────────
  errNumberRequired: 'กรุณากรอกเลขที่ใบอนุญาต',
  errNumberTooLong: (max: number) => `เลขที่ใบอนุญาตยาวได้ไม่เกิน ${max} ตัวอักษร`,
  errExpiryRequired: 'กรุณาระบุวันหมดอายุ',
  errExpiryInvalid: 'รูปแบบวันที่ไม่ถูกต้อง',
  errExpiryNotFuture: 'วันหมดอายุต้องเป็นวันหลังจากวันนี้',
  errExpiryNotFutureServer: 'วันหมดอายุต้องเป็นวันหลังจากวันนี้ (ตามเวลาเซิร์ฟเวอร์)',
  errFileRequired: 'กรุณาแนบไฟล์ใบอนุญาต',
  errFileType: (name: string) => `รองรับเฉพาะ JPG, PNG, PDF · ${name}`,
  errFileSize: 'ไฟล์ใหญ่เกิน 5 MB · ลองย่อขนาดแล้วอัปโหลดอีกครั้ง',
  errUploadFailed: (name: string) => `อัปโหลดไม่สำเร็จ กรุณาลองใหม่ · ${name}`,
  errUnknown: 'บันทึกข้อมูลใบประกอบวิชาชีพไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',

  // ── เปลี่ยนวิชาชีพหลังกรอกใบประกอบฯ (E1 / E2) ──────────────────────────
  e1Title: 'เปลี่ยนเป็นผู้ดูแลทั่วไป?',
  e1Body: 'ผู้ดูแลทั่วไปไม่ต้องแนบใบประกอบวิชาชีพ ข้อมูลที่กรอกไว้จะถูกลบ:',
  e1Confirm: 'เปลี่ยนและลบข้อมูล',
  e2Title: (profession: string) => `เปลี่ยนเป็น${profession}?`,
  e2Body: (oldLicense: string, newLicense: string) =>
    `${oldLicense}ที่แนบไว้ใช้กับวิชาชีพใหม่ไม่ได้ ข้อมูลเดิมจะถูกลบ และคุณต้องแนบ${newLicense}ใหม่ในขั้น "เอกสาร"`,
  e2Confirm: 'เปลี่ยนวิชาชีพ',
  cancel: 'ยกเลิก',
  draftNumber: (value: string) => `เลขที่ใบอนุญาต ${value}`,
  draftFile: (value: string) => `ไฟล์ ${value}`,
  draftExpiry: (value: string) => `วันหมดอายุ ${value}`,
  professionChangedNotice: (profession: string, license: string) =>
    `วิชาชีพเปลี่ยนเป็น${profession}แล้ว · กรุณาแนบ${license}`,

  // ── ขั้น 4 ตรวจสอบ ──────────────────────────────────────────────────────
  reviewProfession: 'วิชาชีพ',
  reviewNumber: 'เลขที่ใบอนุญาต',
  reviewExpiry: 'วันหมดอายุ',
  reviewFile: 'ไฟล์',
  reviewEdit: 'แก้ไข',
  submitLicenseError: 'ข้อมูลใบประกอบวิชาชีพยังไม่ครบหรือไม่ถูกต้อง กรุณากลับไปแก้ที่ขั้น "เอกสาร"',

  // ── สถานะ (ผู้ดูแล + แอดมิน) ────────────────────────────────────────────
  status: {
    pending: 'รอตรวจ',
    approved: 'อนุมัติแล้ว',
    rejected: 'ไม่ผ่านการตรวจ',
    expired: 'หมดอายุ',
    unknown: 'สถานะไม่ทราบ',
  } satisfies Record<LicenseStatus, string>,
  statusMeta: (profession: string, number: string, expiry: string) =>
    `วิชาชีพ ${profession} · เลขที่ ${number} · วันหมดอายุ ${expiry}`,
  statusApprovedMeta: (profession: string, number: string, expiry: string) =>
    `วิชาชีพ ${profession} · เลขที่ ${number} · ใช้ได้ถึง ${expiry}`,
  pendingNote: 'ทีมงานจะตรวจภายใน 1–2 วันทำการ และแจ้งผลให้ทราบ',
  rejectedReasonLabel: 'เหตุผลจากทีมงาน',
  expiredNote: (number: string, date: string) =>
    `ใบอนุญาตเลขที่ ${number} หมดอายุเมื่อ ${date} กรุณาอัปโหลดใบที่ต่ออายุแล้วเพื่อให้ทีมงานตรวจอีกครั้ง`,
  unknownNote: 'ยังแสดงสถานะนี้ไม่ได้ กรุณารีเฟรชหน้า หรือติดต่อทีมงาน',
  resubmitAction: 'แก้ไขและส่งใหม่',
  reuploadAction: 'อัปโหลดใบใหม่',
  /** KYC อนุมัติแล้วแต่ใบประกอบฯ ไม่ผ่าน/หมดอายุ — BE ยังไม่มีทางส่งใบใหม่แยกจาก KYC (ดู PR PYG-588) */
  reuploadUnavailable: 'ยังส่งใบใหม่ทางแอปไม่ได้ กรุณาติดต่อทีมงานเพื่อส่งใบที่ต่ออายุแล้ว',

  // ── แอดมิน ─────────────────────────────────────────────────────────────
  adminRequiredType: 'ประเภทใบที่ต้องมี',
  adminProfession: 'วิชาชีพที่ระบุ',
  adminNumber: 'เลขที่ใบอนุญาต',
  adminExpiry: 'วันหมดอายุ',
  adminFile: 'ไฟล์',
  adminRemaining: (days: number) => `อีก ${days} วัน`,
  adminOverdue: (days: number) => `เลยมา ${days} วัน`,
  adminChecklistTitle: 'สิ่งที่ต้องเทียบกับไฟล์',
  adminChecklist: ['ชื่อบนใบตรงกับบัตรประชาชน', 'เลขที่และวันหมดอายุตรงกับที่กรอก', 'เป็นใบของวิชาชีพที่ระบุ'],
  adminViewFile: 'ดูไฟล์ใบอนุญาต',
  adminNoLicense: 'ผู้ดูแลยังไม่ได้แนบใบประกอบวิชาชีพ',
  adminApprove: 'อนุมัติใบประกอบฯ',
  adminReject: 'ปฏิเสธใบประกอบฯ',
  adminApproveTitle: 'ยืนยันอนุมัติใบประกอบฯ?',
  adminApproveBody: (number: string, name: string, expiry: string) =>
    `ใบอนุญาตเลขที่ ${number} ของ ${name} ใช้ได้ถึง ${expiry} · ผู้ดูแลจะได้รับแจ้งเตือนทันที`,
  adminRejectTitle: 'ปฏิเสธใบประกอบฯ',
  adminRejectReason: 'เหตุผลที่ปฏิเสธ',
  adminRejectReasonHint: 'ผู้ดูแลจะเห็นข้อความนี้',
  adminRejectReasonRequired: 'กรุณาระบุเหตุผลที่ปฏิเสธ',
  adminRejectConfirm: 'ยืนยันปฏิเสธใบประกอบฯ',
  adminExpiredBlocked: (date: string) =>
    `อนุมัติไม่ได้ · ใบนี้หมดอายุเมื่อ ${date} ก่อนได้รับการตรวจ ระบบแจ้งผู้ดูแลให้อัปโหลดใบใหม่แล้ว`,
  adminApproved: 'อนุมัติใบประกอบฯ เรียบร้อยแล้ว',
  adminRejected: 'ปฏิเสธใบประกอบฯ เรียบร้อยแล้ว',
  adminAlreadyDecided: 'ใบนี้ถูกตรวจไปแล้ว หน้านี้อัปเดตสถานะให้แล้ว',
  adminActionFailed: 'ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  adminDecidedNote: 'ตัดสินแล้ว — อนุมัติหรือปฏิเสธซ้ำไม่ได้',

  // ── error จาก API → ข้อความที่ผู้ใช้อ่านเข้าใจ ───────────────────────────
  apiError: {
    LICENSE_NUMBER_REQUIRED: 'กรุณากรอกเลขที่ใบอนุญาต',
    LICENSE_NUMBER_TOO_LONG: 'เลขที่ใบอนุญาตยาวเกินกำหนด',
    LICENSE_FILE_REQUIRED: 'กรุณาแนบไฟล์ใบอนุญาต',
    LICENSE_EXPIRY_REQUIRED: 'กรุณาระบุวันหมดอายุ',
    LICENSE_EXPIRY_NOT_FUTURE: 'วันหมดอายุต้องเป็นวันหลังจากวันนี้ (ตามเวลาเซิร์ฟเวอร์)',
    LICENSE_REJECT_REASON_REQUIRED: 'กรุณาระบุเหตุผลที่ปฏิเสธ',
    LICENSE_EXPIRED: 'อนุมัติไม่ได้ ใบประกอบฯ หมดอายุแล้ว · หน้านี้อัปเดตสถานะเป็น "หมดอายุ" ให้แล้ว',
  } satisfies Record<LicenseErrorCode, string>,
};

export type LicenseStrings = typeof TH;

const EN: LicenseStrings = {
  sectionTitle: 'Professional license',
  sectionRequiredFor: (profession) => `Required for ${profession}`,
  changeProfession: 'Change profession (step 1)',
  fileLabel: 'License file',
  fileTitle: 'Photo or PDF of your license',
  fileHint: 'Name, number and expiry date must be readable',
  fileChoose: 'Choose file',
  fileChooseAgain: 'Choose again',
  fileUploading: (name) => `Uploading... ${name}`,
  fileReplacing: (name, oldName) => `Replacing with ${name} · current file ${oldName}`,
  fileUploaded: (name, size) => `${name} · ${size}`,
  fileView: 'View file',
  fileReplace: 'Replace file',
  fileRemove: 'Remove file',
  fileRetry: 'Try again',
  numberLabel: 'License number',
  numberPlaceholder: 'As shown on your license',
  numberHint: 'Letters and numbers as printed on the license',
  expiryLabel: 'Expiry date',
  expiryHint: 'Must be after today (Thailand time)',
  expiryFilled: (date, remaining) => `Expires ${date} · ${remaining}`,
  expiryNotice: 'When your license expires, we will remind you to upload a new one and our team will review it again',
  previousRejected: (reason) => `Your previous license was not approved: ${reason} · Please attach a new one`,
  previousExpired: 'Your previous license has expired · Please attach the renewed one',
  extraDocsTitle: 'Additional documents (optional)',
  certificateTitle: 'Training certificate (if any)',
  certificateHint: 'e.g. a nursing assistant course certificate · helps us review faster',
  blockedNext: (count) => `You can't continue yet · ${count} professional license field(s) missing`,
  savingLicense: 'Saving your license details...',

  errNumberRequired: 'Enter your license number',
  errNumberTooLong: (max) => `License number can be at most ${max} characters`,
  errExpiryRequired: 'Enter the expiry date',
  errExpiryInvalid: 'Invalid date',
  errExpiryNotFuture: 'Expiry date must be after today',
  errExpiryNotFutureServer: 'Expiry date must be after today (server time)',
  errFileRequired: 'Attach your license file',
  errFileType: (name) => `Only JPG, PNG and PDF are supported · ${name}`,
  errFileSize: 'File is larger than 5 MB · please resize and try again',
  errUploadFailed: (name) => `Upload failed, please try again · ${name}`,
  errUnknown: "We couldn't save your license details. Please try again",

  e1Title: 'Switch to general caregiver?',
  e1Body: "General caregivers don't need a professional license. These details will be removed:",
  e1Confirm: 'Switch and remove',
  e2Title: (profession) => `Switch to ${profession}?`,
  e2Body: (oldLicense, newLicense) =>
    `Your ${oldLicense} can't be used for the new profession. It will be removed and you'll need to attach a ${newLicense} in the "Documents" step`,
  e2Confirm: 'Change profession',
  cancel: 'Cancel',
  draftNumber: (value) => `License number ${value}`,
  draftFile: (value) => `File ${value}`,
  draftExpiry: (value) => `Expiry date ${value}`,
  professionChangedNotice: (profession, license) => `Profession changed to ${profession} · please attach your ${license}`,

  reviewProfession: 'Profession',
  reviewNumber: 'License number',
  reviewExpiry: 'Expiry date',
  reviewFile: 'File',
  reviewEdit: 'Edit',
  submitLicenseError: 'Your professional license details are missing or invalid. Go back to the "Documents" step to fix them',

  status: {
    pending: 'Pending review',
    approved: 'Approved',
    rejected: 'Not approved',
    expired: 'Expired',
    unknown: 'Unknown status',
  },
  statusMeta: (profession, number, expiry) => `${profession} · No. ${number} · Expires ${expiry}`,
  statusApprovedMeta: (profession, number, expiry) => `${profession} · No. ${number} · Valid until ${expiry}`,
  pendingNote: 'Our team will review it within 1–2 business days and let you know',
  rejectedReasonLabel: 'Reason from our team',
  expiredNote: (number, date) =>
    `License no. ${number} expired on ${date}. Upload a renewed license so our team can review it again`,
  unknownNote: "We can't show this status yet. Please refresh the page or contact our team",
  resubmitAction: 'Update and resubmit',
  reuploadAction: 'Upload new license',
  reuploadUnavailable: "You can't send a new license in the app yet. Please contact our team to send your renewed license",

  adminRequiredType: 'Required license',
  adminProfession: 'Stated profession',
  adminNumber: 'License number',
  adminExpiry: 'Expiry date',
  adminFile: 'File',
  adminRemaining: (days) => `${days} days left`,
  adminOverdue: (days) => `${days} days overdue`,
  adminChecklistTitle: 'Check against the file',
  adminChecklist: ['Name matches the ID card', 'Number and expiry match what was entered', 'License is for the stated profession'],
  adminViewFile: 'View license file',
  adminNoLicense: 'The caregiver has not attached a professional license',
  adminApprove: 'Approve license',
  adminReject: 'Reject license',
  adminApproveTitle: 'Approve this license?',
  adminApproveBody: (number, name, expiry) =>
    `License no. ${number} of ${name}, valid until ${expiry} · The caregiver will be notified right away`,
  adminRejectTitle: 'Reject license',
  adminRejectReason: 'Reason for rejection',
  adminRejectReasonHint: 'The caregiver will see this message',
  adminRejectReasonRequired: 'Enter a reason for rejecting',
  adminRejectConfirm: 'Confirm rejection',
  adminExpiredBlocked: (date) =>
    `Can't approve · This license expired on ${date} before it was reviewed. The caregiver has been asked to upload a new one`,
  adminApproved: 'License approved',
  adminRejected: 'License rejected',
  adminAlreadyDecided: 'This license was already reviewed. The page has been updated',
  adminActionFailed: 'Something went wrong. Please try again',
  adminDecidedNote: 'Decided — it cannot be approved or rejected again',

  apiError: {
    LICENSE_NUMBER_REQUIRED: 'Enter your license number',
    LICENSE_NUMBER_TOO_LONG: 'License number is too long',
    LICENSE_FILE_REQUIRED: 'Attach your license file',
    LICENSE_EXPIRY_REQUIRED: 'Enter the expiry date',
    LICENSE_EXPIRY_NOT_FUTURE: 'Expiry date must be after today (server time)',
    LICENSE_REJECT_REASON_REQUIRED: 'Enter a reason for rejecting',
    LICENSE_EXPIRED: 'Can\'t approve: the license has expired · The page now shows it as "Expired"',
  },
};

export const LICENSE_STRINGS = { th: TH, en: EN };

export function useLicenseStrings(): LicenseStrings {
  return TH;
}

/** 'YYYY-MM-DD' → "31 ธ.ค. 2570" (พ.ศ.) — ไม่ผ่าน Date เพื่อไม่ให้วันเลื่อนตามเขตเวลาเครื่อง */
export function formatLicenseDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return '—';
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return `${d} ${months[m - 1]} ${y + 543}`;
}

/** จำนวนวันที่เหลือ → "อีก 1 ปี 2 เดือน" / "อีก 12 วัน" */
export function formatRemaining(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return '';
  if (days < 60) return `อีก ${days} วัน`;
  const months = Math.floor(days / 30.44);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `อีก ${months} เดือน`;
  return rest === 0 ? `อีก ${years} ปี` : `อีก ${years} ปี ${rest} เดือน`;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
