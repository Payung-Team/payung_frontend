import React from 'react';
import Icon from './Icon';
import { getPatientDisplayName, type Booking } from '../../pages/caregiver/CaregiverBookings';

interface AcceptBookingModalProps {
  readonly isOpen: boolean;
  readonly booking: Booking | null;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly formatThaiDate: (dateStr: string) => string;
}

// PYG-723: เดิมใช้ขนาด pixel ตายตัวจาก Figma (กว้าง 500px) → ล้นจอมือถือ
//   ตอนนี้การ์ดกว้างเต็มจอแต่ไม่เกิน 500px เว้นขอบ 16px และสูงตามเนื้อหา
function DetailRow({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[13px] leading-[20px]">
      <span className="shrink-0 font-normal text-[#8A8C8E]">{label}</span>
      <span className="min-w-0 break-words text-right">{children}</span>
    </div>
  );
}

export const AcceptBookingModal: React.FC<AcceptBookingModalProps> = ({
  isOpen,
  booking,
  onClose,
  onConfirm,
  formatThaiDate,
}) => {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity">
      <div
        className="flex flex-col w-full max-w-[500px] max-h-full overflow-y-auto p-5 sm:p-7 bg-white shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_10px_10px_-5px_rgba(0,0,0,0.04)] rounded-[20px]"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {/* Header: Icon, Title, Subtitle */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-14 h-14 mb-3 shrink-0 bg-[#E6F5ED] rounded-full">
            <Icon name="check" color="#52B69A" style={{ fontSize: '32px', lineHeight: '32px' }} />
          </div>
          <h2 className="m-0 font-bold text-[18px] leading-[27px] text-[#1A1A1A]">ตอบรับคำขอจองนี้?</h2>
          <p className="m-0 pt-1 font-normal text-[13px] leading-[20px] text-[#8A8C8E]">ยืนยันเวลาจองของคุณกับคนไข้</p>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-2 mt-5 p-4 bg-[#F6FAF9] rounded-[12px]">
          <DetailRow label="คนไข้:">
            <span className="font-bold text-[#1A1A1A]">{getPatientDisplayName(booking)}</span>
          </DetailRow>
          <DetailRow label="วันที่ดูแล:">
            <span className="font-semibold text-[#1A1A1A]">{formatThaiDate(booking.bookingDate)}</span>
          </DetailRow>
          {/* PYG-526: ป๊อปอัปนี้ไม่มีแถวระยะเวลา → "09:00 – 13:00 (4 ชม.)" */}
          <DetailRow label="เวลา:">
            <span className="font-semibold text-[#1A1A1A]">{booking.timeRangeText}</span>
          </DetailRow>
          <DetailRow label="รายได้โดยประมาณ:">
            <span className="font-bold text-[#059669]">฿{booking.price.toLocaleString()}</span>
          </DetailRow>
        </div>

        {/* Buttons: มือถือกว้างเท่ากันเต็มแถว, จอใหญ่ชิดขวา */}
        <div className="flex gap-3 mt-5 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none flex items-center justify-center h-10 px-3 sm:px-[18px] whitespace-nowrap bg-white border-[0.8px] border-[#E0E2E5] rounded-[8px] cursor-pointer hover:bg-gray-50 transition-colors font-semibold text-[13px] leading-[20px] text-[#575859]"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 sm:flex-none flex items-center justify-center h-10 px-3 sm:px-5 whitespace-nowrap bg-[#009265] rounded-[8px] cursor-pointer hover:bg-[#007b55] transition-colors shadow-sm font-semibold text-[14px] leading-[21px] text-white"
          >
            ใช่, ยอมรับคำขอ
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcceptBookingModal;
