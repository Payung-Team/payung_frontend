// PYG-460 — ข้อมูลสุขภาพผู้รับบริการ
//
// รูปทรงเดียวกันทั้งขาส่งและขารับโดยตั้งใจ (BE ออกแบบไว้แบบนั้น):
//   ส่ง — POST /api/v1/bookings (`patientProfile`), POST/PUT /api/v1/patient/care-recipients (`details`)
//   รับ — GET /api/v1/patient/care-recipients (`details`),
//         GraphQL CaregiverBookingSummary.patientProfile (snapshot ณ วันจอง)
// ค่าที่เพิ่งบันทึกจึงเอามาเติมฟอร์มรอบหน้าได้โดยไม่ต้องแปลงอีกชั้น

/**
 * ⚠ `gender` / `supportLevel` เป็น "ข้อความไทย" ตามที่ปุ่มในฟอร์มส่งอยู่แล้ว
 *   BE แปลงเป็น enum เองที่ patient-profile.mapper.ts — ห้ามแปลงเป็น
 *   male / assisted ที่ฝั่งนี้ ไม่งั้นตาราง mapping จะอยู่สองที่แล้วแก้ไม่ครบ
 */
export interface PatientProfile {
  /** อายุเป็นปี จำนวนเต็ม 0-130 (BE เก็บเป็น date_of_birth แล้วคำนวณกลับ) */
  age?: number;
  gender?: 'ชาย' | 'หญิง';
  /** กก. 0-999.99 */
  weight?: number;
  /** ซม. 0-999.99 */
  height?: number;
  /**
   * หนึ่งใน SUPPORT_LEVEL_LABELS — ตั้งเป็น string ไม่ใช่ union เพราะขารับ
   * อาจได้ 'ใช้รถเข็น' ซึ่งไม่มีปุ่มในฟอร์ม (ดู SUPPORT_LEVEL_LABELS)
   */
  supportLevel?: string;
  /** ยาวสุด 5 */
  bloodGroup?: string;
  /** สูงสุด 50 รายการ แต่ละอันยาวสุด 200 */
  conditions?: string[];
  /** ยาวสุด 2000 */
  medicines?: string;
  /** ยาวสุด 2000 */
  allergies?: string;
  /** ยาวสุด 2000 */
  careInstructions?: string;
  /** ยาวสุด 255 */
  regularHospital?: string;
}

/**
 * ค่า supportLevel ที่ BE รับ — 4 ค่า แต่ฟอร์มมีปุ่มให้เลือกแค่ 3
 *
 * 'ใช้รถเข็น' อยู่ใน DB (mobility_level) แต่ไม่มีปุ่มในฟอร์มวันนี้ โปรไฟล์ที่มีค่านี้
 * จะไม่มีปุ่มไหนถูกไฮไลต์ตอนกดเลือก — เป็นพฤติกรรมที่ตั้งใจ BE จงใจไม่ยัดให้เป็น
 * 'assisted' เพราะการโกหกระดับการช่วยเหลือของคนไข้อันตรายกว่าการปล่อยให้ว่าง
 * ปล่อยให้ validation บังคับผู้ใช้เลือกใหม่ ห้ามเขียนโค้ดเดาแทน
 */
export const SUPPORT_LEVEL_LABELS = [
  'ช่วยเหลือตัวเองได้ดี',
  'ช่วยเหลือตัวเองได้เล็กน้อย / ต้องการการช่วยพยุงเดิน',
  'ช่วยเหลือตัวเองไม่ได้ / ติดเตียง',
  'ใช้รถเข็น',
] as const;

/**
 * รูปทรงที่ฟอร์มถืออยู่ใน bookingDraft.recipient.patientDetails — หลวมกว่าขาส่ง
 *
 *   `gender` เป็น `''` ได้ตอนยังไม่ได้เลือก (ปุ่มเพศเริ่มจากไม่เลือกอะไร)
 *   `name` / `nickname` อยู่ใน draft ด้วย แต่ **ห้ามส่งไปใน details/patientProfile**
 *   BE เปิด forbidNonWhitelisted → ส่งไปจะ 400 ทั้งคำขอ
 *   (`name` ส่งแยกเป็น `patientName` ที่ระดับ payload ของ booking)
 */
