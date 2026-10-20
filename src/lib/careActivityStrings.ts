import { extractGraphQLErrorExtensions } from './apolloErrors';

/**
 * ข้อความของกิจกรรมการดูแลกลาง (PYG-635 · S15) — TH/EN อยู่ที่เดียว
 *
 * Error contract (BE care-activity.errors.ts):
 *   CARE_ACTIVITY_NOT_FOUND { activityIds } · CARE_ACTIVITY_INACTIVE { activityIds }
 *   CARE_ACTIVITY_DUPLICATE { category, nameTh } · CARE_ACTIVITY_INVALID { field, reason, max? }
 * GraphQL: อยู่ใน extensions (มากับ HTTP 422 → อ่านผ่าน extractGraphQLErrorExtensions ซึ่งรองรับ ServerError)
 * REST POST /bookings: อยู่ใน body ตรง ๆ ({ statusCode: 422, code, message, activityIds })
 */

export const CARE_ACTIVITY_ERROR = {
  NOT_FOUND: 'CARE_ACTIVITY_NOT_FOUND',
  INACTIVE: 'CARE_ACTIVITY_INACTIVE',
  DUPLICATE: 'CARE_ACTIVITY_DUPLICATE',
  INVALID: 'CARE_ACTIVITY_INVALID',
} as const;

/** ความยาวสูงสุดตาม BE (CARE_ACTIVITY_NAME_MAX / CARE_ACTIVITY_CATEGORY_MAX) */
export const CARE_ACTIVITY_NAME_MAX = 200;
export const CARE_ACTIVITY_CATEGORY_MAX = 100;

type Field = 'nameTh' | 'nameEn' | 'category' | 'careLevel' | 'sortOrder';

const TH = {
  // ── หน้าจอง ──
  pickerTitle: 'กิจกรรมการดูแล (ไม่บังคับ)',
  pickerHint: 'เลือกจากรายการกลางได้หลายข้อ · ระดับบอกว่ากิจกรรมนั้นต้องใช้ผู้ดูแลระดับไหน',
  pickerSelected: (n: number) => `เลือกแล้ว ${n} รายการ`,
  pickerClear: 'ล้างที่เลือก',
  pickerEmpty: 'ยังไม่มีกิจกรรมในรายการกลาง · ระบุงานที่ต้องการในช่อง "งานพิเศษ" ด้านล่างได้',
  pickerLoadFailed: 'โหลดรายการกิจกรรมไม่สำเร็จ · จองต่อได้ตามปกติ หรือลองโหลดใหม่',
  pickerRetry: 'โหลดใหม่',
  pickerGroupCount: (selected: number, total: number) => (selected > 0 ? `${selected}/${total}` : `${total}`),
  reviewTitle: 'กิจกรรมการดูแล',
  detailTitle: 'กิจกรรมการดูแลที่เลือก',
  detailNote: 'บันทึก ณ วันจอง',
  bookingRejected: (n: number) =>
    `กิจกรรม ${n} รายการถูกปิดใช้งานหรือถูกนำออกจากรายการแล้ว · เราเอาออกจากการจองให้แล้ว กรุณาตรวจสอบแล้วกดยืนยันอีกครั้ง`,

  // ── หน้าแอดมิน ──
  adminTitle: 'กิจกรรมการดูแล',
  adminSubtitle: 'รายการกลางที่ผู้จองเลือกได้ตอนจอง · ปิดใช้งานแล้วจะไม่แสดงในหน้าจอง แต่การจองเดิมยังเห็นชื่อเดิม',
  add: 'เพิ่มกิจกรรม',
  searchPlaceholder: 'ค้นจากชื่อไทย / อังกฤษ / รหัส',
  allCategories: 'ทุกหมวด',
  allLevels: 'ทุกระดับ',
  statusAll: 'ทั้งหมด',
  statusActive: 'เปิดใช้งาน',
  statusInactive: 'ปิดใช้งาน',
  colName: 'ชื่อกิจกรรม',
  colCategory: 'หมวด',
  colLevel: 'ระดับ',
  colOrder: 'ลำดับ',
  colStatus: 'สถานะ',
  colActions: '',
  edit: 'แก้ไข',
  deactivate: 'ปิดใช้งาน',
  activate: 'เปิดใช้งาน',
  emptyAll: 'ยังไม่มีกิจกรรม · กด "เพิ่มกิจกรรม" เพื่อเริ่ม',
  emptyFiltered: 'ไม่พบกิจกรรมตามตัวกรอง',
  loadFailed: 'โหลดรายการกิจกรรมไม่สำเร็จ',
  count: (n: number) => `${n} รายการ`,

  formAddTitle: 'เพิ่มกิจกรรมการดูแล',
  formEditTitle: 'แก้ไขกิจกรรมการดูแล',
  formEditNote: 'แก้แล้วมีผลกับการจองใหม่เท่านั้น · การจองเดิมเก็บชื่อ/หมวด/ระดับ ณ วันจองไว้',
  fieldNameTh: 'ชื่อภาษาไทย',
  fieldNameEn: 'ชื่อภาษาอังกฤษ (ไม่บังคับ)',
  fieldCategory: 'หมวด',
  fieldCategoryHint: 'เลือกหมวดเดิม หรือพิมพ์ชื่อหมวดใหม่',
  fieldLevel: 'ระดับที่ต้องใช้',
  fieldOrder: 'ลำดับในหมวด (ไม่บังคับ)',
  fieldOrderHint: 'เว้นว่าง = ต่อท้ายหมวด · เลขน้อยแสดงก่อน',
  required: 'ต้องกรอกช่องนี้',
  tooLong: (max: number) => `ยาวเกิน ${max} ตัวอักษร`,
  orderInvalid: 'ใส่เป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป',
  cancel: 'ยกเลิก',
  save: 'บันทึก',
  saving: 'กำลังบันทึก...',
  created: (name: string) => `เพิ่ม "${name}" แล้ว`,
  updated: (name: string) => `บันทึก "${name}" แล้ว`,
  saveFailed: 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',

  deactivateTitle: 'ปิดใช้งานกิจกรรมนี้?',
  deactivateBody: (name: string) =>
    `"${name}" จะไม่แสดงในหน้าจองอีก · การจองที่เลือกไว้แล้วยังเห็นชื่อเดิม · เปิดใช้งานกลับได้ภายหลัง`,
  activateTitle: 'เปิดใช้งานกิจกรรมนี้?',
  activateBody: (name: string) => `"${name}" จะกลับมาแสดงในหน้าจอง`,
  deactivated: (name: string) => `ปิดใช้งาน "${name}" แล้ว`,
  activated: (name: string) => `เปิดใช้งาน "${name}" แล้ว`,
  toggleFailed: 'เปลี่ยนสถานะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',

  errDuplicate: (category: string, nameTh: string) => `มี "${nameTh}" ในหมวด "${category}" อยู่แล้ว`,
  errNotFound: 'ไม่พบกิจกรรมนี้แล้ว · โหลดรายการใหม่ให้แล้ว',
  errInvalidLevel: 'ระดับต้องเป็น ระดับต้น / ระดับกลาง / ระดับสูง',
  errInvalidField: {
    nameTh: 'ชื่อภาษาไทย',
    nameEn: 'ชื่อภาษาอังกฤษ',
    category: 'หมวด',
    careLevel: 'ระดับ',
    sortOrder: 'ลำดับ',
  } as Record<Field, string>,
  errInvalidRequired: (label: string) => `ต้องกรอก${label}`,
  errInvalidTooLong: (label: string, max: number) => `${label}ยาวเกิน ${max} ตัวอักษร`,
  errInvalidOther: (label: string) => `${label}ไม่ถูกต้อง`,
};

