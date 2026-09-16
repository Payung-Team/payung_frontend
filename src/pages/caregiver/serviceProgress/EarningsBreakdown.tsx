import { caregiverEarnings, formatBaht } from '../../../lib/caregiverEarnings';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

export interface EarningsBreakdownProps {
  /** ยอดที่ผู้รับบริการชำระ (booking.price) */
  price: number;
  /** ยอดโอนจริงถ้ามีแล้ว — ทำให้ตัวเลขเลิกเป็น "ประมาณการ" */
  payoutAmount?: number | null;
}

/**
 * รายได้ของงานนี้แบบเห็นที่มาที่ไป — ยอดที่ลูกค้าจ่าย หักค่าธรรมเนียม เหลือสุทธิเท่าไร
 *
 * เดิมทั้งหน้าเช็คอินและหน้าระหว่างทำงานโชว์ booking.price ห้วน ๆ ว่า "รายได้"
 * ซึ่งเป็นยอดที่ผู้รับบริการจ่าย ไม่ใช่ยอดที่ผู้ดูแลได้รับ (ดู lib/caregiverEarnings)
 */
export default function EarningsBreakdown({ price, payoutAmount }: Readonly<EarningsBreakdownProps>) {
  const earnings = caregiverEarnings(price, payoutAmount);

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#FAFBFC] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[#575859]" style={FONT}>
          ค่าบริการที่ผู้รับบริการชำระ
        </span>
        <span className="text-sm font-semibold text-[#1A1A1A]" style={FONT}>
          {formatBaht(earnings.gross)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-3">
        <span className="text-xs text-[#575859]" style={FONT}>
          ค่าธรรมเนียมแพลตฟอร์ม ({earnings.feePercent}%)
        </span>
        <span className="text-sm font-semibold text-[#DC2626]" style={FONT}>
          −{formatBaht(earnings.fee)}
        </span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-dashed border-[#E0E2E5] pt-2.5">
        <span className="text-sm font-bold text-[#1A1A1A]" style={FONT}>
          รายได้สุทธิที่คุณได้รับ
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
