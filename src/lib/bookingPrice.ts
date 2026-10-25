/**
 * ราคาประมาณการในฟอร์มจอง (ก่อนเลือกผู้ดูแล) — PYG-525 · คิดตามบริการตั้งแต่ PYG-694
 *
 * ★ ทำไมต้องมีไฟล์นี้
 *   เดิมสูตรนี้ก๊อปไว้ 3 ที่ (ขั้นวันเวลา / sidebar สรุป / ขั้นตรวจสอบ) ด้วยเรต 250 ตายตัว
 *   ทั้งที่ BE คิดราคาจาก service_price_catalog แล้ว → รวมไว้ที่นี่ที่เดียว ใช้เรตเดียวกับ catalog
 *
 * ⚠ FE ยังไม่มี API อ่าน catalog — ถ้าราคาใน catalog เปลี่ยน ต้องแก้ SERVICE_HOURLY_RATES ด้วย (PYG-487)
 *   ตอนนี้: กายภาพบำบัด 800 (PYG-692) · บริการอื่น 300 (seed PYG-490)
 *   ส่วนค่าแพลตฟอร์ม 10% คงรูปแบบเดิมให้ตรงกับหน้าชำระเงิน/รายละเอียดใบจอง
 *
 * ⚠ serviceType ที่ส่งเข้ามาต้องมาจาก bookingServiceType() ตัวเดียวกับที่ payload ใช้
 */

/** เรตต่อชั่วโมงตามรหัส bookings.service_type — ตรงกับ service_price_catalog ของ BE */
export const SERVICE_HOURLY_RATES: Readonly<Record<string, number>> = {
  general_care: 300,
  bedridden_care: 300,
  physiotherapy: 800,
  medication: 300,
  companion: 300,
};

/** ยังไม่เลือกบริการ / รหัสที่ไม่มีในตาราง */
export const DEFAULT_HOURLY_RATE = 300;
export const ESTIMATED_PLATFORM_FEE_PERCENT = 10;

export interface BookingCostEstimate {
  hourlyRate: number;
  hours: number;
  /** ค่าดูแล = เรต × ชั่วโมง */
  serviceCost: number;
  platformFee: number;
  total: number;
}

export function hourlyRateFor(serviceType: string | null | undefined): number {
  return (serviceType ? SERVICE_HOURLY_RATES[serviceType] : undefined) ?? DEFAULT_HOURLY_RATE;
}

export function estimateBookingCost(
  hours: number,
  serviceType: string | null | undefined,
): BookingCostEstimate {
  const hourlyRate = hourlyRateFor(serviceType);
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 0;
  const serviceCost = Math.round(hourlyRate * safeHours);
  const platformFee = Math.round(serviceCost * (ESTIMATED_PLATFORM_FEE_PERCENT / 100));
  return {
    hourlyRate,
    hours: safeHours,
    serviceCost,
    platformFee,
    total: serviceCost + platformFee,
  };
}