export type CareActivityStrings = typeof TH;

const EN: CareActivityStrings = {
  pickerTitle: 'Care activities (optional)',
  pickerHint: 'Pick any from the central list · the level shows which caregiver level the activity needs',
  pickerSelected: (n) => `${n} selected`,
  pickerClear: 'Clear selection',
  pickerEmpty: 'No activities in the central list yet · describe what you need under "Extra tasks" below',
  pickerLoadFailed: "Couldn't load activities · you can still book, or try again",
  pickerRetry: 'Retry',
  pickerGroupCount: (selected, total) => (selected > 0 ? `${selected}/${total}` : `${total}`),
  reviewTitle: 'Care activities',
  detailTitle: 'Selected care activities',
  detailNote: 'As recorded when booked',
  bookingRejected: (n) =>
    `${n} activit${n === 1 ? 'y was' : 'ies were'} turned off or removed from the list · we've taken ${n === 1 ? 'it' : 'them'} off your booking. Please check and confirm again`,

  adminTitle: 'Care activities',
  adminSubtitle:
    'The central list bookers pick from · turned-off activities no longer show when booking, but existing bookings keep their names',
  add: 'Add activity',
  searchPlaceholder: 'Search Thai / English name or code',
  allCategories: 'All categories',
  allLevels: 'All levels',
  statusAll: 'All',
  statusActive: 'Active',
  statusInactive: 'Inactive',
  colName: 'Activity',
  colCategory: 'Category',
  colLevel: 'Level',
  colOrder: 'Order',
  colStatus: 'Status',
  colActions: '',
  edit: 'Edit',
  deactivate: 'Turn off',
  activate: 'Turn on',
  emptyAll: 'No activities yet · click "Add activity" to start',
  emptyFiltered: 'No activities match these filters',
  loadFailed: "Couldn't load activities",
  count: (n) => `${n} item${n === 1 ? '' : 's'}`,

  formAddTitle: 'Add care activity',
  formEditTitle: 'Edit care activity',
  formEditNote: 'Changes apply to new bookings only · existing bookings keep the name/category/level from booking time',
  fieldNameTh: 'Thai name',
  fieldNameEn: 'English name (optional)',
  fieldCategory: 'Category',
  fieldCategoryHint: 'Pick an existing category or type a new one',
  fieldLevel: 'Required level',
  fieldOrder: 'Order in category (optional)',
  fieldOrderHint: 'Leave blank to add at the end · lower numbers show first',
  required: 'This field is required',
  tooLong: (max) => `Longer than ${max} characters`,
  orderInvalid: 'Enter a whole number, 0 or more',
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving...',
  created: (name) => `Added "${name}"`,
  updated: (name) => `Saved "${name}"`,
  saveFailed: "Couldn't save. Please try again",

  deactivateTitle: 'Turn off this activity?',
  deactivateBody: (name) =>
    `"${name}" will no longer show when booking · bookings that already include it keep the name · you can turn it back on later`,
  activateTitle: 'Turn on this activity?',
  activateBody: (name) => `"${name}" will show when booking again`,
  deactivated: (name) => `Turned off "${name}"`,
  activated: (name) => `Turned on "${name}"`,
  toggleFailed: "Couldn't change the status. Please try again",

  errDuplicate: (category, nameTh) => `"${nameTh}" already exists in "${category}"`,
  errNotFound: 'This activity no longer exists · the list has been reloaded',
  errInvalidLevel: 'Level must be Basic / Intermediate / Advanced',
  errInvalidField: {
    nameTh: 'Thai name',
    nameEn: 'English name',
    category: 'Category',
    careLevel: 'Level',
    sortOrder: 'Order',
  },
  errInvalidRequired: (label) => `${label} is required`,
  errInvalidTooLong: (label, max) => `${label} is longer than ${max} characters`,
  errInvalidOther: (label) => `${label} is invalid`,
};

