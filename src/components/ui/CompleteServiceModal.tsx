import React from 'react';
import Icon from './Icon';

interface CompleteServiceModalProps {
  isOpen: boolean;
  isLoading: boolean;
  amount: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const CompleteServiceModal: React.FC<CompleteServiceModalProps> = ({
  isOpen,
  isLoading,
  amount,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 transition-opacity">
      <div
        className="box-border flex flex-col items-center w-full max-w-[460px] bg-white shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_10px_10px_-5px_rgba(0,0,0,0.04)] rounded-[20px] overflow-hidden p-7"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 bg-[#FFF7ED] rounded-full mb-4">
          <Icon
            name="task_alt"
            className="text-[32px] text-[#F59E0B]"
            style={{ fontSize: '32px' }}
          />
        </div>

        {/* Title */}
        <h2 className="font-bold text-lg leading-7 text-[#1A1A1A] text-center m-0">
          ยืนยันว่าบริการเสร็จสิ้นแล้ว?
        </h2>

        {/* Body */}
        <p className="font-normal text-[13px] leading-5 text-[#8A8C8E] text-center mt-2 mb-0">
          เมื่อยืนยันแล้ว ระบบจะเรียกเก็บเงิน{' '}
          <span className="font-bold text-[#059669]">฿{amount.toLocaleString()}</span>{' '}
          และไม่สามารถยกเลิกได้
        </p>

        {/* Warning callout */}
        <div className="w-full mt-5 flex flex-row items-start gap-2.5 p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl">
          <Icon
            name="warning"
            className="text-[18px] text-[#D97706] flex-shrink-0 mt-0.5"
          />
          <span className="font-normal text-xs leading-[18px] text-[#92400E]">
            การดำเนินการนี้ไม่สามารถย้อนกลับได้ กรุณาตรวจสอบให้แน่ใจก่อนยืนยัน
          </span>
        </div>

        {/* Footer Buttons */}
        <div className="w-full flex flex-row justify-end items-center gap-3 mt-6">
          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="box-border flex flex-row justify-center items-center px-5 h-10 bg-white border border-[#E0E2E5] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="font-semibold text-[13px] leading-5 text-[#575859]">ยกเลิก</span>
          </button>

          {/* Confirm */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex flex-row justify-center items-center px-6 h-10 bg-[#009265] hover:bg-[#007C55] rounded-lg cursor-pointer shadow-[0_4px_12px_rgba(0,146,101,0.2)] transition-all disabled:cursor-not-allowed disabled:opacity-60 gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="font-semibold text-[14px] leading-5 text-white">กำลังประมวลผล...</span>
              </>
            ) : (
              <span className="font-semibold text-[14px] leading-5 text-white">ยืนยัน</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompleteServiceModal;
