/**
 * วันที่ทุกจุดของ KYC (ฝั่งผู้ดูแลและฝั่งแอดมิน) — PYG-711
 *
 * รูปแบบเดียว: "24 ต.ค. 2569" · มีเวลา: "24 ต.ค. 2569 • 14:30" (พ.ศ. · เวลาไทย)
 * ห้ามเขียน toLocaleDateString / Intl ในหน้า KYC เอง — เคยปนกันทั้ง พ.ศ./ค.ศ. และเดือนเต็ม/ย่อ
 */

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const DATE_PARTS = new Intl.DateTimeFormat('th-TH-u-ca-buddhist', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Bangkok',
});
const TIME_PARTS = new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Asia/Bangkok',
});

/**
 * "YYYY-MM-DD" (วันเกิด / วันหมดอายุ) อ่านเป็นวันนั้นตรง ๆ ไม่ให้เลื่อนตาม timezone
 * อย่างอื่น (ISO timestamp, Date) ใช้ตามจริงแล้วแสดงเป็นเวลาไทย
 */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const m = DATE_ONLY.exec(value);
    if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 5));
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function datePart(date: Date): string {
  const parts = DATE_PARTS.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month')} ${get('year')}`;
}

/** "24 ต.ค. 2569" · ไม่มีค่า / ค่าผิด → "-" */
export function kycDate(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? datePart(date) : '-';
}

/** "24 ต.ค. 2569 • 14:30" · ไม่มีค่า / ค่าผิด → "-" */
export function kycDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  return date ? `${datePart(date)} • ${TIME_PARTS.format(date)}` : '-';
}
