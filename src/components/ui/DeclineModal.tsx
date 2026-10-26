import React, { useState } from 'react';
import Icon from './Icon';

interface DeclineModalProps {
  readonly isOpen: boolean;
  readonly booking: {
    readonly id: string;
    readonly patientName: string;
  } | null;
  readonly onClose: () => void;
  readonly onSubmit: (reason: string) => void;
}

export const DeclineModal: React.FC<DeclineModalProps> = ({
  isOpen,
  booking,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !booking) return null;

  const handleSubmitLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('กรุณากรอกเหตุผลที่ปฏิเสธการจอง');
      return;
    }
    onSubmit(reason.trim());
    setReason('');
    setError('');
  };

  const handleCloseLocal = () => {
    setReason('');
    setError('');
    onClose();
  };

  // PYG-723: เดิมใช้ขนาด pixel ตายตัวจาก Figma (กว้าง 500px) → ล้นจอมือถือ
  //   ตอนนี้การ์ดกว้างเต็มจอแต่ไม่เกิน 500px เว้นขอบ 16px และสูงตามเนื้อหา
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 transition-opacity">
      <form
        onSubmit={handleSubmitLocal}
        className="flex flex-col w-full max-w-[500px] max-h-full overflow-y-auto p-5 sm:p-7 bg-white shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_10px_10px_-5px_rgba(0,0,0,0.04)] rounded-[20px]"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {/* Header: Circular Icon, Title, Subtitle */}
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center justify-center w-14 h-14 mb-3 shrink-0 bg-[#FEF2F2] rounded-full">
            <Icon name="close" color="#DC2626" style={{ fontSize: '32px', lineHeight: '32px' }} />
          </div>
          <h2 className="m-0 font-bold text-[18px] leading-[27px] text-[#1A1A1A]">ปฏิเสธคำขอจองนี้?</h2>
          <p className="m-0 pt-1.5 font-normal text-[13px] leading-[20px] text-[#575859] break-words">
            กรุณาระบุเหตุผลการปฏิเสธเพื่อแจ้งให้คุณ <span className="inline-block font-bold text-[#575859]">{booking.patientName}</span>
          </p>
        </div>

        {/* Reason */}
        <label className="flex flex-col gap-1.5 mt-5">
          <span className="font-bold text-[13px] leading-[20px] text-[#575859]">เหตุผลการปฏิเสธ *</span>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setError('');
            }}
            placeholder="เช่น ติดภารกิจอื่นในวันดังกล่าว / ตารางเวลาชนกัน"
            className="box-border w-full h-[90px] min-h-[90px] p-3 bg-white border-[0.8px] border-[#E0E2E5] rounded-[8px] text-[14px] leading-[21px] font-medium text-[#1A1A1A] placeholder-[rgba(26,26,26,0.5)] focus:outline-none focus:border-[#DC2626] resize-none"
          />
          {error && (
            <span className="flex items-center gap-1 pl-1 text-[11px] text-red-500 font-semibold">
              <Icon name="error" className="text-sm text-red-500" style={{ fontSize: '14px' }} />
              {error}
            </span>
          )}
        </label>

        {/* Buttons: มือถือกว้างเท่ากันเต็มแถว, จอใหญ่ชิดขวา */}
        <div className="flex gap-3 mt-5 sm:justify-end">
          <button
            type="button"
            onClick={handleCloseLocal}
            className="flex-1 sm:flex-none flex items-center justify-center h-10 px-3 sm:px-[18px] whitespace-nowrap bg-white border-[0.8px] border-[#E0E2E5] rounded-[8px] cursor-pointer hover:bg-gray-50 transition-colors font-semibold text-[13px] leading-[20px] text-[#575859]"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className={`flex-1 sm:flex-none flex items-center justify-center h-10 px-3 sm:px-[18px] whitespace-nowrap bg-[#DC2626] rounded-[8px] font-semibold text-[13px] leading-[20px] text-white transition-all duration-200 ${
              reason.trim()
                ? 'opacity-100 hover:bg-[#b91c1c] active:bg-[#991b1b] cursor-pointer shadow-sm'
                : 'opacity-55 cursor-not-allowed'
            }`}
            disabled={!reason.trim()}
          >
            ยืนยันปฏิเสธงาน
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeclineModal;
