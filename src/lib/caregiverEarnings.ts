/**
 * รายได้สุทธิของผู้ดูแล — คำนวณให้ตรงกับ backend
 *
 * ที่มาของสูตร (payment.service.ts → transferPaymentToCaregiver):
 *   transferAmount = capturedAmount × (1 − PLATFORM_FEE_PERCENT / 100)
 * โดย capturedAmount = durationHours × hourlyRate ซึ่งเป็นค่าเดียวกับ bookings.estimated_cost
 * (booking.service.ts: estimatedCost = caregiver.hourlyRate × dto.durationHours)
 * → ยอดที่ผู้รับบริการจ่าย = ค่าบริการของผู้ดูแลตรง ๆ ไม่มีการบวกค่าธรรมเนียมเพิ่มบนยอด
 *   แล้วแพลตฟอร์มหักค่าธรรมเนียมจากยอดนั้นก่อนโอนให้ผู้ดูแล
 *
 * ⚠️ PLATFORM_FEE_PERCENT เป็น env ฝั่ง backend ไม่ได้ส่งมาทาง GraphQL
 *    ค่าที่ใช้ตรงนี้จึงเป็น "ค่า default เดียวกับ backend" (10) ไม่ใช่ค่าที่อ่านมาจริง
 *    ผลลัพธ์จึงเป็น "ประมาณการ" เสมอจนกว่าจะมี payout จริง — ดู isActual
 *    ถ้าวันหนึ่งแก้ค่านี้บน production ต้องส่งลงมาทาง API แล้วเลิกใช้ค่าคงที่นี้
 */
export const PLATFORM_FEE_PERCENT = 10;

export interface CaregiverEarnings {
  /** ยอดที่ผู้รับบริการชำระสำหรับงานนี้ */
  gross: number;
  /** ค่าธรรมเนียมแพลตฟอร์มที่ถูกหัก */
  fee: number;
  /** ยอดที่ผู้ดูแลได้รับจริงหลังหักค่าธรรมเนียม */
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
 * @param gross        ยอดที่ผู้รับบริการชำระ (booking.price / estimatedCost)
 * @param payoutAmount ยอดโอนจริงถ้าระบบบันทึกไว้แล้ว — ถ้ามี จะใช้ค่านี้แทนการคำนวณ
 */
export function caregiverEarnings(gross: number, payoutAmount?: number | null): CaregiverEarnings {
  if (payoutAmount != null) {
    return {
      gross,
      fee: round2(Math.max(0, gross - payoutAmount)),
      net: payoutAmount,
      isActual: true,
      feePercent: PLATFORM_FEE_PERCENT,
    };
  }

  const net = round2(gross * (1 - PLATFORM_FEE_PERCENT / 100));
  return { gross, fee: round2(gross - net), net, isActual: false, feePercent: PLATFORM_FEE_PERCENT };
}

/** "฿1,050" · "฿945.50" — ตัดทศนิยม .00 ที่ไม่มีความหมายออก */
export function formatBaht(value: number): string {
  return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
