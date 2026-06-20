import React from 'react';
import type { BookingRequest } from '../../context/BookingContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CaregiverSummary {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  hourlyRate: number;
  avgRating?: number | null;
  reviewCount: number;
  skills: string[];
  province: string;
  district: string;
  bio?: string | null;
  experience?: number | null;
  verified?: boolean;
}

interface BookingConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  caregiver: CaregiverSummary | undefined;
  bookingDraft: BookingRequest | null;
  isSubmitting?: boolean;
  errorMessage?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const SKILL_TRANSLATIONS: Record<string, string> = {
  mobility: 'ช่วยเคลื่อนไหว',
  medication: 'ดูแลยา',
  bathing: 'อาบน้ำ / สุขอนามัย',
  cooking: 'ทำอาหาร',
  companionship: 'เป็นเพื่อนคุย',
  wound_care: 'ดูแลแผล',
  physical_therapy: 'กายภาพบำบัด',
  physiotherapy: 'กายภาพบำบัด',
  dementia_care: 'ดูแลสมองเสื่อม',
  general_care: 'ดูแลทั่วไป',
  bedridden_care: 'ดูแลผู้ป่วยติดเตียง',
  companion: 'เป็นเพื่อน/พูดคุย',
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  general_care: 'ดูแลทั่วไป',
  physiotherapy: 'กายภาพบำบัด',
  bedridden_care: 'ดูแลผู้ป่วยติดเตียง',
  medication: 'ช่วยจัดการยา',
  companion: 'เป็นเพื่อน/พูดคุย',
};

function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span
        style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', lineHeight: '20px', flexShrink: 0 }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Bai Jamjuree', sans-serif",
          fontSize: 13,
          color: '#1A1A1A',
          lineHeight: '20px',
          fontWeight: bold ? 600 : 400,
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

