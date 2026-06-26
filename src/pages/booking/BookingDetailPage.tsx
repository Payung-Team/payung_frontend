import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import Icon from '../../components/ui/Icon';
import { CompleteServiceModal } from '../../components/ui/CompleteServiceModal';
import { ReviewPromptCard } from '../../components/ui/ReviewPromptCard';
// TODO: uncomment when backend is ready
// import { useQuery, useMutation } from '@apollo/client/react';
// import { GET_BOOKING_DETAIL, COMPLETE_SERVICE } from '../../graphql/queries';

// ──────────────────────────────────────────────────
// Mock Data — ลบออกเมื่อ backend query พร้อม
// ──────────────────────────────────────────────────
interface BookingDetail {
  id: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'declined' | 'completed' | 'cancelled';
  paymentStatus: 'none' | 'held' | 'captured' | 'refunded';
  serviceType: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;
  durationHours: number;
  estimatedCost: number;
  locationAddress: string;
  careRecipientName?: string;
  patient: { id: string; displayName: string; avatarUrl?: string };
  caregiver: { id: string; fullName: string; avatarUrl?: string };
  confirmedAt?: string;
  completedAt?: string;
  createdAt: string;
}

function getMockBooking(id: string): BookingDetail {
  // วันนี้หรือก่อนหน้า → ทำให้ปุ่ม complete service แสดง
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];

  return {
    id,
    status: 'confirmed',
    paymentStatus: 'held',
    serviceType: 'ดูแลผู้สูงอายุ',
    bookingDate: dateStr,
    startTime: '09:00',
    durationHours: 3,
    estimatedCost: 1500,
    locationAddress: '123/45 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110',
    careRecipientName: 'คุณแม่สมศรี',
    patient: { id: 'patient-1', displayName: 'สมชาย ใจดี' },
    caregiver: { id: 'caregiver-1', fullName: 'พรพิมล รักษ์ดี' },
    confirmedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────
function formatThaiDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0]) + 543;
    const monthNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
    ];
    const month = monthNames[parseInt(parts[1]) - 1];
    const day = parseInt(parts[2]);
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function computeEndTime(startTime: string, durationHours: number): string {
  try {
    const [sh, sm] = startTime.split(':').map(Number);
    const endMinutes = sh * 60 + sm + Math.round(durationHours * 60);
    const eh = Math.floor(endMinutes / 60) % 24;
    const em = endMinutes % 60;
    return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
  } catch {
    return startTime;
  }
}

