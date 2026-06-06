import React from 'react';
import Icon from './Icon';
import type { Booking } from '../../pages/caregiver/CaregiverBookings';

interface AcceptBookingModalProps {
  readonly isOpen: boolean;
  readonly booking: Booking | null;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly formatThaiDate: (dateStr: string) => string;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none bg-black/50 transition-opacity">
      <div className="relative w-[500px] max-w-[500px] h-[388.5px] mx-auto p-0 flex items-center justify-center">
        {/* Modal Content Container */}
        <div 
          className="box-border flex flex-col items-start p-[28px] w-[500px] max-w-[500px] h-[388.5px] bg-white shadow-[0px_20px_25px_-5px_rgba(0,0,0,0.1),0px_10px_10px_-5px_rgba(0,0,0,0.04)] rounded-[20px] overflow-hidden"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {/* Header Layout: Icon, Title, Subtitle */}
          <div className="flex flex-col items-center p-0 w-[444px] h-[118.5px] self-stretch">
            {/* Circular Check Icon Container */}
            <div className="flex flex-col items-start pb-3 w-[56px] h-[68px]">
              <div className="flex flex-row justify-center items-center p-0 w-[56px] h-[56px] bg-[#E6F5ED] rounded-[28px]">
                <Icon 
                  name="check" 
                  className="text-[32px] font-normal leading-[32px] text-center text-[#52B69A]" 
                  style={{ fontSize: '32px', lineHeight: '32px' }}
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <h2 className="font-bold text-[18px] leading-[27px] text-[#1A1A1A] text-center self-stretch m-0">
              ตอบรับคำขอจองนี้?
            </h2>
            <p className="font-normal text-[13px] leading-[20px] text-[#8A8C8E] text-center self-stretch m-0 pt-1">
              ยืนยันเวลาจองของคุณกับคนไข้
            </p>
          </div>

          {/* Details Gray Box Container */}
          <div className="flex flex-col items-start pt-5 w-[444px] h-[154px] self-stretch">
            <div className="flex flex-col items-start p-4 gap-2 w-[444px] h-[134px] bg-[#F6FAF9] rounded-[12px] self-stretch">
              {/* Row 1: Patient Name */}
              <div className="flex flex-row justify-between items-start p-0 w-[412px] h-[19.5px] self-stretch">
                <span className="font-normal text-[13px] leading-[20px] text-[#8A8C8E]">คนไข้:</span>
                <span className="font-bold text-[13px] leading-[20px] text-[#1A1A1A]">{booking.patientName}</span>
              </div>

              {/* Row 2: Service Date */}
              <div className="flex flex-row justify-between items-start p-0 w-[412px] h-[19.5px] self-stretch">
                <span className="font-normal text-[13px] leading-[20px] text-[#8A8C8E]">วันที่ดูแล:</span>
                <span className="font-semibold text-[13px] leading-[20px] text-[#1A1A1A]">{formatThaiDate(booking.bookingDate)}</span>
              </div>

              {/* Row 3: Service Time */}
              <div className="flex flex-row justify-between items-start p-0 w-[412px] h-[19.5px] self-stretch">
                <span className="font-normal text-[13px] leading-[20px] text-[#8A8C8E]">เวลา:</span>
                <span className="font-semibold text-[13px] leading-[20px] text-[#1A1A1A]">{booking.time} น.</span>
              </div>

              {/* Row 4: Estimated Income */}
              <div className="flex flex-row justify-between items-start p-0 w-[412px] h-[19.5px] self-stretch">
                <span className="font-normal text-[13px] leading-[20px] text-[#8A8C8E]">รายได้โดยประมาณ:</span>
                <span className="font-bold text-[13px] leading-[20px] text-[#059669]">฿{booking.price.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer Buttons Section */}
          <div className="flex flex-col items-start pt-5 w-[444px] h-[60px] self-stretch">
            <div className="flex flex-row justify-end items-start p-0 gap-3 w-[444px] h-[40px] self-stretch">
              {/* Cancel Button */}
              <button
                type="button"
                onClick={onClose}
                className="box-border flex flex-row justify-center items-center px-[18px] py-0 gap-[6px] w-[74.6px] h-[40px] bg-white border-[0.8px] border-[#E0E2E5] rounded-[8px] cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-[13px] leading-[20px] text-center text-[#575859]">ยกเลิก</span>
              </button>

              {/* Confirm Button */}
              <button
                type="button"
                onClick={onConfirm}
                className="flex flex-row justify-center items-center px-[20px] py-0 gap-[6px] w-[138px] h-[40px] bg-[#009265] rounded-[8px] cursor-pointer hover:bg-[#007b55] transition-colors shadow-sm"
              >
                <span className="font-semibold text-[14px] leading-[21px] text-center text-white">ใช่, ยอมรับคำขอ</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptBookingModal;