export const CARE_ACTIVITY_STRINGS = { th: TH, en: EN };

export function useCareActivityStrings(): CareActivityStrings {
  return TH;
}

function codeAndExtras(source: unknown): Record<string, unknown> | undefined {
  // REST body เป็น object ที่มี code ตรง ๆ · GraphQL error ต้องแกะ extensions
  const body = source as { code?: unknown } | null;
  if (body && typeof body === 'object' && typeof body.code === 'string') return body as Record<string, unknown>;
  return extractGraphQLErrorExtensions(source);
}

/**
 * การจองถูกปฏิเสธเพราะกิจกรรมที่เลือกถูกปิดใช้งาน / ไม่มีแล้ว → id ที่ต้องเอาออกจาก draft
 * รับได้ทั้ง REST body และ error ของ Apollo · ไม่ใช่ error กิจกรรม → null
 */
export function rejectedBookingActivityIds(source: unknown): string[] | null {
  const ext = codeAndExtras(source);
  if (ext?.code !== CARE_ACTIVITY_ERROR.INACTIVE && ext?.code !== CARE_ACTIVITY_ERROR.NOT_FOUND) return null;
  const ids = Array.isArray(ext.activityIds) ? ext.activityIds.filter((v): v is string => typeof v === 'string') : [];
  return ids;
}

/** ข้อความ error ของ mutation ฝั่งแอดมิน · ไม่ใช่ code ของกิจกรรม → null (ผู้เรียกใช้ข้อความกลาง) */
export function careActivityAdminErrorMessage(err: unknown, s: CareActivityStrings = TH): string | null {
  const ext = codeAndExtras(err);
  switch (ext?.code) {
    case CARE_ACTIVITY_ERROR.DUPLICATE:
      return s.errDuplicate(String(ext.category ?? ''), String(ext.nameTh ?? ''));
    case CARE_ACTIVITY_ERROR.NOT_FOUND:
      return s.errNotFound;
    case CARE_ACTIVITY_ERROR.INVALID: {
      const field = ext.field as Field;
      if (field === 'careLevel') return s.errInvalidLevel;
      const label = s.errInvalidField[field] ?? String(ext.field ?? '');
      if (ext.reason === 'required') return s.errInvalidRequired(label);
      if (ext.reason === 'too_long' && typeof ext.max === 'number') return s.errInvalidTooLong(label, ext.max);
      return s.errInvalidOther(label);
    }
    default:
      return null;
  }
}

/** ช่องในฟอร์มที่ error ชี้ — ใช้วาง error ใต้ช่องนั้นแทน toast */
export function careActivityErrorField(err: unknown): Field | null {
  const ext = codeAndExtras(err);
  if (ext?.code === CARE_ACTIVITY_ERROR.DUPLICATE) return 'nameTh';
  if (ext?.code === CARE_ACTIVITY_ERROR.INVALID && typeof ext.field === 'string') return ext.field as Field;
  return null;
}
