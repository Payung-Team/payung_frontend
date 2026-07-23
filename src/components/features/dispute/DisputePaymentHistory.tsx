import DisputeCard from './DisputeCard';
import type { PaymentEvent } from './disputeDetailMock';
import { formatTHB, formatThaiDate } from './disputeMeta';

interface DisputePaymentHistoryProps {
  payments: PaymentEvent[];
}

// PYG-321 — ประวัติการชำระเงินที่เกี่ยวกับคำร้อง
export default function DisputePaymentHistory({ payments }: DisputePaymentHistoryProps) {
  return (
    <DisputeCard title="ประวัติการชำระเงิน">
      {payments.length === 0 ? (
        <p className="text-sm text-[#8A8C8E]">ไม่มีรายการชำระเงิน</p>
      ) : (
        <div className="divide-y divide-[#F0F1F3] rounded-xl border border-[#E5E7EB]">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="text-[13px] text-[#1A1A1A]">{payment.label}</p>
                <p className="font-[Inter] text-[11px] text-[#C6C8CB]">{formatThaiDate(payment.date)}</p>
              </div>
              <span className="shrink-0 font-[Inter] text-[13px] font-bold text-[#1A1A1A]">
                {formatTHB(payment.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </DisputeCard>
  );
}
