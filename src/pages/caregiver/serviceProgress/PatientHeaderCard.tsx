import { useNavigate } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon';

export interface PatientHeaderCardProps {
  patientName: string;
  careRecipientName?: string | null;
  /** Anchors to the "ดูโปรไฟล์ผู้รับบริการ" ExpandableSection further down the page. */
  profileSectionId: string;
}

/** Patient identity card with real actions only — a "โทร" button is intentionally omitted here
 * since Booking has no direct patient phone field (only dayOfContact*, already surfaced by
 * EmergencyContactCard); a "อาการ/เงื่อนไข" condition tag is likewise omitted, since no such
 * data exists on Booking — showing either would mean faking data that isn't there. */
export default function PatientHeaderCard({ patientName, careRecipientName, profileSectionId }: Readonly<PatientHeaderCardProps>) {
  const navigate = useNavigate();

  function scrollToProfile() {
    document.getElementById(profileSectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: 'linear-gradient(135deg, #168AAD 0%, #52B69A 100%)' }}
        >
          <span className="text-lg font-bold" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {patientName.charAt(0) || '?'}
          </span>
        </span>
        <div>
          <p className="text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {patientName}
          </p>
          <p className="text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {careRecipientName ? `สำหรับ: ${careRecipientName}` : 'สำหรับตัวเอง'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={() => navigate('/messages')}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] text-xs font-bold text-[#575859] transition hover:bg-[#F7F8F9] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <Icon name="chat" size="small" color="#575859" />
          ส่งข้อความ
        </button>
        <button
          type="button"
          onClick={scrollToProfile}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#E5E7EB] text-xs font-bold text-[#575859] transition hover:bg-[#F7F8F9] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <Icon name="person" size="small" color="#575859" />
          ดูโปรไฟล์
        </button>
      </div>
    </div>
  );
}
