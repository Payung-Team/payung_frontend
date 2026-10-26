/**
 * เวลาของใบจอง — PYG-526 (การ์ดแม่ PYG-490)
 *
 * ★ ทำไมต้องมีไฟล์นี้
 *   ผู้ใช้ไม่ได้เลือก "ช่วงเช้า / บ่าย / เย็น" เองแล้ว — BE อนุมาน slot จากเวลาเริ่ม (PYG-523)
 *   ถ้ายังโชว์ชื่อ slot จะไม่ตรงกับที่ผู้ใช้กรอก (จอง 11:00–15:00 แต่เห็น "ช่วงเช้า")
 *   ทุกหน้าจึงแสดงเป็น "09:00 – 13:00 (4 ชม.)" จากฟังก์ชันในไฟล์นี้ที่เดียว
 *
 * ★ เวลาสิ้นสุดมาจาก BE (field `endTime`) — ไม่ต้องคำนวณเองแล้ว
 *   เดิมมี computeEndTime ก๊อปไว้ 5 หน้า (BookingsPage, BookingDetailPage, PaymentPage,
 *   CaregiverBookings, FamilyGroupPage) ถ้าวันหนึ่งสูตรเปลี่ยน จะแก้ไม่ครบ
 *   BE คำนวณ endTime = startTime + durationHours ให้ทั้งใบจองใหม่และใบจองเก่า
 *
 * ★ รูปแบบต้องตรงกับอีเมล/แจ้งเตือนของ BE (booking-time-display.ts) ทุกตัวอักษร:
 *   en dash "–" มีเว้นวรรคสองข้าง และ "ชม." ในวงเล็บ — ถ้าจะเปลี่ยนต้องแก้ทั้งสองฝั่ง
 */

/** ข้อมูลเวลาที่ใบจองมี — ใช้ได้ทั้งผลจาก BE และร่างใบจองในฟอร์ม */
export interface BookingTimeParts {
  /** "HH:mm" */
  startTime?: string | null;
  /** "HH:mm" — จาก BE (หรือจากฟอร์มจองตอนยังไม่ส่ง) */
  endTime?: string | null;
  durationHours?: number | null;
}

/**
 * จำนวนชั่วโมง → "4 ชม." / "4.5 ชม."
 * ปัดทศนิยม 2 ตำแหน่งกันเลขลอยจากใบจองเก่า — คืน '' ถ้าไม่มีค่าหรือ ≤ 0
 */
export function formatDurationHours(hours?: number | null): string {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return '';
  return `${Math.round(hours * 100) / 100} ชม.`;
}

/**
 * รูปแบบกลางของเวลาใบจอง
 *
 *   ครบทุกค่า              → "09:00 – 13:00 (4 ชม.)"
 *   withDuration: false    → "09:00 – 13:00"  (ใช้ในจุดที่มีช่อง "ระยะเวลา" แยกอยู่ข้าง ๆ แล้ว
 *                                             จะได้ไม่เห็นจำนวนชั่วโมงซ้ำสองที่ติดกัน)
 *   ไม่มีเวลาสิ้นสุด        → "09:00"          (ไม่เดาเวลาสิ้นสุดเอง)
 *   ไม่มีเวลาเริ่ม          → ''               (ผู้เรียกเลือกเองว่าจะโชว์ "—" หรือซ่อน)
 *
 * ★ ห้าม fallback เป็นชื่อ slot ("ช่วงเช้า") — นั่นคือสิ่งที่การ์ดนี้ให้เลิกแสดง
 */
export function formatBookingTimeRange(
  { startTime, endTime, durationHours }: BookingTimeParts,
  { withDuration = true }: { withDuration?: boolean } = {},
): string {
  if (!startTime) return '';
  if (!endTime) return startTime;
  const range = `${startTime} – ${endTime}`;
  const duration = withDuration ? formatDurationHours(durationHours) : '';
  return duration ? `${range} (${duration})` : range;
}

// ── กฎเวลาตอนจอง — PYG-525 ─────────────────────────────────────────────────────
//
// ★ ต้องตรงกับ BE (payung_backend/src/booking/booking-time.ts) ทุกค่า
//   ฟอร์มซ่อนตัวเลือกที่ผิดกฎไว้ตั้งแต่ต้น ผู้ใช้จะได้ไม่ต้องเจอ error ตอนกดยืนยัน
//   ถ้า BE เปลี่ยนกฎแต่ตรงนี้ไม่เปลี่ยน BE ยังปฏิเสธได้ถูก แค่ข้อความจะไปโผล่ตอนยืนยันแทน

export const BOOKING_TIME_STEP_MINUTES = 30;
export const BOOKING_MIN_DURATION_MINUTES = 60;
export const BOOKING_MAX_DURATION_MINUTES = 12 * 60;
/**
 * จองได้ทั้งวัน (feature/booking-24h) — BE ขยาย slot ให้ครอบ 00:00–24:00 แล้ว
 * (เดิมเริ่มได้ 06:00–21:30 · สิ้นสุดช้าสุด 23:30)
 * เริ่มช้าสุด 23:00 เพราะต้องยาวอย่างน้อย 1 ชม. และไม่ข้ามเที่ยงคืน
 */
export const BOOKING_EARLIEST_START_MINUTES = 0;
export const BOOKING_LATEST_START_MINUTES = 23 * 60;
/**
 * สิ้นสุดช้าสุด = เที่ยงคืน (นาทีที่ 1440) แสดงและส่ง BE เป็น "23:59"
 * BE รับชั่วโมง 00–23 ("24:00" ไม่ผ่าน) จึงใช้ "23:59" แทน แต่คิดระยะเวลา/ราคาเป็นเที่ยงคืน
 * → 23:00–23:59 = 1 ชม. เต็ม (BE: BOOKING_END_OF_DAY_TIME ใน booking-time.ts)
 */
