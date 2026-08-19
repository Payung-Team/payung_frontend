export interface PatientSummaryCardProps {
  patientName: string;
  careRecipientName?: string;
}

/** Matches the Figma "ผู้รับบริการ" card on the check-in screen. */
export default function PatientSummaryCard({ patientName, careRecipientName }: Readonly<PatientSummaryCardProps>) {
  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <h2 className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        ผู้รับบริการ
      </h2>
      <div className="mt-4 flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: 'linear-gradient(135deg, #168AAD 0%, #52B69A 100%)' }}
        >
          <span className="text-lg font-bold" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {patientName?.charAt(0) ?? 'พ'}
          </span>
        </span>
        <div>
          <p className="text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {patientName}
          </p>
          <p className="mt-0.5 text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {careRecipientName ? `สำหรับ: ${careRecipientName}` : 'สำหรับตัวเอง'}
          </p>
        </div>
      </div>
    </div>
  );
}
