import { caregiverEarnings, formatBaht } from '../../../lib/caregiverEarnings';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

export interface EarningsBreakdownProps {
  /** ราคาบริการ (booking.price = estimated_cost ไม่รวมค่าธรรมเนียมที่ลูกค้าจ่ายเพิ่ม) */
  price: number;
  /** ยอดโอนจริงถ้ามีแล้ว — ทำให้ตัวเลขเลิกเป็น "ประมาณการ" */
  payoutAmount?: number | null;
}

/**
 * รายได้ของงานนี้ — ราคาบริการเต็ม ค่าธรรมเนียมแพลตฟอร์มลูกค้าเป็นผู้จ่าย ไม่หักจากผู้ดูแล
 *
 * ยอดที่แสดง = ราคาบริการ (booking.price) หรือยอดโอนจริงถ้ามี (ดู lib/caregiverEarnings)
 */
export default function EarningsBreakdown({ price, payoutAmount }: Readonly<EarningsBreakdownProps>) {
  const earnings = caregiverEarnings(price, payoutAmount);

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-[#1A1A1A]" style={FONT}>
          รายได้ที่คุณได้รับ
        </span>
        <span className="text-lg font-bold text-[#009265]" style={FONT}>
          {formatBaht(earnings.net)}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-[#8A8C8E]" style={FONT}>
        {earnings.isActual
          ? 'ยอดนี้เป็นยอดโอนจริงที่ระบบบันทึกไว้แล้ว'
          : 'เป็นยอดประมาณการ — ระบบจะโอนหลังปิดงานและพ้นระยะตรวจสอบ ยอดจริงยืนยันเมื่อโอนเงิน'}
      </p>
    </div>
  );
}
