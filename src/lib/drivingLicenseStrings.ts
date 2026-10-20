/**
 * ข้อความของใบขับขี่ (PYG-598) — ไทยและอังกฤษ
 *
 * ข้อความทุกจุดของส่วนใบขับขี่อยู่ที่นี่ที่เดียว ห้ามเขียนแทรกใน component
 * ถ้อยคำตามดีไซน์ PYG-595 (หน้า "ข้อความ TH EN · ใบขับขี่") · ข้อความของช่องอัปโหลดที่ใช้ร่วมกับ
 * ใบประกอบฯ (ดูไฟล์ / เปลี่ยนไฟล์ / ขนาดไฟล์) อยู่ใน licenseStrings.ts
 *
 * แอปยังไม่มีตัวสลับภาษา useDrivingLicenseStrings จึงคืนภาษาไทยเสมอ (แบบเดียวกับ licenseStrings)
 */
import type { DrivingLicenseErrorCode, DrivingLicenseStatus } from './drivingLicense';

const TH = {
  // ── ฟอร์ม KYC ขั้น 2 · การรับส่ง ─────────────────────────────────────────
  transportTitle: 'การรับส่งผู้รับการดูแล',
  transportQuestion: 'คุณขับรถรับส่งผู้รับการดูแลเองหรือไม่',
  transportOption: {
    self: { label: 'ขับรถรับส่งเอง', desc: 'ต้องแนบใบขับขี่ให้ทีมงานตรวจ' },
    hire: { label: 'ใช้รถรับจ้าง', desc: 'แท็กซี่หรือแอปเรียกรถ · ไม่ต้องแนบเอกสาร' },
    none: { label: 'ไม่รับส่ง', desc: 'ไม่ต้องแนบเอกสาร' },
  },
  transportRequired: 'กรุณาเลือกว่าคุณรับส่งผู้รับการดูแลอย่างไร',
  fileLabel: 'ใบขับขี่',
  fileTitle: 'รูปใบขับขี่ด้านหน้า',
  fileHint: 'เห็นชื่อ รูปหน้า และวันหมดอายุชัดเจน',
  filePrivateThumb: 'ภาพย่อเปิดดูได้เฉพาะคุณ',
  expiryLabel: 'วันหมดอายุของใบขับขี่',
  expiryHint: 'ต้องเป็นวันหลังจากวันนี้ (เวลาประเทศไทย)',
  privacy: 'รูปใบขับขี่เห็นเฉพาะคุณและทีมงาน · ผู้รับการดูแลเห็นเพียงป้าย “ผ่านการตรวจใบขับขี่”',
  previousRejected: (reason: string) => `ใบขับขี่เดิมไม่ผ่านการตรวจ: ${reason} · กรุณาแนบใบใหม่`,
  previousExpired: 'ใบขับขี่เดิมหมดอายุแล้ว · กรุณาแนบใบที่ยังไม่หมดอายุ',
  savingDrivingLicense: 'กำลังบันทึกข้อมูลใบขับขี่...',

  // ── error ──────────────────────────────────────────────────────────────
  errFileRequired: 'กรุณาแนบรูปใบขับขี่',
  errExpiryRequired: 'กรุณาระบุวันหมดอายุของใบขับขี่',
  errExpiryInvalid: 'รูปแบบวันที่ไม่ถูกต้อง · ใช้ วว/ดด/ปปปป',
  errExpired: 'ใบขับขี่นี้หมดอายุแล้ว · กรุณาใช้ใบที่ยังไม่หมดอายุ',
  errSummary: 'ยังไปขั้นถัดไปไม่ได้ · กรอกส่วน “การรับส่งผู้รับการดูแล” ให้ครบ',
  errUnknown: 'บันทึกข้อมูลใบขับขี่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  submitError: 'ข้อมูลใบขับขี่ยังไม่ครบหรือใช้ไม่ได้ · กลับไปแก้ที่ขั้น “เอกสาร”',

  // ── dialog เปลี่ยนคำตอบ ────────────────────────────────────────────────
  switchTitle: (option: string) => `เปลี่ยนเป็น “${option}”?`,
  switchBody: 'ไม่ต้องใช้ใบขับขี่แล้ว รูปใบขับขี่และวันหมดอายุที่กรอกไว้จะถูกลบ',
  switchConfirm: 'เปลี่ยนและลบข้อมูล',
  cancel: 'ยกเลิก',

  // ── สถานะที่ผู้ดูแลเห็น ─────────────────────────────────────────────────
  status: {
    none: 'ยังไม่ได้แนบ',
    pending: 'รอตรวจ',
    approved: 'ผ่านการตรวจ',
    rejected: 'ไม่ผ่านการตรวจ',
    expired: 'หมดอายุ',
    unknown: 'สถานะไม่ทราบ',
  } satisfies Record<DrivingLicenseStatus, string>,
  pendingNote: 'ระหว่างรอตรวจ ยังรับงานที่ไม่ต้องขับรถรับส่งได้ตามปกติ',
  // E8: ต่ออายุแล้วอัปโหลดใบใหม่ — ใบเดิมที่อนุมัติและยังไม่หมดอายุยังใช้ได้ระหว่างรอตรวจใบใหม่
  pendingStillVerifiedNote: 'ใบเดิมที่ผ่านการตรวจยังใช้ได้ระหว่างรอตรวจใบใหม่',
  approvedNote: 'รับงานที่ต้องขับรถรับส่งได้ · โปรไฟล์ของคุณแสดงป้าย “ผ่านการตรวจใบขับขี่”',
  // ป้ายในโปรไฟล์ฝั่ง Elder (AC6) — R8: สื่อแค่ "ผ่านการตรวจ" ไม่สื่อว่ามีรถหรือรับรองความปลอดภัย
  elderBadge: 'ผ่านการตรวจใบขับขี่',
  elderBadgeHint: 'ทีมงานตรวจใบขับขี่และวันหมดอายุแล้ว · ไม่ได้รับรองว่ามีรถหรือความปลอดภัยในการขับ',
  rejectedReasonLabel: 'เหตุผลจากทีมงาน',
  expiredBody: (date: string) =>
    `ใบขับขี่หมดอายุเมื่อ ${date} · รับงานที่ต้องขับรถรับส่งไม่ได้จนกว่าใบใหม่จะผ่านการตรวจ`,
  unknownNote: 'ยังแสดงสถานะนี้ไม่ได้ กรุณารีเฟรชหน้า หรือติดต่อทีมงาน',
  expiryMeta: (date: string) => `วันหมดอายุ ${date}`,
  reupload: 'อัปโหลดใหม่',
  uploadNew: 'อัปโหลดใบใหม่',
  // ผู้ดูแลที่ KYC อนุมัติแล้วมาเปลี่ยนเป็นขับรถรับส่งเอง
  changeIntro: 'ถ้าคุณจะขับรถรับส่งผู้รับการดูแลเอง แนบใบขับขี่ให้ทีมงานตรวจก่อนรับงานที่ต้องขับรถรับส่ง',
  changeStart: 'ขับรถรับส่งเอง · แนบใบขับขี่',
  changeSubmit: 'ส่งให้ทีมงานตรวจ',
  changeSent: 'ส่งใบขับขี่ให้ทีมงานตรวจแล้ว',
  changeCancel: 'ยกเลิก',
  // PYG-662: เปลี่ยนวิธีรับส่งหลัง KYC อนุมัติ (updateTransportMode)
  transportSectionLabel: 'วิธีรับส่งผู้รับการดูแล',
  transportUnset: 'ยังไม่ได้ระบุ',
  transportChange: 'เปลี่ยน',
  transportSave: 'บันทึก',
  transportSaving: 'กำลังบันทึก...',
  transportSaved: 'บันทึกวิธีรับส่งแล้ว',
  transportSaveFailed: 'บันทึกวิธีรับส่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  transportLeaveSelfNote:
    'ป้าย "ผ่านการตรวจใบขับขี่" จะไม่แสดงบนโปรไฟล์ของคุณ ใบที่ผ่านการตรวจยังเก็บไว้ ถ้ากลับมาเลือกขับเองและใบยังไม่หมดอายุ ป้ายจะกลับมา',
  transportSelfNeedsLicense: 'บันทึกแล้ว แนบใบขับขี่ด้านล่างให้ทีมงานตรวจก่อนรับงานที่ต้องขับรถรับส่ง',

  // ── สรุปก่อนส่ง (ขั้น 4) ───────────────────────────────────────────────
  reviewTitle: 'การรับส่งผู้รับการดูแล',
  reviewChoice: 'การรับส่ง',
  reviewExpiry: 'วันหมดอายุของใบขับขี่',
  reviewFile: 'รูปใบขับขี่',
  reviewEdit: 'แก้ไข',

  // ── ฝั่งแอดมิน ─────────────────────────────────────────────────────────
  adminTitle: 'ใบขับขี่',
  adminNoLicense: 'ผู้ดูแลยังไม่ได้แนบใบขับขี่',
  adminExpiryEntered: 'วันหมดอายุที่ผู้ดูแลกรอก',
  adminFile: 'ไฟล์',
  adminViewFile: 'เปิดดูไฟล์',
  adminRemaining: (days: number) => `อีก ${days} วัน`,
  adminOverdue: (days: number) => `เลยมา ${days} วัน`,
  adminChecklistTitle: 'ตรวจให้ครบก่อนอนุมัติ',
  // ประเภทที่รับ (มติ S06 · 19 ต.ค. 2026): ใบขับขี่รถยนต์ไทย ชั่วคราวหรือ 5 ปี
  // ไม่รับ: รถจักรยานยนต์อย่างเดียว · ใบต่างประเทศ / ใบอนุญาตขับรถระหว่างประเทศ · ตลอดชีพ (ยังไม่รองรับ E6)
  adminChecklist: [
    'ชื่อและรูปหน้าตรงกับบัตรประชาชน',
    'วันหมดอายุในรูปตรงกับที่กรอก (ไม่ตรง = ปฏิเสธพร้อมเหตุผล)',
    'เป็นใบขับขี่รถยนต์ของไทย ชนิดชั่วคราวหรือ 5 ปี และยังไม่หมดอายุ',
    'ไม่รับใบขับขี่รถจักรยานยนต์อย่างเดียว และไม่รับใบขับขี่ต่างประเทศ',
  ],
  adminApprove: 'อนุมัติใบขับขี่',
  adminReject: 'ปฏิเสธใบขับขี่',
  adminApproveTitle: 'อนุมัติใบขับขี่?',
  adminApproveBody: (name: string, expiry: string) =>
    `ใบขับขี่ของ ${name} · หมดอายุ ${expiry} · ผู้ดูแลจะรับงานที่ต้องขับรถรับส่งได้`,
  adminRejectTitle: 'ปฏิเสธใบขับขี่',
  adminRejectReason: 'เหตุผลที่ปฏิเสธ',
  adminRejectReasonHint: 'ผู้ดูแลจะเห็นข้อความนี้ และต้องอัปโหลดใบใหม่',
  adminRejectReasonRequired: 'กรุณาระบุเหตุผลที่ปฏิเสธ',
  adminRejectConfirm: 'ปฏิเสธใบขับขี่',
  adminExpiredBlocked: (date: string) => `อนุมัติไม่ได้ · หมดอายุเมื่อ ${date}`,
  adminApproved: 'อนุมัติใบขับขี่แล้ว',
  adminRejected: 'ปฏิเสธใบขับขี่แล้ว',
  adminActionFailed: 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
  adminAlreadyDecided: 'ใบขับขี่นี้ถูกตรวจไปแล้ว · หน้านี้โหลดสถานะล่าสุดให้แล้ว',
  adminDecidedNote: 'ตรวจใบนี้แล้ว · ถ้าผู้ดูแลอัปโหลดใบใหม่ จะกลับมาให้ตรวจที่นี่',
  adminHistory: 'ประวัติการตรวจใบขับขี่',
  adminHistoryEmpty: 'ยังไม่เคยตรวจ',
  adminHistoryAction: {
    driving_license_approved: 'อนุมัติ',
    driving_license_rejected: 'ปฏิเสธ',
  } as Record<string, string>,

  // ── error จาก API (fallback เมื่อเจอ code ที่ไม่รู้จัก → errUnknown / adminActionFailed) ─
  apiError: {
    DRIVING_LICENSE_REQUIRED: 'กรุณาแนบรูปใบขับขี่ เนื่องจากคุณเลือกว่าขับรถรับส่งเอง',
    DRIVING_LICENSE_EXPIRY_REQUIRED: 'กรุณาระบุวันหมดอายุของใบขับขี่',
    DRIVING_LICENSE_EXPIRED: 'ใบขับขี่นี้หมดอายุแล้ว · กรุณาใช้ใบที่ยังไม่หมดอายุ',
    DRIVING_LICENSE_NOT_VERIFIED: 'งานนี้ต้องขับรถรับส่ง · คุณต้องมีใบขับขี่ที่ผ่านการตรวจก่อนรับงานแบบนี้',
    REJECT_REASON_REQUIRED: 'กรุณาระบุเหตุผลที่ปฏิเสธ',
  } satisfies Record<DrivingLicenseErrorCode, string>,
};

