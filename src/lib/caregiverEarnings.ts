/**
 * รายได้ของผู้ดูแล — ตรงกับ backend
 *
 * ค่าธรรมเนียมแพลตฟอร์มลูกค้าเป็นผู้จ่ายเพิ่มบนราคาบริการตอนตัดบัตร ไม่มีการหักจากผู้ดูแล
 * ผู้ดูแลจึงได้ราคาบริการเต็ม = bookings.estimated_cost
 * (payment.service.ts → transferPaymentToCaregiver, payout.service.ts)
 */
export interface CaregiverEarnings {
  /** ยอดที่ผู้ดูแลได้รับ */
  net: number;
  /** true = ตัวเลขจาก payout จริงที่ระบบบันทึกไว้ · false = ประมาณการ (ราคาบริการ) */
  isActual: boolean;
}

/**
 * @param price        ราคาบริการ (booking.price / estimatedCost)
 * @param payoutAmount ยอดโอนจริงถ้าระบบบันทึกไว้แล้ว — ถ้ามี จะใช้ค่านี้แทน
 */
export function caregiverEarnings(price: number, payoutAmount?: number | null): CaregiverEarnings {
  return payoutAmount != null
    ? { net: payoutAmount, isActual: true }
    : { net: price, isActual: false };
}

/** "฿1,050" · "฿945.50" — ตัดทศนิยม .00 ที่ไม่มีความหมายออก */
export function formatBaht(value: number): string {
  return `฿${value.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
