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
