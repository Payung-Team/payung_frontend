import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SuccessState {
  ref: string;
  caregiverName?: string;
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

  const [countdown, setCountdown] = useState(COUNTDOWN_START);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/bookings', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 sm:px-6"
      style={{ background: '#F6FAF9', paddingTop: 40, paddingBottom: 80 }}
    >
      {/* Card */}
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
          {/* Success icon */}
          <div className="flex justify-center w-full">
            <div
              className="flex items-center justify-center"
              style={{
                width: 80,
                height: 80,
                background: '#E6F5ED',
                boxShadow: '0px 4px 12px rgba(82, 182, 154, 0.15)',
                borderRadius: '50%',
              }}
            >
              <span
                className="material-icons"
                style={{ fontSize: 44, color: '#3A9A7E', lineHeight: '44px' }}
              >
                check
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="flex justify-center w-full mt-5">
            <h1
              className="text-center font-bold"
              style={{
                fontFamily: "'Bai Jamjuree', sans-serif",
                fontSize: 22,
                lineHeight: '33px',
                color: '#1A1A1A',
                maxWidth: 433,
              }}
            >
              ส่งคำขอสำเร็จ — กรุณารอ Caregiver ตอบรับ
            </h1>
          </div>

          {/* Subtitle */}
          <div className="flex justify-center w-full mt-2">
            <p
              className="text-center"
              style={{
                fontFamily: "'Bai Jamjuree', sans-serif",
                fontSize: 14,
                lineHeight: '22px',
                color: '#575859',
                maxWidth: 479,
              }}
            >
              ส่งคำขอจองเรียบร้อยแล้ว{caregiverName ? ` กับ${caregiverName}` : ''}
              <br />
              หมายเลขอ้างอิงคือ{' '}
              <span
                className="font-bold num"
                style={{ fontFamily: "'Inter', sans-serif", color: '#3A9A7E' }}
              >
                {ref}
              </span>
            </p>
          </div>

          {/* Auto-redirect notice */}
          <div
            className="flex justify-center w-full mt-6"
          >
            <div
              className="flex items-center justify-center"
              style={{
                background: '#F6FAF9',
                borderRadius: 10,
                padding: '14px',
                width: '100%',
              }}
            >
              <p
                className="text-center font-semibold"
                style={{
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 13,
                  lineHeight: '20px',
                  color: '#8A8C8E',
                }}
              >
                กำลังนำคุณเข้าสู่หน้านัดหมายทั้งหมดใน{' '}
                <span
                  className="font-bold num"
                  style={{ fontFamily: "'Inter', sans-serif", color: '#52B69A' }}
                >
                  {countdown}
                </span>
                {' '}วินาที...
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center w-full mt-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {/* Primary button */}
              <button
                type="button"
                onClick={() => navigate('/bookings', { replace: true })}
                className="flex items-center justify-center font-bold text-white transition-all duration-150 cursor-pointer hover:opacity-90"
                style={{
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 14,
                  lineHeight: '21px',
                  height: 44,
                  padding: '0 24px',
                  background: '#52B69A',
                  boxShadow: '0px 4px 12px rgba(82, 182, 154, 0.2)',
                  borderRadius: 8,
                }}
              >
                ไปหน้านัดหมายทั้งหมด
              </button>

              {/* Secondary button */}
              <button
                type="button"
                onClick={() => navigate('/bookings', { replace: true })}
                className="flex items-center justify-center font-semibold transition-colors duration-150 cursor-pointer hover:bg-gray-50"
                style={{
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontSize: 13,
                  lineHeight: '20px',
                  height: 40,
                  padding: '0 20px',
                  background: '#FFFFFF',
                  border: '0.8px solid #E0E2E5',
                  borderRadius: 8,
                  color: '#575859',
                }}
              >
                ดูรายละเอียดคำขอ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