function getStatusBadge(status: BookingDetail['status']) {
  switch (status) {
    case 'confirmed':
      return { bg: 'bg-[#ECFDF5]', text: 'text-[#047857]', dot: 'bg-[#10B981]', label: 'ยืนยันแล้ว' };
    case 'completed':
      return { bg: 'bg-[#E6F5ED]', text: 'text-[#3A9A7E]', dot: 'bg-[#52B69A]', label: 'เสร็จสิ้น' };
    case 'accepted':
      return { bg: 'bg-[#FFFBEB]', text: 'text-[#B45309]', dot: 'bg-[#F59E0B]', label: 'รอคนไข้ยืนยัน' };
    case 'pending':
      return { bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]', dot: 'bg-[#3B82F6]', label: 'รอดำเนินการ' };
    case 'declined':
      return { bg: 'bg-[#FEF2F2]', text: 'text-[#B91C1C]', dot: 'bg-[#EF4444]', label: 'ปฏิเสธแล้ว' };
    case 'cancelled':
    default:
      return { bg: 'bg-[#F3F4F6]', text: 'text-[#374151]', dot: 'bg-[#6B7280]', label: 'ยกเลิกแล้ว' };
  }
}

// ──────────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────────
const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  // Modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // ──────────────────────────────────────────
  // Data — mock จนกว่า backend พร้อม
  // TODO: replace with useQuery(GET_BOOKING_DETAIL, { variables: { bookingId: id } })
  // ──────────────────────────────────────────
  const [booking, setBooking] = useState<BookingDetail>(() => getMockBooking(id || 'unknown'));
  const isLoading = false;

  useEffect(() => {
    setBooking(getMockBooking(id || 'unknown'));
  }, [id]);

  // ──────────────────────────────────────────
  // Derived state
  // ──────────────────────────────────────────
  const isPatient = userRole === 1;
  const isCaregiver = userRole === 2;

  const canComplete = useMemo(() => {
    if (booking.status !== 'confirmed') return false;
    // TODO: เพิ่มเช็ค paymentStatus === 'held' เมื่อ backend พร้อม
    // if (booking.paymentStatus !== 'held') return false;
    if (!isPatient && !isCaregiver) return false;

    // serviceDate <= today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const serviceDate = new Date(booking.bookingDate);
    serviceDate.setHours(0, 0, 0, 0);
    return serviceDate <= today;
  }, [booking, isPatient, isCaregiver]);

  const badge = getStatusBadge(booking.status);
  const endTime = computeEndTime(booking.startTime, booking.durationHours);

  // ──────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────
  const handleCompleteService = async () => {
    setIsCompleting(true);
    try {
      // TODO: replace with actual mutation
      // await completeService({ variables: { bookingId: booking.id } });
      await new Promise((resolve) => setTimeout(resolve, 1500)); // simulate API

      // Update local state (remove when using refetch)
      setBooking((prev) => ({
        ...prev,
        status: 'completed',
        paymentStatus: 'captured',
        completedAt: new Date().toISOString(),
      }));
      setShowCompleteModal(false);
      showSuccess('บริการเสร็จสิ้น ขอบคุณ', 4000);
    } catch {
      showError('ไม่สามารถยืนยันบริการเสร็จสิ้นได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReview = () => {
    // TODO: navigate ไปหน้า review เมื่อสร้างแล้ว
    showSuccess('ฟีเจอร์รีวิวกำลังจะมาเร็วๆ นี้', 3000);
  };

  // ──────────────────────────────────────────
  // Loading / Error
  // ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F6FAF9] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-gray-300 border-t-[#52B69A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div
        className="min-h-screen bg-[#F6FAF9] text-[#1A1A1A] antialiased w-full max-w-[1534.4px] mx-auto flex flex-col items-center"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <div className="w-full max-w-[800px] flex flex-col items-start px-4 sm:px-6 pt-4 sm:pt-6 pb-[100px]">

          {/* ── Back navigation ── */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex flex-row items-center gap-1.5 mb-5 text-[#8A8C8E] hover:text-[#575859] transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            <Icon name="arrow_back" className="text-[20px]" />
            <span className="font-semibold text-[13px] leading-5">กลับ</span>
          </button>

          {/* ── Main card ── */}
          <div className="w-full bg-white border border-[#E5E7EB] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] rounded-[20px] overflow-hidden">

            {/* Card header */}
            <div className="box-border w-full flex flex-row justify-between items-center px-5 sm:px-7 py-4 bg-white border-b border-[#F0F1F3]">
              <div className="flex flex-col items-start">
                <h1 className="font-bold text-lg sm:text-xl leading-7 text-[#1A1A1A] m-0">
                  รายละเอียดนัดหมาย
                </h1>
                <span className="font-normal text-xs leading-[18px] text-[#8A8C8E] mt-0.5">
                  #{booking.id}
                </span>
              </div>
              {/* Status badge */}
              <div className={`h-7 px-3 rounded-full flex items-center gap-1.5 ${badge.bg}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                <span className={`font-semibold text-xs leading-[18px] ${badge.text}`}>
                  {badge.label}
                </span>
              </div>
            </div>

            {/* Card body */}
            <div className="w-full flex flex-col gap-5 px-5 sm:px-7 py-6">

              {/* ── Patient / Caregiver info ── */}
              <div className="flex flex-row items-center gap-4 pb-4 border-b border-gray-100">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#52B69A] to-[#76C893] flex items-center justify-center flex-shrink-0">
                  <span className="font-bold text-[21px] text-white">
                    {isCaregiver
                      ? (booking.patient.displayName?.charAt(0) || 'พ')
                      : (booking.caregiver.fullName?.charAt(0) || 'ด')}
                  </span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="font-bold text-base leading-6 text-[#1A1A1A]">
                    {isCaregiver ? booking.patient.displayName : booking.caregiver.fullName}
                  </span>
                  <span className="font-normal text-xs leading-[18px] text-[#8A8C8E] mt-0.5">
                    {isCaregiver ? 'ผู้ใช้บริการ' : 'ผู้ดูแล'}
                    {booking.careRecipientName && ` · ผู้รับการดูแล: ${booking.careRecipientName}`}
                  </span>
                </div>
              </div>

              {/* ── Service Date & Duration ── */}
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="bg-[#F9FAFB] rounded-xl p-3.5 flex flex-col items-start">
                  <span className="font-bold text-[11px] leading-[17px] text-[#8A8C8E]">
                    วันเวลาให้บริการ
                  </span>
                  <span className="font-semibold text-[13px] leading-5 text-[#1A1A1A] mt-1">
                    {formatThaiDate(booking.bookingDate)} · {booking.startTime} - {endTime} น.
                  </span>
                </div>
                <div className="bg-[#F9FAFB] rounded-xl p-3.5 flex flex-col items-start">
                  <span className="font-bold text-[11px] leading-[17px] text-[#8A8C8E]">
                    ระยะเวลาและค่าบริการ
                  </span>
                  <span className="font-semibold text-[13px] leading-5 text-[#1A1A1A] mt-1">
                    {booking.durationHours} ชั่วโมง · <span className="text-[#059669] font-bold">฿{booking.estimatedCost.toLocaleString()}</span>
                  </span>
                </div>
              </div>

              {/* ── Service Type ── */}
              <div className="flex flex-col items-start">
                <span className="font-bold text-[13px] leading-5 text-[#575859]">ประเภทบริการ</span>
                <div className="mt-1.5 flex flex-row items-center gap-2">
                  <Icon name="medical_services" className="text-[18px] text-[#52B69A]" />
                  <span className="font-semibold text-[13px] leading-5 text-[#1A1A1A]">
                    {booking.serviceType}
                  </span>
                </div>
              </div>

              {/* ── Location ── */}
              <div className="flex flex-col items-start">
                <span className="font-bold text-[13px] leading-5 text-[#575859]">สถานที่ให้บริการ</span>
                <div className="box-border w-full flex flex-row items-start p-3.5 gap-2.5 border border-[#E5E7EB] rounded-xl mt-1.5">
                  <Icon name="location_on" color="#52B69A" style={{ fontSize: '20px' }} className="flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-[13px] leading-5 text-[#1A1A1A]">
                    {booking.locationAddress}
                  </span>
                </div>
              </div>

              {/* ── Complete Service Button ── */}
              {canComplete && (
                <div className="w-full pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCompleteModal(true)}
                    className="w-full h-12 bg-[#009265] hover:bg-[#007C55] text-white font-bold text-sm rounded-xl flex flex-row justify-center items-center gap-2 shadow-[0px_4px_12px_rgba(0,146,101,0.25)] cursor-pointer transition-all duration-200 active:scale-[0.98]"
                  >
                    <Icon name="task_alt" className="text-[20px] text-white" />
                    <span>ยืนยันบริการเสร็จสิ้น</span>
                  </button>
                </div>
              )}

              {/* ── Review Prompt Card (patient only, after completion) ── */}
              {booking.status === 'completed' && isPatient && (
                <ReviewPromptCard
                  caregiverName={booking.caregiver.fullName}
                  onReview={handleReview}
                />
              )}

              {/* ── Completed status banner ── */}
              {booking.status === 'completed' && isCaregiver && (
                <div className="w-full flex flex-row items-center gap-3 p-4 bg-[#ECFDF5] border border-[#D1FAE5] rounded-xl">
                  <Icon name="check_circle" className="text-[24px] text-[#10B981]" />
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-[13px] leading-5 text-[#047857]">
                      บริการเสร็จสิ้นแล้ว
                    </span>
                    <span className="font-normal text-xs leading-[18px] text-[#059669]">
                      ขอบคุณที่ให้บริการ ระบบได้เรียกเก็บเงินเรียบร้อยแล้ว
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Complete Service Confirm Modal */}
      <CompleteServiceModal
        isOpen={showCompleteModal}
        isLoading={isCompleting}
        amount={booking.estimatedCost}
        onClose={() => setShowCompleteModal(false)}
        onConfirm={handleCompleteService}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
    </>
  );
};

export default BookingDetailPage;
