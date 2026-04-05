import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  tagline?: string;
  subtitle?: string;
}

export default function AuthLayout({ children, tagline, subtitle }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* ===== Left Brand Panel ===== */}
      <div className="relative hidden w-[660px] shrink-0 lg:flex flex-col justify-between overflow-hidden bg-[#1B5C48] sticky top-0 h-screen">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-[#52B69A] opacity-15" />

        {/* Content */}
        <div className="relative z-10 px-12 pt-11">
          {/* Logo */}
          <h2
            className="text-5xl font-bold text-white"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            Payung
          </h2>
        </div>

        {/* Tagline */}
        {tagline && (
          <div className="relative z-10 px-12 -mt-20">
            <h1
              className="text-[56px] leading-[70px] font-bold text-white max-w-[529px]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {tagline}
            </h1>
            {subtitle && (
              <p
                className="mt-4 max-w-[340px] text-lg leading-[27px] text-white"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="relative z-10 flex gap-14 px-12 pb-8">
          <div>
            <p
              className="text-[22px] font-bold leading-[27px] text-[#FFC570]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              1,200+
            </p>
            <p
              className="mt-1 text-xs font-medium text-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              ผู้ดูแล
            </p>
          </div>
          <div>
            <p
              className="text-[22px] font-bold leading-[27px] text-[#FFC570]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              5,000+
            </p>
            <p
              className="mt-1 text-xs font-medium text-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              ผู้ใช้งาน
            </p>
          </div>
          <div>
            <p
              className="text-[22px] font-bold leading-[27px] text-[#FFC570]"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              4.9
            </p>
            <p
              className="mt-1 text-xs font-medium text-white"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              คะแนนรีวิว
            </p>
          </div>
        </div>
      </div>

      {/* ===== Right Form Panel ===== */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        {children}
      </div>
    </div>
  );
}
