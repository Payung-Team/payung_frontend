/**
 * รายได้สุทธิของผู้ดูแล — สูตรเดียวที่ทุกหน้าของผู้ดูแลใช้
 *
 *   ค่าธรรมเนียมแพลตฟอร์ม = ราคาบริการ × PLATFORM_FEE_PERCENT%
 *   ยอดที่ลูกค้าจ่าย        = ราคาบริการ + ค่าธรรมเนียมแพลตฟอร์ม
 *   รายได้สุทธิของผู้ดูแล   = ยอดที่ลูกค้าจ่าย − ค่าธรรมเนียมแพลตฟอร์ม (= ราคาบริการ)
 *   ตัวอย่าง: ค่าบริการ 1,000 → ลูกค้าจ่าย 1,100 → ผู้ดูแลได้ 1,000
 *
 * คิดจากราคาบริการของใบจอง (booking.price = estimated_cost) อย่างเดียว ไม่อ่านยอดที่ตัดบัตรผ่าน Omise
 * (payments.amount) — ยอดนั้นเป็นเรื่องฝั่งผู้สูงอายุ ตัวเลขของผู้ดูแลจึงเท่ากันทุกหน้าตั้งแต่ตอนรับงาน
 * ตรงกับ backend: payment.service.ts เก็บค่าธรรมเนียมเพิ่มจากลูกค้า และ payout.service.ts
 * → createFromCompletedBooking โอนให้ผู้ดูแล = gross − (gross − estimated_cost)
 *
 * ⚠️ PLATFORM_FEE_PERCENT เป็น env ฝั่ง backend ไม่ได้ส่งมาทาง GraphQL
 *    ค่าที่ใช้ตรงนี้เป็น "ค่า default เดียวกับ backend" (10) ใช้แค่แสดงยอดที่ลูกค้าจ่าย/ค่าธรรมเนียม
 *    ไม่มีผลกับรายได้สุทธิของผู้ดูแล ถ้าแก้ค่านี้บน production ต้องส่งลงมาทาง API
 */
export const PLATFORM_FEE_PERCENT = 10;

export interface CaregiverEarnings {
  /** ยอดที่ผู้รับบริการจ่ายสำหรับงานนี้ (ค่าบริการ + ค่าธรรมเนียมแพลตฟอร์ม) */
  gross: number;
  /** ค่าธรรมเนียมแพลตฟอร์ม (ลูกค้าจ่ายเพิ่ม ไม่ได้หักจากผู้ดูแล) */
  fee: number;
  /** รายได้สุทธิของผู้ดูแล = gross − fee */
  net: number;
  /** true = ระบบโอนเงินงานนี้แล้ว (net คือยอดโอนจริง) */
  isActual: boolean;
  feePercent: number;
}

/** ปัดเป็นทศนิยม 2 ตำแหน่ง — backend ทำงานในหน่วยสตางค์ ยอดจึงละเอียดได้ถึงสองตำแหน่ง */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * @param servicePrice ราคาบริการของใบจอง (booking.price = estimatedCost) — ยังไม่รวมค่าธรรมเนียม
 * @param payoutAmount ยอดที่โอนให้ผู้ดูแลแล้ว (ถ้ามี) — ใช้เป็นรายได้สุทธิแทนสูตร เพราะเป็นเงินที่ได้จริง
 */
export function caregiverEarnings(servicePrice: number, payoutAmount?: number | null): CaregiverEarnings {
  const fee = round2(servicePrice * (PLATFORM_FEE_PERCENT / 100));
  const gross = round2(servicePrice + fee);
  const net = payoutAmount ?? round2(gross - fee);

  return {
    gross,
    fee,
    net,
    isActual: payoutAmount != null,
    feePercent: PLATFORM_FEE_PERCENT,
  };
}

/** "฿1,050" · "฿945.50" — ตัดทศนิยม .00 ที่ไม่มีความหมายออก */
export function formatBaht(value: number): string {
  return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