const BookingConfirmModal: React.FC<BookingConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  caregiver,
  bookingDraft,
  isSubmitting = false,
  errorMessage,
}) => {
  if (!isOpen) return null;

  const fullName = caregiver?.fullName ?? '—';
  const hourlyRate = caregiver?.hourlyRate ?? 0;
  const avgRating = caregiver?.avgRating ?? null;
  const reviewCount = caregiver?.reviewCount ?? 0;
  const province = caregiver?.province ?? '';
  const verified = caregiver?.verified ?? false;
  const avatarUrl = caregiver?.avatarUrl ?? null;
  const initial = fullName.charAt(0);
  const skills = (caregiver?.skills ?? []).map((s) => SKILL_TRANSLATIONS[s] || s);

  // Booking details
  const serviceTypes = (bookingDraft?.serviceTypes ?? [])
    .map((s) => SERVICE_TYPE_LABELS[s] || s)
    .join(', ');
  const dateTime = bookingDraft?.dateTime;
  const duration = dateTime?.duration ?? 0;
  const startTime = dateTime?.startTime ?? '';
  const endTime = dateTime?.endTime ?? '';
  const locationDetails = bookingDraft?.locationDetails;
  const atHome = locationDetails?.at_home;
  const accompany = locationDetails?.accompany_outside;

  const locationText = atHome
    ? `บ้านพัก · ${[locationDetails?.district, locationDetails?.province].filter(Boolean).join(', ')}`
    : accompany
    ? `${accompany.hospitalName}`
    : province
    ? province
    : '—';

  const recipientName =
    bookingDraft?.recipient?.type === 'self'
      ? 'ตัวเอง'
      : bookingDraft?.recipient?.patientDetails?.name ?? '—';

  // Price
  const platformFeeRate = 0.1;
  const serviceCost = hourlyRate * (duration || 1);
  const platformFee = bookingDraft?.estimatedCost?.platformFee ?? Math.round(serviceCost * platformFeeRate);
  const total = bookingDraft?.estimatedCost?.total ?? serviceCost + platformFee;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      >
        {/* Modal card */}
        <div
          className="relative flex flex-col overflow-hidden"
          style={{
            width: 520,
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100vh - 48px)',
            background: '#FFFFFF',
            borderRadius: 20,
            boxShadow: '0px 16px 48px rgba(0, 0, 0, 0.14)',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Gradient caregiver banner ── */}
          <div
            className="relative flex-shrink-0 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #3A9A7E 0%, #52B69A 60%, #76C893 100%)',
              padding: '20px 24px 18px',
            }}
          >
            {/* Decorative circle */}
            <div
              className="absolute"
              style={{
                width: 140,
                height: 140,
                right: -20,
                top: -30,
                background: 'rgba(255, 255, 255, 0.08)',
                borderRadius: '50%',
                pointerEvents: 'none',
              }}
            />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer hover:bg-white/20"
            >
              <span className="material-icons text-white" style={{ fontSize: 20 }}>close</span>
            </button>

            {/* Modal title */}
            <p
              className="text-white/80 mb-3"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, lineHeight: '18px', fontWeight: 500 }}
            >
              ยืนยันคำขอจองบริการ
            </p>

            {/* Caregiver row */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  borderRadius: '50%',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span
                    className="text-white font-bold"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 20 }}
                  >
                    {initial}
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-white font-bold truncate"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 18, lineHeight: '27px' }}
                  >
                    {fullName}
                  </span>
                  {verified && (
                    <span className="material-icons text-white" style={{ fontSize: 16 }}>verified</span>
                  )}
                </div>
                <div
                  className="flex items-center gap-1.5 flex-wrap"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: '18px' }}
                >
                  <span>ผู้ดูแลผู้สูงอายุ</span>
                  {province && (
                    <>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>{province}</span>
                    </>
                  )}
                  {avgRating != null && reviewCount > 0 && (
                    <>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span className="inline-flex items-center gap-1">
                        <span className="material-icons" style={{ fontSize: 12, color: '#FFC570' }}>star</span>
                        <span className="font-semibold num" style={{ fontFamily: "'Inter', sans-serif" }}>
                          {avgRating.toFixed(1)}
                        </span>
                        <span style={{ opacity: 0.75 }}>({reviewCount})</span>
                      </span>
                    </>
                  )}
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-full text-white/90 font-medium"
                        style={{
                          fontFamily: "'Bai Jamjuree', sans-serif",
                          fontSize: 10,
                          background: 'rgba(255,255,255,0.18)',
                          border: '0.8px solid rgba(255,255,255,0.3)',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="flex flex-col gap-0 px-6 py-5">

            {/* Booking details section */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons" style={{ fontSize: 16, color: '#52B69A' }}>assignment</span>
                <span
                  className="font-bold text-[#1A1A1A]"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, lineHeight: '20px' }}
                >
                  รายละเอียดการจอง
                </span>
              </div>
              <div
                className="flex flex-col gap-2 rounded-xl p-4"
                style={{ background: '#F6FAF9', border: '0.8px solid #E6F5ED' }}
              >
                {serviceTypes && <Row label="ประเภทบริการ" value={serviceTypes} />}
                {dateTime?.date && (
                  <Row label="วันที่" value={formatThaiDate(dateTime.date)} />
                )}
                {startTime && endTime && (
                  <Row
                    label="เวลา"
                    value={`${startTime} – ${endTime}${duration ? ` (${duration} ชั่วโมง)` : ''}`}
                  />
                )}
                {locationText !== '—' && <Row label="สถานที่" value={locationText} />}
                {recipientName !== '—' && <Row label="ผู้รับบริการ" value={recipientName} />}

                {/* Fallback when no draft */}
                {!bookingDraft && (
                  <p
                    className="text-center py-2"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E' }}
                  >
                    ยังไม่มีข้อมูลการจอง
                  </p>
                )}
              </div>
            </div>

            {/* Price summary */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons" style={{ fontSize: 16, color: '#52B69A' }}>receipt_long</span>
                <span
                  className="font-bold text-[#1A1A1A]"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, lineHeight: '20px' }}
                >
                  สรุปค่าใช้จ่าย
                </span>
              </div>
              <div
                className="flex flex-col gap-2.5 rounded-xl p-4"
                style={{ background: '#F6FAF9', border: '0.8px solid #E6F5ED' }}
              >
                <Row
                  label={`ค่าบริการ (฿${hourlyRate.toLocaleString()}${duration ? ` × ${duration} ชม.` : '/ชม.'})`}
                  value={
                    <span className="num" style={{ fontFamily: "'Inter', sans-serif" }}>
                      ฿{serviceCost.toLocaleString()}
                    </span>
                  }
                />
                <Row
                  label="ค่าธรรมเนียมแพลตฟอร์ม (10%)"
                  value={
                    <span className="num" style={{ fontFamily: "'Inter', sans-serif" }}>
                      ฿{platformFee.toLocaleString()}
                    </span>
                  }
                />
                <div
                  className="pt-2 mt-1 flex items-center justify-between"
                  style={{ borderTop: '0.8px solid #E6F5ED' }}
                >
                  <span
                    className="font-bold text-[#1A1A1A]"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, lineHeight: '21px' }}
                  >
                    รวมทั้งหมด
                  </span>
                  <span
                    className="font-bold num"
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, color: '#52B69A', lineHeight: '27px' }}
                  >
                    ฿{total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div
              className="flex items-start gap-2 rounded-xl p-3 mb-5"
              style={{ background: '#FFF7ED', border: '0.8px solid #FED7AA' }}
            >
              <span className="material-icons flex-shrink-0" style={{ fontSize: 16, color: '#F59E0B', marginTop: 1 }}>info</span>
              <p
                style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#92400E', lineHeight: '18px' }}
              >
                การส่งคำขอนี้ไม่ใช่การชำระเงิน ผู้ดูแลจะต้องยืนยันการรับงานภายใน 24 ชั่วโมง
              </p>
            </div>

            {/* Conflict / Error Message */}
            {errorMessage && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <span className="material-icons text-red-500 text-base mt-0.5 shrink-0">error_outline</span>
                <p className="text-xs font-semibold text-red-600 leading-relaxed" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 font-bold text-white transition-all duration-150 cursor-pointer hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 14,
                  height: 48,
                  background: '#52B69A',
                  boxShadow: '0px 4px 12px rgba(82, 182, 154, 0.25)',
                  borderRadius: 10,
                  lineHeight: '21px',
                }}
              >
                {isSubmitting ? (
                  <>
                    <span className="material-icons animate-spin" style={{ fontSize: 18 }}>refresh</span>
                    กำลังส่งคำขอ...
                  </>
                ) : (
                  <>
                    <span className="material-icons" style={{ fontSize: 18 }}>check_circle</span>
                    ยืนยันการจอง
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center font-semibold transition-colors duration-150 cursor-pointer hover:bg-gray-50 disabled:opacity-50"
                style={{
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 13,
                  height: 44,
                  background: '#FFFFFF',
                  border: '0.8px solid #E0E2E5',
                  borderRadius: 10,
                  color: '#575859',
                  lineHeight: '20px',
                }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BookingConfirmModal;
