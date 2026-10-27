/**
 * รายได้สุทธิของผู้ดูแล — คำนวณให้ตรงกับ backend
 *
 * ที่มาของสูตร:
 *   - payment.service.ts → createPayment: ลูกค้าจ่าย = estimated_cost + platformFee
 *     (platformFee = estimated_cost × PLATFORM_FEE_PERCENT / 100 — เก็บเพิ่มจากลูกค้า)
 *   - payout.service.ts → createFromCompletedBooking: fee = max(gross − estimated_cost, 0) · net = gross − fee
 * → ผู้ดูแลได้ "ราคาบริการเต็ม" (bookings.estimated_cost) ไม่ถูกหักค่าธรรมเนียม
 *   ตัวอย่าง: ค่าบริการ 300 → ลูกค้าจ่าย 330 → ผู้ดูแลได้ 300
 *
 * ⚠️ เดิมสูตรนี้เอา estimated_cost ไป × (1 − 10%) อีกรอบ → ผู้ดูแลเห็น 270 ทั้งที่ได้จริง 300
 *    (ค่าธรรมเนียมถูกคิดซ้ำสองครั้ง) — input ของฟังก์ชันนี้คือราคาบริการ ไม่ใช่ยอดที่ลูกค้าจ่าย
 *
 * ⚠️ PLATFORM_FEE_PERCENT เป็น env ฝั่ง backend ไม่ได้ส่งมาทาง GraphQL
 *    ค่าที่ใช้ตรงนี้จึงเป็น "ค่า default เดียวกับ backend" (10) ไม่ใช่ค่าที่อ่านมาจริง
 *    ใช้เฉพาะตอนยังไม่มี paidAmount (ยังไม่ชำระ) — ชำระแล้วใช้ยอดจริงจาก backend
 *    ถ้าวันหนึ่งแก้ค่านี้บน production ต้องส่งลงมาทาง API แล้วเลิกใช้ค่าคงที่นี้
 */
export const PLATFORM_FEE_PERCENT = 10;

export interface CaregiverEarnings {
  /** ยอดที่ผู้รับบริการชำระสำหรับงานนี้ (ค่าบริการ + ค่าธรรมเนียมแพลตฟอร์ม) */
  gross: number;
  /** ค่าธรรมเนียมแพลตฟอร์ม (ลูกค้าจ่ายเพิ่ม ไม่ได้หักจากผู้ดูแล) */
  fee: number;
  /** ยอดที่ผู้ดูแลได้รับจริง = ราคาบริการ */
  net: number;
  /** true = ตัวเลขจาก payout จริงที่ระบบบันทึกไว้ · false = ประมาณการจากสูตร */
  isActual: boolean;
  feePercent: number;
}

/** ปัดเป็นทศนิยม 2 ตำแหน่ง — backend ทำงานในหน่วยสตางค์ ยอดจึงละเอียดได้ถึงสองตำแหน่ง */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * สูตรเดียวกับ backend (payout.service.ts → createFromCompletedBooking):
 *   gross = payments.amount
 *   fee   = max(gross − estimated_cost, 0)
 *   net   = gross − fee                      (= min(estimated_cost, gross))
 *
 * @param servicePrice ราคาบริการของใบจอง (booking.price = estimatedCost) — ยังไม่รวมค่าธรรมเนียม
 * @param payoutAmount ยอดโอนจริงถ้าระบบบันทึกไว้แล้ว — ถ้ามี ใช้เป็น net แทนการคำนวณ
 * @param paidAmount   ยอดที่ลูกค้าจ่ายจริง (payments.amount) — ยังไม่ชำระ (null) จะประมาณ
 *                     ด้วยสูตรตอนตัดบัตร: estimated_cost + estimated_cost × PLATFORM_FEE_PERCENT%
 */
export function caregiverEarnings(
  servicePrice: number,
  payoutAmount?: number | null,
  paidAmount?: number | null,
): CaregiverEarnings {
  const gross = paidAmount ?? round2(servicePrice + round2(servicePrice * (PLATFORM_FEE_PERCENT / 100)));
  const fee = round2(Math.max(gross - servicePrice, 0));
  const net = payoutAmount ?? round2(gross - fee);

  return {
    gross,
    // payout จริงเป็นตัวตั้ง → ค่าธรรมเนียม = ส่วนต่างกับยอดที่ลูกค้าจ่าย (ตรงกับ payouts.platform_fee)
    fee: payoutAmount != null ? round2(Math.max(0, gross - payoutAmount)) : fee,
    net,
    isActual: payoutAmount != null,
    feePercent: PLATFORM_FEE_PERCENT,
  };
}

/** "฿1,050" · "฿945.50" — ตัดทศนิยม .00 ที่ไม่มีความหมายออก */
export function formatBaht(value: number): string {
  return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
