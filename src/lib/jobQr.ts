/**
 * QR เช็คอิน/เช็คเอาท์ — types และตัวช่วยล้วน ๆ สำหรับฝั่ง UI (PYG-437 · การ์ดแม่ PYG-433)
 *
 * แยกออกมาจากตัวการ์ดด้วยเหตุผลเดียวกับ lib/monitoring.ts:
 *   ไฟล์ที่ export component ควร export "เฉพาะ component" (กติกา react-refresh)
 *   ค่าคงที่กับฟังก์ชันบริสุทธิ์จึงมาอยู่ที่นี่ ไม่ปนกับ JSX
 *
 * ★ ไฟล์นี้ห้ามมี logic ตัดสินใจเรื่อง "สแกนได้หรือยัง" — คนตัดสินคือ backend
 *   ผ่านฟิลด์ isActive เท่านั้น (นาฬิกาเครื่องผู้ใช้เชื่อไม่ได้)
 */

import type { BookingStatus } from '../utils/bookingStatus';
import { formatThaiTime } from './monitoring';

// ──────────────────────────────────────────────────────────────────────────
// Types — ต้องตรงกับ payung-api/src/schema.gql (type JobQr)
// ──────────────────────────────────────────────────────────────────────────

/** สถานะของใบ QR — เดินหน้าทางเดียว PENDING → CHECKED_IN → CHECKED_OUT */
export type JobSessionStatus = 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT';

/** สแกนครั้งต่อไปจะเป็น action อะไร */
export type ScanAction = 'CHECK_IN' | 'CHECK_OUT';

export interface JobQr {
  bookingId: string;
  /** ★ ความลับ — เอาไปวาด QR อย่างเดียว ห้าม log ห้ามใส่ URL ห้ามส่งต่อ */
  token: string;
  status: JobSessionStatus;
  /** ISO string — สแกนได้ตั้งแต่เมื่อไหร่ (ก่อนเวลานัดตามค่า config ฝั่ง backend) */
  validFrom: string;
  /** ISO string — สแกนได้ถึงเมื่อไหร่ (เลยเวลาเลิกงานตามค่า config ฝั่ง backend) */
  validUntil: string;
  /**
   * ★ "ตอนนี้สแกนได้จริงไหม" — เซิร์ฟเวอร์เป็นคนตัดสิน ไม่ใช่นาฬิกาเครื่องผู้ใช้
   *   เครื่องผู้ใช้ตั้งเวลาผิดได้ (และผิดกันบ่อยกว่าที่คิด) ถ้า UI ตัดสินเองจะเกิดเคส
   *   ที่จอบอก "ยังไม่ถึงเวลา" ทั้งที่ผู้ดูแลยืนสแกนได้อยู่ตรงหน้า
   */
  isActive: boolean;
  /** null = ปิดงานแล้ว ไม่เหลือ action ให้สแกนอีก */
  nextAction: ScanAction | null;
  /**
   * ISO string — QR ชุดที่เห็นอยู่นี้ถูกออกเมื่อไหร่ (PYG-437)
   *
   * เปลี่ยนค่าเมื่อ: ผู้ใช้กด "ออก QR ใหม่" · ผู้ดูแลเช็คอินสำเร็จ
   * (token ของ "จบงาน" เป็นคนละใบกับ "เริ่มงาน" — ฝั่ง backend เปลี่ยนให้เอง)
   *
   * ★ มีไว้เพราะ QR สองใบมองด้วยตาเปล่าแทบแยกไม่ออก
   *   ถ้าไม่บอกเวลา ผู้ใช้จะกดปุ่มแล้วไม่แน่ใจว่ามันทำงานหรือเปล่า
   */
  tokenIssuedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────
// งานสถานะไหนที่ "ควรมีการ์ด QR อยู่บนหน้า"
// ──────────────────────────────────────────────────────────────────────────

/**
 * - confirmed   = จ่ายเงินแล้ว รอถึงวันนัด → ควรเห็น QR ล่วงหน้าได้ (แม้ยังกดใช้ไม่ได้)
 * - in_progress = ผู้ดูแลเช็คอินแล้ว → ยังต้องใช้ QR ใบเดิมอีกครั้งตอนเช็คเอาท์
 *
 * ที่ไม่อยู่ในลิสต์และเหตุผล:
 *   pending / accepted              → ยังไม่จ่ายเงิน ยังไม่ควรมี QR ให้สแกน
 *   awaiting_release / needs_review → เช็คเอาท์ไปแล้ว (การ์ด "การดูแลเสร็จสิ้น" พูดแทน)
 *   completed / cancelled / rejected → จบเรื่องแล้ว
 */
const QR_RELEVANT_STATUSES: ReadonlySet<BookingStatus> = new Set<BookingStatus>([
  'confirmed',
  'in_progress',
]);

/** งานสถานะนี้ต้องแสดงการ์ด QR ไหม */
export function shouldShowJobQr(status: BookingStatus): boolean {
  return QR_RELEVANT_STATUSES.has(status);
}

// ──────────────────────────────────────────────────────────────────────────
// ตัวจัดรูปแบบเวลา
// ──────────────────────────────────────────────────────────────────────────

/** เขียนวันแบบสั้น ตามเวลาไทยเสมอ เช่น "8 ก.ย." */
function formatThaiDayShort(date: Date): string {
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(date);
}

/**
 * "08:00 น." ถ้าเป็นวันเดียวกับ `reference` · "08:00 น. · 8 ก.ย." ถ้าคนละวัน
 *
 * ทำไมต้องรับ `reference` เข้ามาแทนที่จะเรียก new Date() ข้างใน:
 *   ฟังก์ชันที่อ่านนาฬิกาเองจะให้ผลไม่เหมือนเดิมทุกครั้งที่เรียก (impure)
 *   React ห้ามเรียกของแบบนั้นระหว่าง render — ผู้เรียกจึงต้องส่งเวลาที่ถือไว้เป็น state มาให้
 *
 * ทำไมต้องเติมวันที่บางครั้ง:
 *   เติมทุกครั้ง = ข้อความยาวโดยไม่ได้ความรู้เพิ่ม
 *   ไม่เติมเลย  = งานที่จองล่วงหน้าจะอ่านว่า "ใช้ได้เวลา 08:00 น." แล้วนึกว่าเช้าพรุ่งนี้
 */
export function formatWhen(iso: string, reference: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const sameDay = formatThaiDayShort(date) === formatThaiDayShort(reference);
  return sameDay ? formatThaiTime(date) : `${formatThaiTime(date)} · ${formatThaiDayShort(date)}`;
}
