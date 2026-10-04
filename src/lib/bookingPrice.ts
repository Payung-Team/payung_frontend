/**
 * ราคาประมาณการในฟอร์มจอง (ก่อนเลือกผู้ดูแล) — PYG-525
 *
 * ★ ทำไมต้องมีไฟล์นี้
 *   เดิมสูตรนี้ก๊อปไว้ 3 ที่ (ขั้นวันเวลา / sidebar สรุป / ขั้นตรวจสอบ) ด้วยเรต 250 ตายตัว
 *   ทั้งที่ BE คิดราคาจาก service_price_catalog แล้ว (seed 300 ฿/ชม. เท่ากันทุกประเภท — PYG-490)
 *   → รวมไว้ที่นี่ที่เดียว ใช้เรตเดียวกับ catalog
 *
 * ⚠ FE ยังไม่มี API อ่าน catalog — ถ้าราคาใน catalog เปลี่ยน ต้องแก้ค่าข้างล่างด้วย (PYG-487)
 *   ส่วนค่าแพลตฟอร์ม 10% คงรูปแบบเดิมให้ตรงกับหน้าชำระเงิน/รายละเอียดใบจอง
 */

export const ESTIMATED_HOURLY_RATE = 300;
export const ESTIMATED_PLATFORM_FEE_PERCENT = 10;

export interface BookingCostEstimate {
  hourlyRate: number;
  hours: number;
  /** ค่าดูแล = เรต × ชั่วโมง */
  serviceCost: number;
  platformFee: number;
  total: number;
}

export function estimateBookingCost(hours: number): BookingCostEstimate {
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
  const serviceCost = Math.round(ESTIMATED_HOURLY_RATE * safeHours);
  const platformFee = Math.round(serviceCost * (ESTIMATED_PLATFORM_FEE_PERCENT / 100));
  return {
    hourlyRate: ESTIMATED_HOURLY_RATE,
    hours: safeHours,
    serviceCost,
    platformFee,
    total: serviceCost + platformFee,
  };
}
