import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import logoImg from '../../assets/logo_5.png';

interface AuthLayoutProps {
  children: React.ReactNode;
  tagline?: string;
  subtitle?: string;
  /** Shows a link back to the public homepage. Opt-in: it does not belong on
      the flows a signed-in user is required to finish (onboarding, forced
      password change). */
  showBackToHome?: boolean;
}

export default function AuthLayout({ children, tagline, subtitle, showBackToHome = false }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* ===== Left Brand Panel ===== */}
      <div className="relative hidden w-[660px] shrink-0 lg:flex flex-col justify-between overflow-hidden bg-[#1B5C48] sticky top-0 h-screen">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-[#52B69A] opacity-15" />

        {/* Content */}
        <div className="relative z-10 px-12 pt-11">
          {/* Logo */}
          <img src={logoImg} alt="Payung" className="h-[100px] w-auto object-contain" />
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

        {/* Bottom spacer — keeps the tagline in place under justify-between */}
        <div className="pb-8" aria-hidden="true" />
      </div>

      {/* ===== Right Form Panel ===== */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10">
        {/* In normal flow above the form, not absolute — on tall forms an
            absolute link overlaps the heading. Lives in the right panel, not
            the brand panel, which is hidden below lg. */}
        {showBackToHome && (
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-[#5F6B66] no-underline transition-colors hover:bg-[#F0FAF4] hover:text-[#1B5C48]"
          >
            <Icon name="home" className="!text-[20px]" color="currentColor" />
            หน้าหลัก
          </Link>
        )}
        {children}
      </div>
    </div>
  );
}
