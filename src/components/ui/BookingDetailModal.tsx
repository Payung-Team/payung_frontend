import React from 'react';
import Icon from './Icon';
import type { Booking } from '../../pages/caregiver/CaregiverBookings';

interface BookingDetailModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onCancelAcceptanceClick: (id: string) => void;
  onStartJob?: (id: string) => void;
  formatThaiDate: (dateStr: string) => string;
  getDaysUntil: (dateStr: string) => string;
  getStatusBadgeStyle: (status: Booking['status']) => { bg: string; dot: string; text: string; label: string };
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  isOpen,
  booking,
  onClose,
  onCancelAcceptanceClick,
  onStartJob,
  formatThaiDate,
  getDaysUntil,
  getStatusBadgeStyle,
}) => {
  if (!isOpen || !booking) return null;

  const style = getStatusBadgeStyle(booking.status);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bookingDay = new Date(booking.bookingDate);
  bookingDay.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((bookingDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isStartable = booking.status === 'confirmed' && diffDays <= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none bg-black/50 transition-opacity p-4">
      <div className="relative w-full max-w-[600px] h-[80vh] md:h-[620px] mx-auto bg-white shadow-xl rounded-[20px] flex flex-col overflow-hidden">

        {/* Modal Header */}
        <div className="flex flex-row justify-between items-center px-7 pt-7 pb-3 bg-white">
          <h2 className="font-['Bai_Jamjuree'] font-bold text-lg leading-[27px] text-[#1A1A1A]">
            รายละเอียดงานดูแล
          </h2>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 cursor-pointer"
            onClick={onClose}
          >
            <Icon name="close" color="#8A8C8E" style={{ fontSize: '24px' }} />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-7 pb-7 flex flex-col gap-5">

          {/* Patient Details Info Row */}
          <div className="w-full flex flex-row items-center justify-between gap-4 py-4 border-b border-gray-100">
            <div className="flex flex-row items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#52B69A] to-[#76C893] flex items-center justify-center flex-shrink-0">
                <span className="font-['Bai_Jamjuree'] font-bold text-[21.5385px] text-white">
                  {booking.patientName ? booking.patientName.charAt(0) : 'พ'}
                </span>
              </div>
              {/* Info */}
              <div className="flex flex-col items-start">
                <span className="font-['Bai_Jamjuree'] font-bold text-base leading-6 text-[#1A1A1A]">
                  {booking.patientName}
                </span>
                <span className="font-['Bai_Jamjuree'] font-normal text-xs leading-[18px] text-[#8A8C8E] mt-0.5">
                  ผู้รับการดูแล: {booking.careRecipientName || (booking.relation?.replace('สำหรับ: ', '')) || 'สำหรับตัวเอง'}
                </span>
              </div>
            </div>
            {/* Status Badge */}
            <div className={`h-6 px-2.5 rounded-full flex items-center justify-center ${style.bg}`}>
              <span className={`font-['Bai_Jamjuree'] font-semibold text-xs leading-[18px] ${style.text}`}>
                {style.label}
              </span>
            </div>
          </div>

          {/* Service Date & Duration Row */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
            {/* Left Block */}
            <div className="bg-[#F9FAFB] rounded-xl p-3 flex flex-col items-start w-full">
              <span className="font-['Bai_Jamjuree'] font-bold text-[11px] leading-[17px] text-[#8A8C8E]">
                วันเวลาให้บริการ
              </span>
              <span className="font-['Bai_Jamjuree'] font-semibold text-[13px] leading-5 text-[#1A1A1A] mt-1">
                {formatThaiDate(booking.bookingDate)} · {booking.time} น.
              </span>
            </div>
            {/* Right Block */}
            <div className="bg-[#F9FAFB] rounded-xl p-3 flex flex-col items-start w-full">
              <span className="font-['Bai_Jamjuree'] font-bold text-[11px] leading-[17px] text-[#8A8C8E] truncate w-full">
                ระยะเวลาและรายได้โดยประมาณ
              </span>
              <span className="font-['Bai_Jamjuree'] font-semibold text-[13px] leading-5 text-[#1A1A1A] mt-1">
                {booking.durationText || '3 ชั่วโมง'} · ฿{booking.price.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Service Location Card */}
          <div className="w-full flex flex-col items-start mt-2">
            <span className="font-['Bai_Jamjuree'] font-bold text-[13px] leading-5 text-[#575859]">
              สถานที่ให้บริการ
            </span>
            <div className="box-border w-full flex flex-row items-start p-3.5 gap-2.5 border border-[#E5E7EB] rounded-xl mt-1.5">
              <Icon name="location_on" color="#52B69A" style={{ fontSize: '20px' }} className="flex-shrink-0 mt-0.5" />
              <div className="flex flex-col items-start p-0 text-left">
                <span className="font-['Bai_Jamjuree'] font-semibold text-[13px] leading-5 text-[#1A1A1A]">
                  {booking.locationName || '-'}
                </span>
                {booking.locationName && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.locationName)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-row items-center gap-1 mt-1 text-[#52B69A] text-xs font-semibold hover:underline"
                  >
                    <Icon name="map" color="#52B69A" style={{ fontSize: '13px' }} className="shrink-0" />
                    ดูใน Google Maps
                  </a>
                )}
                <span className="font-['Bai_Jamjuree'] font-normal text-xs leading-4.5 text-[#575859] mt-1">
                  รูปแบบบริการ: {booking.serviceFormat || 'ดูแลที่บ้านผู้ป่วย'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Person on Day of Service */}
          {booking.dayOfContactName && (
            <div className="w-full flex flex-col items-start mt-2">
              <span className="font-['Bai_Jamjuree'] font-bold text-[13px] leading-5 text-[#575859]">
                ผู้ติดต่อในวันนัดหมาย
              </span>
              <div className="box-border w-full flex flex-col items-start p-3.5 gap-2 border border-[#E5E7EB] rounded-xl mt-1.5">
                <div className="flex items-center gap-2">
                  <Icon name="person" color="#52B69A" style={{ fontSize: '16px' }} className="shrink-0" />
                  <span className="font-['Bai_Jamjuree'] font-semibold text-[13px] leading-5 text-[#1A1A1A]">
                    {booking.dayOfContactName}
                  </span>
                </div>
                {booking.dayOfContactPhone && (
                  <div className="flex items-center gap-2">
                    <Icon name="phone" color="#52B69A" style={{ fontSize: '16px' }} className="shrink-0" />
                    <span className="font-['Bai_Jamjuree'] font-normal text-[13px] leading-5 text-[#575859]">
                      {booking.dayOfContactPhone}
                    </span>
                  </div>
                )}
                {booking.dayOfContactRelationship && (
                  <div className="flex items-center gap-2">
                    <Icon name="people" color="#52B69A" style={{ fontSize: '16px' }} className="shrink-0" />
                    <span className="font-['Bai_Jamjuree'] font-normal text-[13px] leading-5 text-[#575859]">
                      {booking.dayOfContactRelationship}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Patient Notes */}
          <div className="w-full flex flex-col items-start mt-2">
            <span className="font-['Bai_Jamjuree'] font-bold text-[13px] leading-5 text-[#575859]">
              บันทึกเพิ่มเติมจากผู้ป่วย
            </span>
            <div className="box-border w-full flex flex-col items-start p-3.5 bg-[#F6FAF9] border border-[#F0F1F3] rounded-xl mt-1.5">
              <p className="font-['Bai_Jamjuree'] font-normal text-[13px] leading-5 text-[#575859] text-left">
                {booking.notes || '-'}
              </p>
            </div>
          </div>

          {/* Tasks Checklist */}
          {booking.tasks && booking.tasks.length > 0 && (
            <div className="w-full flex flex-col items-start mt-2">
              <span className="font-['Bai_Jamjuree'] font-bold text-[13px] leading-5 text-[#575859]">
                เช็คลิสต์งานที่ต้องปฏิบัติ ({booking.tasks.length} รายการ)
              </span>
              <div className="w-full flex flex-col gap-2 mt-2">
                {booking.tasks.map((task, i) => (
                  <div
                    key={i}
                    className="w-full bg-[#F9FAFB] rounded-[10px] py-2.5 px-3.5 flex flex-row items-center gap-2.5 text-left"
                  >
                    {booking.status === 'completed' ? (
                      <div className="w-4 h-4 bg-[#52B69A] border border-[#52B69A] rounded flex-shrink-0 flex items-center justify-center">
                        <Icon name="check" color="#FFFFFF" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                      </div>
                    ) : (
                      <div className="w-4 h-4 border border-gray-300 rounded flex-shrink-0 bg-white" />
                    )}
                    <span className="font-['Bai_Jamjuree'] font-medium text-[13px] leading-5 text-[#1A1A1A]">
                      {task}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Event Button */}
          {!['completed', 'cancelled', 'declined'].includes(booking.status) && (
            <div className="w-full flex flex-col items-start mt-4">
              <button
                type="button"
                disabled={!isStartable}
                onClick={isStartable ? () => { onClose(); onStartJob?.(booking.id); } : undefined}
                className={`w-full h-11 text-white font-bold text-sm rounded-lg flex flex-row justify-center items-center gap-2 shadow-[0px_4px_12px_rgba(82,182,154,0.2)] transition-colors ${isStartable ? 'bg-[#52B69A] hover:bg-[#3A9A7E] cursor-pointer' : 'bg-[#52B69A]/55 cursor-not-allowed'}`}
              >
                <Icon name="event" color="#FFFFFF" style={{ fontSize: '16px' }} className="mt-0.5" />
                <span>
                  {isStartable
                    ? 'ส่งการดูแล'
                    : `ส่งการดูแลได้ในอีก ${diffDays - 3} วัน`}
                </span>
              </button>
              {booking.status === 'accepted' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCancelAcceptanceClick(booking.id);
                  }}
                  className="w-full text-center mt-3 text-red-500 hover:text-red-700 text-xs font-semibold underline cursor-pointer bg-transparent border-0 p-0"
                >
                  ยกเลิกการตอบรับ
                </button>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default BookingDetailModal;
