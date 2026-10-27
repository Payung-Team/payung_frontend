import React from 'react';
import Icon from './Icon';
import { getPatientDisplayName, type Booking } from '../../pages/caregiver/CaregiverBookings';
import { serviceTypeLabel } from '../../lib/serviceTypeLabels';
import { getPayoutStatusMeta } from '../../lib/payoutStatus';
import { googleMapsUrl } from '../../lib/googleMaps';

interface BookingCardProps {
  booking: Booking;
  onAccept: (id: string) => void;
  onDeclineClick: (id: string) => void;
  onCancelAcceptanceClick: (id: string) => void;
  onViewDetails: (booking: Booking) => void;
  formatThaiDate: (dateStr: string) => string;
  getDaysUntil: (dateStr: string) => string;
  getAcceptedTimeText: (booking: Booking) => string;
  getStatusBadgeStyle: (status: Booking['status']) => { bg: string; dot: string; text: string; label: string };
  /** True when this card is rendered inside the "scheduled" tab's "due" sub-tab (service date reached/overdue). */
  isDueSection?: boolean;
}

/**
 * การ์ดสรุปงานในหน้า "งานของฉัน" (ฝั่งผู้ดูแล)
 * แสดงเฉพาะข้อมูลที่ใช้ตัดสินใจ/จำงานได้ — กดการ์ดเพื่อเข้าไปดูรายละเอียดเต็ม (ที่อยู่, แผนงาน, ข้อความ ฯลฯ)
 * เหลือปุ่มบนการ์ดเฉพาะงานที่ต้องตัดสินใจ (คำขอใหม่ / ยกเลิกการตอบรับ)
 */
