import Icon from './Icon';

export interface RejectionReasonItem {
  title: string;
  detail?: string;
  documentType?: string;
}

interface KycRejectionListProps {
  rejectionReasons: RejectionReasonItem[];
  rejectedReason?: string;
}

export default function KycRejectionList({ rejectionReasons, rejectedReason }: KycRejectionListProps) {
  return (
    <div className="w-full mb-10">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-[11px] font-bold tracking-[0.08em] text-[#94A3B8] uppercase" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>รายการที่ต้องแก้ไข</span>
        <div className="bg-[#FEF2F2] px-2.5 py-0.5 rounded-full">
          <span className="text-[11px] font-bold text-[#DC2626]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{rejectionReasons.length} รายการ</span>
        </div>
      </div>

      <div className="space-y-3">
        {rejectionReasons.length > 0 ? rejectionReasons.map((reason, index) => (
          <div key={index} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-[16px] hover:border-gray-300 transition-all cursor-pointer group">
            <div className="w-[26px] h-[26px] bg-[#FEF2F2] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-bold text-[#DC2626]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{index + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#0F172A] mb-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {reason.documentType || reason.title}
              </p>
              <p className="text-[11.5px] text-[#94A3B8] leading-[16px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {reason.documentType ? reason.title : ''}{reason.documentType && reason.detail ? ' — ' : ''}{reason.detail}
              </p>
            </div>
            <Icon name="chevron_right" color="#CBD5E1" style={{ fontSize: '18px' }} className="group-hover:text-[#94A3B8] transition-colors" />
          </div>
        )) : (
          <div className="flex items-center gap-4 p-4 bg-white border border-[#F1F5F9] rounded-[16px]">
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-[#0F172A] mb-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>เหตุผลการปฏิเสธ</p>
              <p className="text-[11.5px] text-[#94A3B8] leading-[16px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {rejectedReason || 'กรุณาตรวจสอบข้อมูลและเอกสารทั้งหมดอีกครั้ง'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
