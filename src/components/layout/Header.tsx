import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import Skeleton from '../ui/Skeleton';
import logoImg from '../../assets/logo_2.jpg';
import type { NavItem } from './Navigation';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  readonly navItems?: NavItem[];
  readonly profileDropdown?: React.ReactNode;
  readonly isLoading?: boolean;
  readonly currentUserId?: string;
}

export default function Header({
  navItems = [],
  profileDropdown,
  isLoading = false,
  currentUserId,
}: HeaderProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="h-[63px] border-b border-black/10 bg-white px-4 md:px-6 w-full flex items-center sticky top-0 z-40">
      <div className="flex items-center w-full max-w-[1440px] mx-auto gap-4 md:gap-8">
        <Link to="/" className="flex items-center flex-shrink-0 hover:opacity-80 transition-opacity">
          <img src={logoImg} alt="Payung Logo" className="h-[40px] md:h-[60px] w-auto object-contain" />
        </Link>

        {/* Desktop Navigation */}
        {(navItems.length > 0 || isLoading) && (
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <nav className="flex items-center gap-2">
              {isLoading ? (
                <>
                  <Skeleton width={104} height={36} borderRadius="8px" />
                  <Skeleton width={104} height={36} borderRadius="8px" />
                  <Skeleton width={104} height={36} borderRadius="8px" />
                </>
              ) : (
                navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 h-[36px] px-3 rounded-lg transition-all ${
                      isActive(item.path)
                        ? 'bg-gray-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <Icon 
                      name={item.icon} 
                      size="small" 
                      className="text-[#0A0A0A]" 
                    />
                    <span 
                      className="text-[14px] font-medium leading-[24px] whitespace-nowrap text-[#0A0A0A]"
                      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))
              )}
            </nav>
          </div>
        )}

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 justify-center max-w-[600px] mx-auto">
          <div className="relative w-full h-[36px] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg flex items-center pl-4 pr-1.5">
            <Icon name="search" size="small" className="text-[#717182] flex-shrink-0" />
            <input 
              type="text" 
              placeholder="ค้นหา" 
              className="flex-1 bg-transparent border-none outline-none ml-2 text-[14px] text-[#717182] placeholder:text-[#717182]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            />
            <button className="flex items-center justify-center h-[20px] px-2.5 bg-[#52B69A] border border-black/10 rounded overflow-hidden hover:bg-[#45a086] transition-colors flex-shrink-0 cursor-pointer">
              <span 
                className="text-[14px] leading-tight text-[#E8EBEF]"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                ค้นหา
              </span>
            </button>
          </div>
        </div>

        {/* Right Section - Notifications & Profile */}
        {(profileDropdown || isLoading) && (
          <div className="flex items-center gap-2 md:gap-4 ml-auto flex-shrink-0">
            {isLoading ? (
              <>
                <Skeleton width={32} height={32} borderRadius="50%" circle />
                <Skeleton width={120} height={32} borderRadius="8px" />
              </>
            ) : (
              <>
                {/* Messages Icon */}
                <Link to="/messages" className="relative w-9 h-9 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:cursor-pointer transition-colors rounded-full hover:bg-gray-100">
                  <Icon name="chat" size="medium" />
                </Link>

                {/* Notification Icon */}
                <NotificationBell
                  currentUserId={currentUserId}
                />

                {/* Profile Dropdown */}
                {profileDropdown}
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