export interface PatientProfileInput extends Omit<PatientProfile, 'gender'> {
  gender?: 'ชาย' | 'หญิง' | '';
  name?: string;
  nickname?: string;
}

/**
 * ตัวเลขที่ผู้ใช้ไม่ได้กรอก → undefined
 *
 * ตัด 0 ออกด้วย ทั้งที่ BE รับ age: 0 เป็นค่าที่ถูกต้อง (ช่วง 0-130 เพราะ
 * ผู้รับบริการอาจเป็นทารก) เพราะยังมีที่อื่นสร้าง draft ด้วย `age: 0` เป็นค่าเริ่มต้น
 * (PaymentPage / BookingDetailPage / BookingsPage) — ถ้าปล่อย 0 ผ่านไป
 * จะได้โปรไฟล์คนไข้อายุ 0 ปีโดยไม่มีใคร error ให้เห็น ซึ่งแย่กว่าอายุที่ขาดไป
 * ผลข้างเคียงที่ยอมรับ: ถ้าผู้ใช้กรอกอายุ 0 จริง ๆ (ทารก) อายุจะไม่ถูกบันทึก
 */
function num(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n !== 0 ? n : undefined;
}

/**
 * ตัดคีย์ที่ผู้ใช้ไม่ได้กรอกออกก่อนส่ง — ใช้ตอน **สร้าง** เท่านั้น
 * (จอง / เพิ่มโปรไฟล์ใหม่)
 *
 * ⚠ `''` กับไม่ส่งคีย์เลย ไม่เหมือนกันสำหรับ BE:
 *     ส่ง `allergies: ''`  = สั่งล้างค่าเดิมใน DB
 *     ไม่ส่งคีย์ `allergies` = คงค่าเดิมไว้ (PUT merge ทีละช่อง)
 *   หน้า "แก้โปรไฟล์" ที่ผู้ใช้ลบข้อความในช่องทิ้งจริง ๆ **ต้องส่ง `''` ไป**
 *   ไม่งั้นค่าเก่าจะค้างอยู่เงียบ ๆ → ห้ามใช้ฟังก์ชันนี้ที่นั่น
 *
 * ⚠ ห้ามเพิ่มคีย์ที่ไม่มีใน PatientProfile — BE เปิด forbidNonWhitelisted
 *   ส่งคีย์ที่ไม่รู้จัก (เช่น `name` หรือพิมพ์ `allergie` ตัว s ตก) ได้ 400 ทั้งคำขอ
 */
export function toPatientProfilePayload(
  details: PatientProfileInput | undefined,
): PatientProfile | undefined {
  if (!details) return undefined;

  const out: PatientProfile = {};

  const age = num(details.age);
  if (age !== undefined) out.age = age;
  const weight = num(details.weight);
  if (weight !== undefined) out.weight = weight;
  const height = num(details.height);
  if (height !== undefined) out.height = height;

  if (details.gender) out.gender = details.gender;
  if (details.supportLevel) out.supportLevel = details.supportLevel;
  if (details.bloodGroup) out.bloodGroup = details.bloodGroup;
  if (details.conditions?.length) out.conditions = details.conditions;
  if (details.medicines) out.medicines = details.medicines;
  if (details.allergies) out.allergies = details.allergies;
  if (details.careInstructions) out.careInstructions = details.careInstructions;
  if (details.regularHospital) out.regularHospital = details.regularHospital;

  // ไม่มีอะไรให้ส่งเลย → ไม่ต้องส่งคีย์ patientProfile / details
  return Object.keys(out).length > 0 ? out : undefined;
}

/** มีข้อมูลสุขภาพอย่างน้อยหนึ่งช่องไหม — ใช้ตัดสินว่าจะแสดงการ์ดฝั่งผู้ดูแลหรือไม่ */
export function hasAnyProfileData(profile: PatientProfile | null | undefined): boolean {
  if (!profile) return false;
  return (
    profile.age != null ||
    profile.weight != null ||
    profile.height != null ||
    !!profile.gender ||
    !!profile.supportLevel ||
    !!profile.bloodGroup ||
    !!profile.conditions?.length ||
    !!profile.medicines ||
    !!profile.allergies ||
    !!profile.careInstructions ||
    !!profile.regularHospital
  );
}
