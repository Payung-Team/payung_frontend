import React from 'react';
import Icon from './Icon';
import type { Booking } from '../../pages/caregiver/CaregiverBookings';

interface BookingCardProps {
  booking: Booking;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAccept: (id: string) => void;
  onDeclineClick: (id: string) => void;
  onCancelAcceptanceClick: (id: string) => void;
  onViewDetails: (booking: Booking) => void;
  formatThaiDate: (dateStr: string) => string;
  getDaysUntil: (dateStr: string) => string;
  getAcceptedTimeText: (booking: Booking) => string;
  getStatusBadgeStyle: (status: Booking['status']) => { bg: string; dot: string; text: string; label: string };
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  isExpanded,
  onToggleExpand,
  onAccept,
  onDeclineClick,
  onCancelAcceptanceClick,
  onViewDetails,
  formatThaiDate,
  getDaysUntil,
  getAcceptedTimeText,
  getStatusBadgeStyle,
}) => {
  const badge = getStatusBadgeStyle(booking.status);

  return (
    <div
      className={`box-border w-full bg-white border-[0.8px] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] rounded-2xl flex flex-col items-start p-0 self-stretch overflow-hidden transition-all duration-200 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.03)] ${booking.status === 'pending' ? 'border-[#3B82F6]' : 'border-[#E5E7EB]'
        }`}
    >
      <div className="w-full flex flex-col items-start p-0 self-stretch">

        {/* Card Top Header */}
        <div className="box-border w-full flex flex-row justify-between items-center px-4 py-2.5 bg-[#FAFBFC] border-b border-[#F0F1F3] self-stretch">

          {/* Status Badge */}
          <div className={`flex flex-row items-center px-2.5 h-6 gap-1.5 rounded-full ${badge.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
            <span className={`font-semibold text-xs leading-[18px] ${badge.text}`}>
              {badge.label}
            </span>
          </div>

          {/* Right-side status detail */}
          {booking.status === 'pending' ? (
            <span className="font-['Inter'] font-normal text-[11px] leading-4 text-[#8A8C8E]">
              {booking.receivedTimeText || 'ได้รับเมื่อ 1 ชม. ที่แล้ว'}
            </span>
          ) : booking.status === 'accepted' ? (
            <span className="font-['Inter'] font-normal text-[11px] leading-4 text-[#8A8C8E]">
              {getAcceptedTimeText(booking)}
            </span>
          ) : booking.status === 'confirmed' ? (
            <div className="px-2 h-[20.5px] bg-[#EFF6FF] rounded flex items-center justify-center">
              <span className="font-['Inter'] font-semibold text-[11px] leading-4 text-[#1D4ED8]">
                {getDaysUntil(booking.bookingDate)}
              </span>
            </div>
          ) : (
            <span className="font-['Inter'] font-normal text-[11px] leading-4 text-[#8A8C8E]">
              {formatThaiDate(booking.bookingDate)}
            </span>
          )}

        </div>

        {/* Card Main Body */}
        <div className="w-full flex flex-col md:flex-row md:items-center px-4 py-3 gap-3 self-stretch h-auto">

          {/* Details Info Column */}
          <div className="flex flex-col items-start p-0 grow shrink-0 basis-auto w-full md:w-auto">
            <div className="flex flex-col items-start p-0 w-full h-[27px]">
              <h3 className="font-['Inter'] font-extrabold text-base md:text-lg leading-7 tracking-[0.5px] text-[#1A1A1A] h-[27px] truncate max-w-full">
                {booking.id} <span className="font-sans font-bold text-sm text-gray-500">· {booking.serviceType}</span>
              </h3>
            </div>

            <div className="pt-1.5 w-full flex flex-col items-start h-6">
              <div className="w-full flex flex-row items-center flex-wrap gap-x-3 gap-y-1 text-xs text-[#575859] h-auto">

                {/* Patient Name */}
                <div className="flex flex-row items-center gap-1.5">
                  <Icon name="person" color="#3B82F6" style={{ fontSize: '13px' }} className="flex-shrink-0" />
                  <span>{booking.patientName}</span>
                </div>

                <span className="text-[#D1D5DB] font-semibold text-[11px]">·</span>

                {/* Date & Time */}
                <div className="flex flex-row items-center gap-1.5">
                  <Icon name="calendar_today" color="#8A8C8E" style={{ fontSize: '13px' }} className="flex-shrink-0" />
                  <span>{formatThaiDate(booking.bookingDate)} ({booking.time} น.)</span>
                </div>

                <span className="text-[#D1D5DB] font-semibold text-[11px]">·</span>

                {/* Price */}
                <div className="flex flex-row items-center gap-1.5 font-semibold text-[#059669]">
                  <Icon name="payments" color="#059669" style={{ fontSize: '13px' }} className="flex-shrink-0" />
                  <span>฿{booking.price.toLocaleString()}</span>
                </div>

              </div>
            </div>
          </div>

          {/* Toggle Details Chevron */}
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'ย่อรายละเอียด' : 'ดูรายละเอียดเพิ่มเติม'}
            className="w-[22px] h-7 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-gray-50 rounded"
          >
            <Icon
              name="expand_more"
              className={`text-[22px] text-[#8A8C8E] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                }`}
            />
          </button>

        </div>

        {/* Card Expanded Area */}
        {isExpanded && (
          <div className="w-full border-t border-[#F0F1F3] bg-white flex flex-col self-stretch">

            {/* Container 1: Patient Details */}
            <div className="box-border w-full flex flex-col items-start px-4 py-3 border-b border-[#F0F1F3] self-stretch">
              <div className="w-full text-left">
                <span className="font-['Bai_Jamjuree'] font-bold text-[10px] leading-[15px] tracking-[0.7px] text-[#52B69A] uppercase">
                  ผู้ป่วย / ผู้รับบริการ
                </span>
              </div>
              <div className="w-full flex flex-row items-center gap-2.5 mt-2 text-left">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#52B69A] to-[#76C893] flex items-center justify-center flex-shrink-0">
                  <span className="font-['Bai_Jamjuree'] font-bold text-[15.38px] text-white">
                    {booking.patientName ? booking.patientName.charAt(0) : 'พ'}
                  </span>
                </div>
                {/* Text Info */}
                <div className="flex flex-col items-start p-0">
                  <span className="font-['Bai_Jamjuree'] font-bold text-[15px] leading-[22px] text-[#1A1A1A]">
                    {booking.patientName}
                  </span>
                  <span className="font-['Bai_Jamjuree'] font-normal text-xs leading-[18px] text-[#8A8C8E] mt-0.5">
                    สำหรับ: {booking.relation || 'สำหรับตัวเอง'}
                  </span>
                  {booking.condition && (
                    <span className="font-['Bai_Jamjuree'] font-semibold text-[11px] leading-[15px] text-[#DC2626] mt-0.5">
                      อาการ/เงื่อนไข: {booking.condition}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Container 2: Job Details */}
            <div className="box-border w-full flex flex-col items-start px-4 py-3 border-b border-[#F0F1F3] self-stretch">
              <div className="w-full text-left">
                <span className="font-['Bai_Jamjuree'] font-bold text-[10px] leading-[15px] tracking-[0.7px] text-[#52B69A] uppercase">
                  รายละเอียดงาน
                </span>
              </div>
              <div className="w-full flex flex-col items-start gap-1.5 mt-2 text-left">

                {/* Service Type */}
                <div className="w-full flex flex-row items-start gap-2 text-xs">
                  <div className="w-3 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="medical_services" color="#8A8C8E" style={{ fontSize: '16px' }} />
                  </div>
                  <span className="w-[90px] text-[#8A8C8E] flex-shrink-0 font-['Bai_Jamjuree']">ประเภทบริการ</span>
                  <span className="text-[#1A1A1A] font-semibold font-['Bai_Jamjuree']">{booking.serviceType}</span>
                </div>

                {/* Date */}
                <div className="w-full flex flex-row items-start gap-2 text-xs">
                  <div className="w-3 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="calendar_today" color="#8A8C8E" style={{ fontSize: '16px' }} />
                  </div>
                  <span className="w-[90px] text-[#8A8C8E] flex-shrink-0 font-['Bai_Jamjuree']">วันที่</span>
                  <span className="text-[#1A1A1A] font-['Bai_Jamjuree']">{formatThaiDate(booking.bookingDate)}</span>
                </div>

                {/* Time */}
                <div className="w-full flex flex-row items-start gap-2 text-xs">
                  <div className="w-3 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="schedule" color="#8A8C8E" style={{ fontSize: '16px' }} />
                  </div>
                  <span className="w-[90px] text-[#8A8C8E] flex-shrink-0 font-['Bai_Jamjuree']">เวลา</span>
                  <span className="text-[#1A1A1A] font-['Bai_Jamjuree']">{booking.time} น.</span>
                </div>

                {/* Location */}
                <div className="w-full flex flex-row items-start gap-2 text-xs">
                  <div className="w-3 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="place" color="#8A8C8E" style={{ fontSize: '16px' }} />
                  </div>
                  <span className="w-[90px] text-[#8A8C8E] flex-shrink-0 font-['Bai_Jamjuree']">สถานที่</span>
                  <span className="text-[#1A1A1A] font-['Bai_Jamjuree']">{booking.locationName || '-'}</span>
                </div>

                {/* Format */}
                <div className="w-full flex flex-row items-start gap-2 text-xs">
                  <div className="w-3 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon name="directions" color="#8A8C8E" style={{ fontSize: '13px' }} />
                  </div>
                  <span className="w-[90px] text-[#8A8C8E] flex-shrink-0 font-['Bai_Jamjuree']">รูปแบบ</span>
                  <span className="text-[#1A1A1A] font-['Bai_Jamjuree']">{booking.serviceFormat || 'ดูแลที่บ้านผู้ป่วย'}</span>
                </div>

                {/* Green Box: Duration and Income */}
                <div className="box-border w-full flex flex-row items-start p-0 bg-[#F0FAF4] border-[0.8px] border-[#D1FAE5] rounded-[10px] mt-2 h-[57px] overflow-hidden self-stretch">
                  {/* Duration */}
                  <div className="flex flex-col items-center justify-center py-2 px-3 flex-1 h-full">
                    <span className="font-['Bai_Jamjuree'] font-bold text-[10px] leading-[15px] text-[#059669] text-center">
                      ระยะเวลา
                    </span>
                    <span className="font-['Inter'] font-bold text-base leading-6 text-[#1A1A1A] text-center mt-0.5">
                      {booking.durationText || '3 ชม.'}
                    </span>
                  </div>

                  {/* Divider Line */}
                  <div className="w-[1px] h-[57px] bg-[#D1FAE5] flex-shrink-0" />

                  {/* Income */}
                  <div className="flex flex-col items-center justify-center py-2 px-3 flex-1 h-full">
                    <span className="font-['Bai_Jamjuree'] font-bold text-[10px] leading-[15px] text-[#059669] text-center">
                      รายได้
                    </span>
                    <span className="font-['Inter'] font-bold text-base leading-6 text-[#059669] text-center mt-0.5">
                      ฿{booking.price.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Task List Section */}
                {booking.tasks && booking.tasks.length > 0 && (
                  <div className="w-full flex flex-col items-start mt-2">
                    <span className="font-['Bai_Jamjuree'] font-bold text-[10px] leading-[15px] tracking-[0.5px] text-[#8A8C8E] uppercase">
                      รายการแผนงาน
                    </span>
                    <div className="flex flex-row flex-wrap gap-2 mt-1.5">
                      {booking.tasks.map((task, i) => (
                        <div
                          key={i}
                          className="bg-[#F0F1F3] rounded-[20px] px-2.5 py-[3px] flex items-center justify-center"
                        >
                          <span className="font-['Bai_Jamjuree'] font-normal text-[11px] leading-[16px] text-[#575859]">
                            {task}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Yellow Notes Box */}
                {booking.notes && (
                  <div className="box-border w-full flex flex-col items-start p-3 bg-[#FFF8E7] border-[0.8px] border-[#FFEAA7] rounded-lg mt-2 self-stretch">
                    <p className="font-['Bai_Jamjuree'] font-bold text-xs leading-[17px] text-[#8A6D3B]">
                      ข้อความจากคนไข้: {booking.notes}
                    </p>
                  </div>
                )}

                {/* Decline Reason Display */}
                {booking.declineReason && (
                  <div className="box-border w-full flex flex-col items-start p-3 bg-[#FEF2F2] border-[0.8px] border-red-100 rounded-lg mt-2 self-stretch">
                    <p className="font-['Bai_Jamjuree'] font-bold text-xs leading-[17px] text-[#DC2626]">
                      เหตุผลการปฏิเสธ: {booking.declineReason}
                    </p>
                  </div>
                )}

              </div>
            </div>

            {/* Container 3: Footer Actions */}
            <div className="box-border w-full flex flex-row justify-end items-center px-4 py-3 gap-2 bg-white self-stretch h-[60px]">
              {booking.status === 'pending' ? (
                <>
                  <button
                    type="button"
                    onClick={() => onDeclineClick(booking.id)}
                    className="px-4 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200"
                  >
                    ปฏิเสธการจอง
                  </button>
                  <button
                    type="button"
                    onClick={() => onAccept(booking.id)}
                    className="px-4 py-1.5 bg-[#009265] hover:bg-[#087C58] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-colors duration-200"
                  >
                    ตอบรับการจอง
                  </button>
                </>
              ) : (
                <div className="flex flex-row items-center gap-4">
                  {booking.status === 'accepted' && (
                    <button
                      type="button"
                      onClick={() => onCancelAcceptanceClick(booking.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-semibold underline cursor-pointer bg-transparent border-0 p-0"
                    >
                      ยกเลิกการตอบรับ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onViewDetails(booking)}
                    className="box-sizing px-[14px] h-9 bg-white border-[0.8px] border-[#E0E2E5] rounded-lg font-semibold text-[13px] text-[#575859] hover:bg-gray-50 flex items-center justify-center cursor-pointer transition-colors duration-200"
                  >
                    ดูรายละเอียด
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
