import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import Skeleton from '../ui/Skeleton';
import logoImg from '../../assets/logo_2.jpg';
import type { NavItem } from './Navigation';

interface HeaderProps {
  navItems?: NavItem[];
  profileDropdown?: React.ReactNode;
  notificationCount?: number;
  brandColor?: string;
  isLoading?: boolean;
}

export default function Header({
  navItems = [],
  profileDropdown,
  notificationCount = 0,
  brandColor = '#52B69A',
  isLoading = false,
}: HeaderProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="h-16 border-b border-gray-200 bg-white px-4 md:px-6 flex items-center sticky top-0 z-40">
      <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <img src={logoImg} alt="Payung Logo" className="h-14 w-auto" />
      </Link>

      {/* Desktop Navigation */}
      {(navItems.length > 0 || isLoading) && (
        <div className="hidden md:flex items-center gap-6 flex-1 justify-center">
          <nav className="flex items-center gap-2">
            {isLoading ? (
              <>
                <Skeleton width={80} height={32} borderRadius="12px" />
                <Skeleton width={80} height={32} borderRadius="12px" />
                <Skeleton width={80} height={32} borderRadius="12px" />
              </>
            ) : (
              navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm px-4 py-2 rounded-lg transition-all ${
                    isActive(item.path)
                      ? 'font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: isActive(item.path) ? '#F0FAF4' : undefined,
                    color: isActive(item.path) ? brandColor : undefined,
                  }}
                >
                  {item.label}
                </Link>
              ))
            )}
          </nav>
        </div>
      )}

      {/* Right Section - Notifications & Profile */}
      {(profileDropdown || isLoading) && (
        <div className="hidden md:flex items-center gap-4 ml-auto">
          {isLoading ? (
            <>
              <Skeleton width={24} height={24} borderRadius="4px" />
              <Skeleton width={40} height={40} borderRadius="50%" circle />
            </>
          ) : (
            <>
              {/* Notification Icon */}
              <button className="relative text-gray-600 hover:text-gray-900 transition-colors">
                <Icon name="notifications" size="medium" />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Profile Dropdown */}
              {profileDropdown}
            </>
          )}
        </div>
      )}

      {/* Mobile Profile Only */}
      {profileDropdown && (
        <div className="md:hidden ml-auto">
          {profileDropdown}
        </div>
      )}
    </header>
  );
}
