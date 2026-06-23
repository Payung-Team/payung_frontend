import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';

interface SuccessState {
  ref: string;
  caregiverName?: string;
  paid?: boolean;
}

const COUNTDOWN_START = 5;

const BookingSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as SuccessState | undefined;

  const rawRef = state?.ref ?? '';
  const ref = rawRef
    ? `REF-${rawRef.replaceAll('-', '').slice(-6).toUpperCase()}`
    : 'REF-??????';
  const caregiverName = state?.caregiverName;
  const paid = state?.paid ?? false;

  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const { toasts, removeToast, success: showSuccess } = useToast();
  const toastShown = useRef(false);

  useEffect(() => {
    if (toastShown.current) return;
    toastShown.current = true;

    if (paid) {
      showSuccess(
        <>ชำระเงินสำเร็จ — การจองกับ <strong>{caregiverName ?? 'ผู้ดูแล'}</strong> ได้รับการยืนยันแล้ว</>,
        4000,
      );
    } else {
      showSuccess(
        <>ส่งคำขอจองสำเร็จ — รอ <strong>{caregiverName ?? 'ผู้ดูแล'}</strong> ตอบรับ</>,
        4000,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/bookings', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  const iconBg    = paid ? '#EFF6FF' : '#E6F5ED';
  const iconShadow = paid
    ? '0px 4px 12px rgba(59, 130, 246, 0.15)'
    : '0px 4px 12px rgba(82, 182, 154, 0.15)';
  const iconColor  = paid ? '#3B82F6' : '#3A9A7E';
  const iconName   = paid ? 'verified' : 'check';
  const title      = paid
    ? 'ชำระเงินสำเร็จ — การจองได้รับการยืนยัน'
    : 'ส่งคำขอสำเร็จ — กรุณารอ Caregiver ตอบรับ';
  const cgSuffix   = caregiverName ? ` กับ${caregiverName}` : '';
  const subtitle   = paid
    ? `การจองกับ${caregiverName ?? 'ผู้ดูแล'}ได้รับการยืนยันและชำระเงินเรียบร้อยแล้ว`
    : `ส่งคำขอจองเรียบร้อยแล้ว${cgSuffix}`;
  const refColor   = paid ? '#3B82F6' : '#3A9A7E';
  const btnBg      = paid ? '#3B82F6' : '#52B69A';
  const btnShadow  = paid
    ? '0px 4px 12px rgba(59, 130, 246, 0.2)'
    : '0px 4px 12px rgba(82, 182, 154, 0.2)';

  return (
    <>
    <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
    <div
      className="min-h-screen flex flex-col items-center px-4 sm:px-6"
      style={{ background: '#F6FAF9', paddingTop: 40, paddingBottom: 80 }}
    >
      <div style={{ width: '100%', maxWidth: 600 }}>
        <div
          className="flex flex-col items-start"
          style={{
            background: '#FFFFFF',
            boxShadow: '0px 1px 4px rgba(0,0,0,0.03)',
            borderRadius: 16,
            padding: 'clamp(20px, 5vw, 36px)',
            width: '100%',
          }}
        >
          {/* Icon */}
          <div className="flex justify-center w-full">
            <div
              className="flex items-center justify-center"
              style={{ width: 80, height: 80, background: iconBg, boxShadow: iconShadow, borderRadius: '50%' }}
            >
              <span className="material-icons" style={{ fontSize: 44, color: iconColor, lineHeight: '44px' }}>
                {iconName}
              </span>
            </div>
          </div>

          {/* Payment confirmation banner (paid only) */}
          {paid && (
            <div className="flex justify-center w-full mt-5">
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: '#EFF6FF', border: '0.8px solid #BFDBFE',
                borderRadius: 10, padding: '10px 18px',
              }}>
                <span className="material-icons" style={{ fontSize: 18, color: '#3B82F6', flexShrink: 0 }}>credit_card</span>
                <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#1D4ED8' }}>
                  ชำระเงินเรียบร้อย · ผู้ดูแลได้รับการแจ้งเตือนแล้ว
                </span>
              </div>
            </div>
          )}

          {/* Title */}
          <div className="flex justify-center w-full mt-4">
            <h1
              className="text-center font-bold"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 22, lineHeight: '33px', color: '#1A1A1A', maxWidth: 433 }}
            >
              {title}
            </h1>
          </div>

          {/* Subtitle */}
          <div className="flex justify-center w-full mt-2">
            <p
              className="text-center"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, lineHeight: '22px', color: '#575859', maxWidth: 479 }}
            >
              {subtitle}
              <br />
              หมายเลขอ้างอิง{' '}
              <span className="font-bold num" style={{ fontFamily: "'Inter', sans-serif", color: refColor }}>
                {ref}
              </span>
            </p>
          </div>

          {/* Auto-redirect notice */}
          <div className="flex justify-center w-full mt-6">
            <div
              className="flex items-center justify-center"
              style={{ background: '#F6FAF9', borderRadius: 10, padding: '14px', width: '100%' }}
            >
              <p
                className="text-center font-semibold"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, lineHeight: '20px', color: '#8A8C8E' }}
              >
                กำลังนำคุณเข้าสู่หน้านัดหมายทั้งหมดใน{' '}
                <span className="font-bold num" style={{ fontFamily: "'Inter', sans-serif", color: '#52B69A' }}>
                  {countdown}
                </span>
                {' '}วินาที...
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center w-full mt-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => navigate('/bookings', { replace: true })}
                className="flex items-center justify-center font-bold text-white transition-all duration-150 cursor-pointer hover:opacity-90"
                style={{
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 14, lineHeight: '21px',
                  height: 44, padding: '0 24px',
                  background: btnBg,
                  boxShadow: btnShadow,
                  borderRadius: 8,
                  border: 'none',
                }}
              >
                ไปหน้านัดหมายทั้งหมด
              </button>

              {!paid && (
                <button
                  type="button"
                  onClick={() => navigate('/bookings', { replace: true })}
                  className="flex items-center justify-center font-semibold transition-colors duration-150 cursor-pointer hover:bg-gray-50"
                  style={{
                    fontFamily: "'Bai Jamjuree', sans-serif",
                    fontSize: 13, lineHeight: '20px',
                    height: 40, padding: '0 20px',
                    background: '#FFFFFF',
                    border: '0.8px solid #E0E2E5',
                    borderRadius: 8, color: '#575859',
                  }}
                >
                  ดูรายละเอียดคำขอ
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default BookingSuccessPage;
