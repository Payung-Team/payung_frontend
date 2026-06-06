import React, { useState } from 'react';
import Icon from './Icon';

interface CancelAcceptanceModalProps {
  readonly isOpen: boolean;
  readonly booking: {
    readonly id: string;
    readonly patientName: string;
  } | null;
  readonly onClose: () => void;
  readonly onSubmit: (reason: string) => void;
}

export const CancelAcceptanceModal: React.FC<CancelAcceptanceModalProps> = ({
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
      setError('กรุณากรอกเหตุผลที่ยกเลิกการตอบรับ');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none bg-black/50 transition-opacity">
      <div className="relative w-[500px] max-w-[500px] h-[372.5px] mx-auto p-0 flex items-center justify-center">
        {/* Modal Content / Form Container */}
        <form
          onSubmit={handleSubmitLocal}
          className="box-border flex flex-col items-start p-[28px] w-[500px] max-w-[500px] h-[372.5px] bg-white shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_10px_10px_-5px_rgba(0,0,0,0.04)] rounded-[20px] overflow-hidden"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {/* Header Layout: Circular Icon, Title, Subtitle */}
          <div className="flex flex-col items-center p-0 w-[444px] h-[120.5px] self-stretch">
            {/* Circular Close Icon Container */}
            <div className="flex flex-col items-start pb-3 w-[56px] h-[68px]">
              <div className="flex flex-row justify-center items-center p-0 w-[56px] h-[56px] bg-[#FEF2F2] rounded-[28px]">
                <Icon
                  name="close"
                  color="#DC2626"
                  className="text-[32px] font-normal leading-[32px] text-center"
                  style={{ fontSize: '32px', lineHeight: '32px' }}
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <h2 className="font-bold text-[18px] leading-[27px] text-[#1A1A1A] text-center self-stretch m-0">
              ยกเลิกการตอบรับงานนี้?
            </h2>
            <div className="flex flex-col items-center pt-1.5 w-[325px] h-[25.5px]">
              <p className="font-normal text-[13px] leading-[20px] text-[#575859] text-center m-0">
                กรุณาระบุเหตุผลการยกเลิกเพื่อแจ้งให้คุณ <span className="font-bold text-[#575859]">{booking.patientName}</span>
              </p>
            </div>
          </div>

          {/* Text Area Section */}
          <div className="flex flex-col items-start pt-5 w-[444px] h-[136px] self-stretch">
            <div className="flex flex-col items-start p-0 gap-1.5 w-[444px] h-[116px] self-stretch relative">
              <div className="flex flex-col items-start p-0 w-[444px] h-[20px] self-stretch">
                <span className="font-bold text-[13px] leading-[20px] text-[#575859]">
                  เหตุผลการยกเลิก *
                </span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (e.target.value.trim()) setError('');
                }}
                placeholder="เช่น เกิดเหตุฉุกเฉินส่วนตัว / ติดภารกิจด่วนกะทันหัน"
                className="box-border flex flex-col items-start p-3 w-[444px] h-[90px] min-h-[90px] bg-white border-[0.8px] border-[#E0E2E5] rounded-[8px] self-stretch text-[14px] leading-[21px] font-medium text-[#1A1A1A] placeholder-[rgba(26,26,26,0.5)] focus:outline-none focus:border-[#DC2626] resize-none"
              />
              {error && (
                <p className="text-[11px] text-red-500 font-semibold flex items-center gap-1 absolute bottom-[-18px] left-1">
                  <Icon name="error" className="text-sm text-red-500" style={{ fontSize: '14px' }} />
                  {error}
                </p>
              )}
            </div>
          </div>

          {/* Footer Buttons Section */}
          <div className="flex flex-col items-start pt-5 w-[444px] h-[60px] self-stretch">
            <div className="flex flex-row justify-end items-start p-0 gap-3 w-[444px] h-[40px] self-stretch">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleCloseLocal}
                className="box-border flex flex-row justify-center items-center px-[18px] py-0 gap-[6px] h-[40px] bg-white border-[0.8px] border-[#E0E2E5] rounded-[8px] cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-[13px] leading-[20px] text-center text-[#575859]">
                  ยกเลิก
                </span>
              </button>

              {/* Confirm Button */}
              <button
                type="submit"
                className={`flex flex-row justify-center items-center px-[18px] py-0 gap-[6px] h-[40px] bg-[#DC2626] rounded-[8px] text-white transition-all duration-200 ${
                  reason.trim()
                    ? 'opacity-100 hover:bg-[#b91c1c] active:bg-[#991b1b] cursor-pointer shadow-sm'
                    : 'opacity-55 cursor-not-allowed'
                }`}
                disabled={!reason.trim()}
              >
                <span className="font-semibold text-[13px] leading-[20px] text-center text-white">
                  ยืนยันยกเลิกตอบรับ
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelAcceptanceModal;