export type DrivingLicenseStrings = typeof TH;

const EN: DrivingLicenseStrings = {
  transportTitle: 'Transporting care recipients',
  transportQuestion: 'Do you drive care recipients yourself?',
  transportOption: {
    self: { label: 'I drive them myself', desc: 'You’ll need to attach your driving license for review' },
    hire: { label: 'I use a hired ride', desc: 'Taxi or ride-hailing app · no document needed' },
    none: { label: 'I don’t provide transport', desc: 'No document needed' },
  },
  transportRequired: 'Please choose how you transport care recipients',
  fileLabel: 'Driving license',
  fileTitle: 'Photo of the front of your license',
  fileHint: 'Name, photo and expiry date must be clearly visible',
  filePrivateThumb: 'Only you can open this preview',
  expiryLabel: 'Driving license expiry date',
  expiryHint: 'Must be after today (Thailand time)',
  privacy: 'Only you and our team can see your license photo · care recipients only see a “Driving license verified” badge',
  previousRejected: (reason: string) => `Your previous license wasn’t approved: ${reason} · please attach a new one`,
  previousExpired: 'Your previous license has expired · please attach a valid one',
  savingDrivingLicense: 'Saving your driving license...',

  errFileRequired: 'Please attach a photo of your driving license',
  errExpiryRequired: 'Please enter your license expiry date',
  errExpiryInvalid: 'Invalid date · use DD/MM/YYYY',
  errExpired: 'This license has expired · please use a valid one',
  errSummary: 'You can’t continue yet · complete the “Transporting care recipients” section',
  errUnknown: 'Couldn’t save your driving license. Please try again',
  submitError: 'Your driving license is incomplete or can’t be used · go back to the “Documents” step',

  switchTitle: (option: string) => `Switch to “${option}”?`,
  switchBody: 'You won’t need a driving license anymore. The photo and expiry date you entered will be removed',
  switchConfirm: 'Switch and remove',
  cancel: 'Cancel',

  status: {
    none: 'Not attached',
    pending: 'Pending review',
    approved: 'Verified',
    rejected: 'Not approved',
    expired: 'Expired',
    unknown: 'Unknown status',
  },
  pendingNote: 'While we review it, you can still accept jobs that don’t need driving',
  pendingStillVerifiedNote: 'Your previously verified license is still valid while we review the new one',
  approvedNote: 'You can accept jobs that need driving · your profile shows a “Driving license verified” badge',
  elderBadge: 'Driving license verified',
  elderBadgeHint: 'Our team checked the license and its expiry · this does not confirm a car or driving safety',
  rejectedReasonLabel: 'Reason from our team',
  expiredBody: (date: string) =>
    `Your license expired on ${date} · you can’t accept jobs that need driving until a new one is verified`,
  unknownNote: 'We can’t show this status yet. Refresh the page or contact us',
  expiryMeta: (date: string) => `Expires ${date}`,
  reupload: 'Upload again',
  uploadNew: 'Upload new license',
  changeIntro: 'If you’ll drive care recipients yourself, attach your driving license for review before accepting jobs that need driving',
  changeStart: 'I drive them myself · attach license',
  changeSubmit: 'Send for review',
  changeSent: 'Your driving license was sent for review',
  changeCancel: 'Cancel',
  transportSectionLabel: 'How you transport care recipients',
  transportUnset: 'Not set',
  transportChange: 'Change',
  transportSave: 'Save',
  transportSaving: 'Saving...',
  transportSaved: 'Transport preference saved',
  transportSaveFailed: 'Couldn’t save your transport preference. Please try again',
  transportLeaveSelfNote:
    'The “Driving license verified” badge won’t show on your profile. Your verified license is kept — choose self-drive again while it’s still valid and the badge comes back',
  transportSelfNeedsLicense: 'Saved. Attach your driving license below for review before accepting jobs that need driving',

  reviewTitle: 'Transporting care recipients',
  reviewChoice: 'Transport',
  reviewExpiry: 'Driving license expiry date',
  reviewFile: 'Driving license photo',
  reviewEdit: 'Edit',

  adminTitle: 'Driving license',
  adminNoLicense: 'No driving license attached',
  adminExpiryEntered: 'Expiry date entered by caregiver',
  adminFile: 'File',
  adminViewFile: 'Open file',
  adminRemaining: (days: number) => `${days} days left`,
  adminOverdue: (days: number) => `${days} days overdue`,
  adminChecklistTitle: 'Check before approving',
  adminChecklist: [
    'Name and photo match the ID card',
    'Expiry matches the photo (mismatch = reject with a reason)',
    'It’s a Thai car driving license, temporary or 5-year, and not expired',
    'Motorcycle-only and foreign licenses are not accepted',
  ],
  adminApprove: 'Approve license',
  adminReject: 'Reject license',
  adminApproveTitle: 'Approve driving license?',
  adminApproveBody: (name: string, expiry: string) =>
    `${name}’s driving license · expires ${expiry} · they’ll be able to accept jobs that need driving`,
  adminRejectTitle: 'Reject driving license',
  adminRejectReason: 'Reason for rejecting',
  adminRejectReasonHint: 'The caregiver will see this and must upload a new license',
  adminRejectReasonRequired: 'Please give a reason for rejecting',
  adminRejectConfirm: 'Reject license',
  adminExpiredBlocked: (date: string) => `Can’t approve · expired on ${date}`,
  adminApproved: 'Driving license approved',
  adminRejected: 'Driving license rejected',
  adminActionFailed: 'Something went wrong. Please try again',
  adminAlreadyDecided: 'This license was already reviewed · the latest status is now shown',
  adminDecidedNote: 'Already reviewed · a new upload from the caregiver will appear here',
  adminHistory: 'Review history',
  adminHistoryEmpty: 'Not reviewed yet',
  adminHistoryAction: {
    driving_license_approved: 'Approved',
    driving_license_rejected: 'Rejected',
  },

  apiError: {
    DRIVING_LICENSE_REQUIRED: 'Please attach your driving license — you said you drive care recipients yourself',
    DRIVING_LICENSE_EXPIRY_REQUIRED: 'Please enter your license expiry date',
    DRIVING_LICENSE_EXPIRED: 'This license has expired · please use a valid one',
    DRIVING_LICENSE_NOT_VERIFIED: 'This job requires driving · you need a verified driving license to accept it',
    REJECT_REASON_REQUIRED: 'Please give a reason for rejecting',
  },
};

export const DRIVING_LICENSE_STRINGS = { th: TH, en: EN };

export function useDrivingLicenseStrings(): DrivingLicenseStrings {
  return TH;
}
