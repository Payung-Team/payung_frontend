import React from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import type { NavItem } from './Navigation';

interface PublicLayoutProps {
  readonly children: React.ReactNode;
}

/**
 * Shell for the signed-out landing page: the same header chrome as AppLayout but
 * with sign-in/sign-up buttons instead of the profile/notification section, and
 * no bottom navigation. On small screens the desktop nav is hidden (as in
 * AppLayout) and the logo doubles as the link back to the landing page.
 */
const publicNavItems: NavItem[] = [{ path: '/', label: 'หน้าหลัก', icon: 'home' }];

export default function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F6FAF9] flex flex-col" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header
          navItems={publicNavItems}
          homeRoute="/"
          rightSlot={
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                to="/login"
                className="flex items-center h-[36px] px-3 md:px-4 rounded-lg border border-[#009265] text-[14px] font-medium text-[#009265] no-underline whitespace-nowrap transition-colors hover:bg-[#F0FAF4]"
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                to="/register"
                className="flex items-center h-[36px] px-3 md:px-4 rounded-lg bg-[#009265] text-[14px] font-medium text-white no-underline whitespace-nowrap transition-colors hover:bg-[#007A54]"
              >
                สมัครสมาชิก
              </Link>
            </div>
          }
        />
      </div>

      <main className="flex-1 pt-[70px]">{children}</main>
    </div>
  );
}
