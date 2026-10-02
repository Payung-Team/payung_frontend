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
/** BE อนุมาน timeSlot จากเวลาเริ่ม — นอก 06:00–21:30 ไม่มี slot รองรับ */
export const BOOKING_EARLIEST_START_MINUTES = 6 * 60;
export const BOOKING_LATEST_START_MINUTES = 21 * 60 + 30;
/** BE รับชั่วโมง 00–23 ("24:00" ไม่ผ่าน) และไม่รับข้ามเที่ยงคืน → สิ้นสุดช้าสุด 23:30 */
export const BOOKING_LATEST_END_MINUTES = 23 * 60 + 30;
/** เลือกเวลาเริ่มแล้ว ตั้งเวลาสิ้นสุดให้ก่อนที่ +4 ชม. */
export const BOOKING_DEFAULT_DURATION_MINUTES = 4 * 60;

/** "HH:mm" (หรือ "HH:mm:ss") → นาทีนับจากเที่ยงคืน · รูปแบบผิดคืน null */
export function timeToMinutes(time?: string | null): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(time ?? '');
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** นาทีนับจากเที่ยงคืน → "HH:mm" */
export function minutesToTime(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/**
 * เวลาเริ่มที่เลือกได้ ทีละ 30 นาที
 * @param afterMinute ส่งเมื่อเป็น "วันนี้" — ซ่อนเวลาที่ไม่ได้อยู่หลังนาทีนี้ (เวลาที่ผ่านไปแล้ว)
 */
export function bookingStartOptions(afterMinute?: number): string[] {
  const options: string[] = [];
  for (
    let m = BOOKING_EARLIEST_START_MINUTES;
    m <= BOOKING_LATEST_START_MINUTES;
    m += BOOKING_TIME_STEP_MINUTES
  ) {
    if (afterMinute === undefined || m > afterMinute) options.push(minutesToTime(m));
  }
  return options;
}

/** เวลาสิ้นสุดที่เลือกได้สำหรับเวลาเริ่มนี้ — ตัดตัวที่สั้น/ยาวเกิน และข้ามเที่ยงคืนออก */
export function bookingEndOptions(startTime: string): string[] {
  const start = timeToMinutes(startTime);
  if (start === null) return [];
  const last = Math.min(start + BOOKING_MAX_DURATION_MINUTES, BOOKING_LATEST_END_MINUTES);
  const options: string[] = [];
  for (
    let m = start + BOOKING_MIN_DURATION_MINUTES;
    m <= last;
    m += BOOKING_TIME_STEP_MINUTES
  ) {
    options.push(minutesToTime(m));
  }
  return options;
}

/** เวลาสิ้นสุดตั้งต้น = เริ่ม + 4 ชม. (ตัดที่ 23:30 ถ้าเริ่มดึก) · เวลาเริ่มผิดรูปแบบคืน '' */
export function defaultBookingEndTime(startTime: string): string {
  const start = timeToMinutes(startTime);
  if (start === null) return '';
  return minutesToTime(
    Math.min(start + BOOKING_DEFAULT_DURATION_MINUTES, BOOKING_LATEST_END_MINUTES),
  );
}

/** จำนวนชั่วโมงระหว่างสองเวลา — คืน 0 ถ้าไม่ครบหรือสิ้นสุดไม่หลังเริ่ม */
export function bookingDurationHours(startTime?: string | null, endTime?: string | null): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;
  return (end - start) / 60;
}
