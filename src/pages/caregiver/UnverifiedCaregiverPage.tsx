import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';

/**
 * Page displayed when unverified caregivers try to access the job search section
 * Explains they need to complete KYC verification first
 */
export default function UnverifiedCaregiverPage() {
  return (
    <div className="min-h-[calc(100vh-120px)] bg-[#F6FAF9] flex items-center justify-center px-4 py-12">
      <div
        className="w-full max-w-[600px] bg-white rounded-3xl border border-[#F1F5F9] flex flex-col items-center justify-center gap-6 px-8 py-12"
        style={{
          boxShadow: '0 12px 28px -6px rgba(15,23,43,0.06), 0 1px 2px 0 rgba(15,23,43,0.04)',
        }}
      >
        {/* Shield Icon */}
        <div className="w-24 h-24 rounded-full bg-[#E7F5EE] flex items-center justify-center">
          <svg width="56" height="56" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 3.33334L5 9.16668V19.1667C5 27.6667 11.6 35.6167 20 37.5C28.4 35.6167 35 27.6667 35 19.1667V9.16668L20 3.33334Z"
              fill="#52B69A"
              opacity="0.25"
            />
            <path
              d="M20 3.33334L5 9.16668V19.1667C5 27.6667 11.6 35.6167 20 37.5C28.4 35.6167 35 27.6667 35 19.1667V9.16668L20 3.33334Z"
              stroke="#2D6A58"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Main Title */}
        <h1 
          className="text-3xl font-bold text-center text-[#1A1A1A]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          ยืนยันตัวตนเพื่อรับงาน
        </h1>

        {/* Subtitle */}
        <p 
          className="text-center text-[#6B7280] text-lg"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          เพื่อให้มั่นใจว่าคุณและผู้มอบใจไว้สำหรับการดูแลสามารถไว้ใจกันได้ เราจำเป็นต้องยืนยันตัวตนของคุณก่อน
        </p>

        {/* Checklist */}
        <div className="w-full space-y-3 mt-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E7F5EE] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon name="check" color="#2D6A58" size="small" />
            </div>
            <span className="text-[#0A0A0A] font-medium" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              กรอกข้อมูลส่วนตัวที่ถูกต้อง
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E7F5EE] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon name="check" color="#2D6A58" size="small" />
            </div>
            <span className="text-[#0A0A0A] font-medium" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              อัปโหลดเอกสารยืนยันตัวตน
            </span>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E7F5EE] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon name="check" color="#2D6A58" size="small" />
            </div>
            <span className="text-[#0A0A0A] font-medium" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              รอการยืนยันจากทีมสนับสนุนของเรา
            </span>
          </div>
        </div>

        {/* CTA Button */}
        <Link 
          to="/kyc"
          className="w-full mt-8 px-6 py-3 bg-[#52B69A] text-white font-bold rounded-xl hover:bg-[#45a086] transition-colors text-center"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          เริ่มยืนยันตัวตนตอนนี้
        </Link>

        {/* Secondary Link */}
        <Link 
          to="/caregiver/settings"
          className="text-[#52B69A] font-semibold hover:underline"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          ไปที่การตั้งค่าแทน
        </Link>
      </div>
    </div>
  );
}