export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onAccept,
  onDeclineClick,
  onCancelAcceptanceClick,
  onViewDetails,
  formatThaiDate,
  getDaysUntil,
  getAcceptedTimeText,
  getStatusBadgeStyle,
  isDueSection = false,
}) => {
  const isDueConfirmed = booking.status === 'confirmed' && isDueSection;
  const badge = isDueConfirmed
    ? { bg: 'bg-[#EFF6FF]', dot: 'bg-[#3B82F6]', text: 'text-[#1D4ED8]', label: 'ถึงกำหนดบริการแล้ว' }
    : getStatusBadgeStyle(booking.status);
  const displayPatientName = getPatientDisplayName(booking);
  const payoutBadge = getPayoutStatusMeta(booking.payoutStatus);
  // ยืนยัน (ชำระเงิน) แล้วเท่านั้นจึงเปิดแผนที่ให้ — ใช้หมุดก่อน ไม่มีหมุดค่อยค้นจากข้อความที่อยู่
  const isConfirmedWork = booking.status === 'confirmed' || booking.status === 'in_progress';
  const mapsUrl = isConfirmedWork ? googleMapsUrl(booking) : null;
  const hasFooter = booking.status === 'pending' || booking.status === 'accepted' || mapsUrl != null;
  // "22 ต.ค. 2569" → ช่องวันที่ด้านซ้ายบนจอกว้าง
  const dateParts = formatThaiDate(booking.bookingDate).split(' ');
  const [dateDay, dateMonth, dateYear] = dateParts.length === 3 ? dateParts : [null, null, null];
  const showNetPay = booking.status === 'completed' && booking.payoutAmount != null;

  return (
    <div
      className={`box-border w-full bg-white border-[0.8px] shadow-[0px_1px_4px_rgba(0,0,0,0.03)] rounded-2xl flex flex-col self-stretch overflow-hidden transition-all duration-200 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.06)] ${booking.status === 'pending' ? 'border-[#3B82F6]' : 'border-[#E5E7EB]'
        }`}
    >
      {/* ทั้งการ์ด (ยกเว้นปุ่มด้านล่าง) กดเพื่อดูรายละเอียด */}
      <button
        type="button"
        onClick={() => onViewDetails(booking)}
        aria-label={`ดูรายละเอียดงาน REF-${booking.id.slice(-6).toUpperCase()}`}
        className="w-full flex flex-col text-left cursor-pointer hover:bg-[#FAFBFC] transition-colors duration-150"
      >
        {/* ลำดับสายตา (จอกว้าง): วันที่ → งานอะไร/ของใคร/กี่โมง → รายได้ */}
        <div className="w-full flex flex-row items-center gap-3 md:gap-5 px-4 py-3.5 md:px-5 md:py-4">

          {/* Date tile — จอกว้างเท่านั้น (มือถือรวมวันที่ไว้ในบรรทัดเวลา) */}
          {dateDay && (
            <div className="hidden md:flex flex-col items-center justify-center flex-shrink-0 w-[72px] h-[72px] rounded-xl bg-[#F0FAF4] border-[0.8px] border-[#D1FAE5]">
              <span className="font-semibold text-xs leading-4 text-[#059669]">{dateMonth}</span>
              <span className="font-['Inter'] font-extrabold text-[26px] leading-[30px] text-[#1A1A1A]">{dateDay}</span>
              <span className="font-['Inter'] text-[10px] leading-3 text-[#8A8C8E]">{dateYear}</span>
            </div>
          )}

          {/* Main info */}
          <div className="flex flex-col min-w-0 flex-1 gap-1 md:gap-1.5">
            {/* Status + time hint */}
            <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
              <div className={`flex flex-row items-center px-2.5 h-6 gap-1.5 rounded-full ${badge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                <span className={`font-semibold text-xs leading-[18px] ${badge.text}`}>
                  {badge.label}
                </span>
              </div>

              {booking.status === 'pending' ? (
                <span className="font-['Inter'] text-[11px] md:text-xs leading-4 text-[#8A8C8E]">
                  {booking.receivedTimeText || 'ได้รับเมื่อ 1 ชม. ที่แล้ว'}
                </span>
              ) : booking.status === 'accepted' ? (
                <span className="font-['Inter'] text-[11px] md:text-xs leading-4 text-[#8A8C8E]">
                  {getAcceptedTimeText(booking)}
                </span>
              ) : booking.status === 'confirmed' && !isDueConfirmed ? (
                <span className="px-2 h-[20.5px] bg-[#EFF6FF] rounded flex items-center font-['Inter'] font-semibold text-[11px] leading-4 text-[#1D4ED8]">
                  {getDaysUntil(booking.bookingDate)}
                </span>
              ) : null}
            </div>

            <div className="flex flex-row items-baseline gap-2 min-w-0">
              <span className="font-bold text-[15px] leading-[22px] md:text-lg md:leading-7 text-[#1A1A1A] truncate">
                {serviceTypeLabel(booking.serviceType)}
              </span>
              <span className="font-['Inter'] text-[11px] md:text-xs text-[#8A8C8E] flex-shrink-0">
                REF-{booking.id.slice(-6).toUpperCase()}
              </span>
            </div>

            {/* ผู้รับบริการ + เวลา — มือถือซ้อนสองบรรทัด, จอกว้างเรียงบรรทัดเดียว */}
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-x-5 text-xs md:text-sm text-[#575859] min-w-0">
              <div className="flex flex-row items-center gap-1.5 min-w-0">
                <Icon name="person" color="#8A8C8E" style={{ fontSize: '16px' }} className="flex-shrink-0" />
                <span className="truncate">{displayPatientName}</span>
              </div>
              <div className="flex flex-row items-center gap-1.5 min-w-0">
                <Icon name="schedule" color="#8A8C8E" style={{ fontSize: '16px' }} className="flex-shrink-0" />
                {/* PYG-526: แถวสรุปไม่มีช่องระยะเวลา → ใช้รูปแบบเต็ม "09:00 – 13:00 (4 ชม.)" · จอกว้างวันที่อยู่ในช่องซ้ายแล้ว */}
                <span className="truncate">
                  <span className={dateDay ? 'md:hidden' : undefined}>{formatThaiDate(booking.bookingDate)} · </span>
                  {booking.timeRangeText}
                </span>
              </div>
            </div>

            {booking.status === 'completed' && (
              <span className={`mt-1 self-start inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${payoutBadge.bg} ${payoutBadge.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${payoutBadge.dot}`} />
                {payoutBadge.label}
              </span>
            )}
          </div>

          {/* Pay + chevron */}
          <div className="flex flex-row items-center gap-1 md:gap-3 flex-shrink-0">
            <div className="flex flex-col items-end">
              <span className="text-[10px] md:text-xs leading-[14px] md:leading-4 text-[#8A8C8E]">
                {showNetPay ? 'รับสุทธิ' : 'รายได้'}
              </span>
              <span className="font-['Inter'] font-bold text-base leading-6 md:text-2xl md:leading-8 text-[#059669]">
                ฿{(showNetPay ? booking.payoutAmount! : booking.price).toLocaleString()}
              </span>
            </div>
            <Icon name="chevron_right" className="text-[22px] md:text-[26px] text-[#C6C8CB]" />
          </div>
        </div>
      </button>

      {/* Footer — เฉพาะงานที่ต้องตัดสินใจ */}
      {hasFooter && (
        <div className="w-full flex flex-row justify-end items-center px-4 md:px-5 py-2.5 gap-2 border-t border-[#F0F1F3]">
          {booking.status === 'pending' ? (
            <>
              <button
                type="button"
                onClick={() => onDeclineClick(booking.id)}
                className="flex-1 sm:flex-none px-4 h-9 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold cursor-pointer transition-colors duration-200"
              >
                ปฏิเสธการจอง
              </button>
              <button
                type="button"
                onClick={() => onAccept(booking.id)}
                className="flex-1 sm:flex-none px-4 h-9 bg-[#009265] hover:bg-[#087C58] text-white rounded-lg text-xs font-semibold cursor-pointer shadow-sm transition-colors duration-200"
              >
                ตอบรับการจอง
              </button>
            </>
          ) : booking.status === 'accepted' ? (
            <button
              type="button"
              onClick={() => onCancelAcceptanceClick(booking.id)}
              className="text-red-500 hover:text-red-700 text-xs font-semibold underline cursor-pointer bg-transparent border-0 p-0"
            >
              ยกเลิกการตอบรับ
            </button>
          ) : mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 h-9 bg-white border-[0.8px] border-[#52B69A] text-[#3A9A7E] hover:bg-[#F0FAF4] rounded-lg text-xs font-semibold transition-colors duration-200"
            >
              <Icon name="map" color="#3A9A7E" style={{ fontSize: '16px' }} className="flex-shrink-0" />
              นำทางด้วย Google Maps
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
};
