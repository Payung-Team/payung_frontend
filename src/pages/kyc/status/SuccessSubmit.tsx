import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/ui/Icon';

export default function KycSuccess() {
  const navigate = useNavigate();

  // For demonstration, use current date if not available
  const submittedDate = new Date().toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).replace(' พ.ศ.', '');

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8F9FB] flex items-center justify-center p-12">
      <div
        className="w-full max-w-[720px] bg-white rounded-[24px] border border-[#F1F5F9] p-16 flex flex-col items-center justify-center gap-8"
        style={{
          boxShadow: '0px 12px 28px -6px rgba(15, 23, 43, 0.06), 0px 1px 2px rgba(15, 23, 43, 0.04)',
        }}
      >
        {/* Success Icon */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#E0F6F1] rounded-full" />
          <div className="absolute inset-4 bg-[#0F766E] rounded-full flex items-center justify-center">
            <Icon name="check" color="white" style={{ fontSize: '40px' }} />
          </div>
        </div>

        {/* Text Coverage */}
        <div className="flex flex-col items-center gap-2.5 text-center px-8">
          <h1 className="text-[32px] font-bold text-[#0F172A] leading-[42px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ส่งข้อมูลเรียบร้อย
          </h1>
          <p className="text-[16px] text-[#64748B] leading-[24px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ทีมงานจะตรวจสอบภายใน 1–2 วันทำการ <br />เราจะแจ้งผลผ่านอีเมลและในแอป Payung
          </p>
        </div>

        {/* Status Badge */}
        <div className="bg-[#FFEDD5] border border-[#F97316] rounded-xl px-5 py-3.5 flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-[#F97316] rounded-full" />
          <span className="text-[14px] font-semibold text-[#9A4311]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            สถานะ: รอยันยืน
          </span>
          <div className="w-px h-4 bg-[#F97316] opacity-40 mx-1" />
          <span className="text-[13px] font-medium text-[#9A4311]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ยื่นเมื่อ {submittedDate}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3 w-full max-w-[320px]">
          <button
            onClick={() => navigate('/kyc/status')}
            className="w-full h-[47px] bg-[#0F766E] text-white rounded-xl font-semibold text-[15px] flex items-center justify-center shadow-lg shadow-[#0F1181E] hover:bg-[#0D655E] transition-all cursor-pointer"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ดูสถานะการยืนยัน →
          </button>
        </div>
      </div>
    </div>
  );
}