export const BOOKING_LATEST_END_MINUTES = 24 * 60;
export const BOOKING_END_OF_DAY_TIME = '23:59';
/** เลือกเวลาเริ่มแล้ว ตั้งเวลาสิ้นสุดให้ก่อนที่ +4 ชม. */
export const BOOKING_DEFAULT_DURATION_MINUTES = 4 * 60;
/**
 * ฟอร์มจองให้เลือกทีละ 1 ชั่วโมง (PYG-689) — ตัวเลือกทีละ 30 นาทีเยอะเกินไปบนมือถือ
 * BE ยังรับทีละ 30 นาทีเหมือนเดิม (ชุดรายชั่วโมงเป็นส่วนหนึ่งของชุดนั้น) จึงไม่ต้องแก้ฝั่ง BE
 */
export const BOOKING_FORM_STEP_MINUTES = 60;

/** "HH:mm" (หรือ "HH:mm:ss") → นาทีนับจากเที่ยงคืน · รูปแบบผิดคืน null */
export function timeToMinutes(time?: string | null): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(time ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/**
 * เวลาสิ้นสุด "HH:mm" → นาทีนับจากเที่ยงคืน · "23:59" = เที่ยงคืน (1440) ไม่ใช่ 1439
 * ใช้กับเวลาสิ้นสุดเท่านั้น — เวลาเริ่มใช้ timeToMinutes ตามปกติ
 */
export function endTimeToMinutes(time?: string | null): number | null {
  const minutes = timeToMinutes(time);
  return minutes === BOOKING_LATEST_END_MINUTES - 1 ? BOOKING_LATEST_END_MINUTES : minutes;
}

/** นาทีนับจากเที่ยงคืน → "HH:mm" · เที่ยงคืน (1440) แสดงเป็น "23:59" */
export function minutesToTime(minutes: number): string {
  if (minutes === BOOKING_LATEST_END_MINUTES) return BOOKING_END_OF_DAY_TIME;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/**
 * เวลาเริ่มที่เลือกได้ (ค่าเริ่มต้นทีละ 30 นาทีตามกฎ BE)
 * @param afterMinute ส่งเมื่อเป็น "วันนี้" — ซ่อนเวลาที่ไม่ได้อยู่หลังนาทีนี้ (เวลาที่ผ่านไปแล้ว)
 * @param stepMinutes ระยะห่างของตัวเลือก — ฟอร์มจองส่ง BOOKING_FORM_STEP_MINUTES
 */
export function bookingStartOptions(
  afterMinute?: number,
  stepMinutes: number = BOOKING_TIME_STEP_MINUTES,
): string[] {
  const options: string[] = [];
  for (
    let m = BOOKING_EARLIEST_START_MINUTES;
    m <= BOOKING_LATEST_START_MINUTES;
    m += stepMinutes
  ) {
    if (afterMinute === undefined || m > afterMinute) options.push(minutesToTime(m));
  }
  return options;
}

/**
 * เวลาสิ้นสุดที่เลือกได้สำหรับเวลาเริ่มนี้ — ตัดตัวที่สั้น/ยาวเกิน และข้ามเที่ยงคืนออก
 * ตัวสุดท้ายถึงเที่ยงคืนได้ แสดงเป็น "23:59" (เช่นเริ่ม 20:00 → 21:00 / 22:00 / 23:00 / 23:59)
 */
export function bookingEndOptions(
  startTime: string,
  stepMinutes: number = BOOKING_TIME_STEP_MINUTES,
): string[] {
  const start = timeToMinutes(startTime);
  if (start === null) return [];
  const last = Math.min(start + BOOKING_MAX_DURATION_MINUTES, BOOKING_LATEST_END_MINUTES);
  const options: string[] = [];
  for (
    let m = start + BOOKING_MIN_DURATION_MINUTES;
    m <= last;
    m += stepMinutes
  ) {
    options.push(minutesToTime(m));
  }
  return options;
}

/**
 * เวลาสิ้นสุดตั้งต้น = เริ่ม + 4 ชม. · เริ่มดึกจนเลยเที่ยงคืน ใช้ตัวเลือกสุดท้ายที่ลงตัวกับ step
 * (เริ่ม 21:00 / 23:00 → "23:59" = เที่ยงคืน) · เวลาเริ่มผิดรูปแบบคืน ''
 */
export function defaultBookingEndTime(
  startTime: string,
  stepMinutes: number = BOOKING_TIME_STEP_MINUTES,
): string {
  const start = timeToMinutes(startTime);
  if (start === null) return '';
  const latestOnStep =
    start + Math.floor((BOOKING_LATEST_END_MINUTES - start) / stepMinutes) * stepMinutes;
  return minutesToTime(Math.min(start + BOOKING_DEFAULT_DURATION_MINUTES, latestOnStep));
}

/** จำนวนชั่วโมงระหว่างสองเวลา — คืน 0 ถ้าไม่ครบหรือสิ้นสุดไม่หลังเริ่ม · สิ้นสุด "23:59" = เที่ยงคืน */
export function bookingDurationHours(startTime?: string | null, endTime?: string | null): number {
  const start = timeToMinutes(startTime);
  const end = endTimeToMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;
  return (end - start) / 60;
}
