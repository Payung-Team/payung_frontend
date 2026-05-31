import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../../components/ui/Icon';
import { AccountSettingsTab } from './settings/AccountSettingsTab';
import { JobReceptionTab } from './settings/JobReceptionTab';
import { NotificationSettingsTab } from './settings/NotificationSettingsTab';
import { LanguageSettingsTab } from './settings/LanguageSettingsTab';
import { BillingSettingsTab } from './settings/BillingSettingsTab';

interface SettingsMenuItemProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SettingsTab: React.FC<SettingsMenuItemProps> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 md:w-full md:flex-shrink flex items-center gap-3 px-3 md:px-4 py-3 rounded-lg transition-colors text-left whitespace-nowrap ${
      isActive
        ? 'bg-[#E7F5EE] text-[#197A4A]'
        : 'text-[#0A0A0A] hover:bg-gray-100'
    }`}
  >
    <Icon name={icon} size="small" color={isActive ? '#197A4A' : 'currentColor'} />
    <span className="font-medium text-[14px] hidden md:inline">{label}</span>
  </button>
);

type SettingsMenu = 'account' | 'jobReception' | 'notifications' | 'language' | 'billing';

const SETTINGS_TAB_PATHS: Record<SettingsMenu, string> = {
  account: '/caregiver/settings/account',
  jobReception: '/caregiver/settings/job-reception',
  notifications: '/caregiver/settings/notifications',
  language: '/caregiver/settings/language',
  billing: '/caregiver/settings/billing',
};

function resolveSettingsMenu(pathname: string, search: string): SettingsMenu {
  const tabParam = new URLSearchParams(search).get('tab');
  if (tabParam === 'notifications') {
    return 'notifications';
  }

  if (pathname === '/caregiver/availability' || pathname === '/caregiver/settings/job-reception') {
    return 'jobReception';
  }
  if (pathname === '/caregiver/settings/notifications') {
    return 'notifications';
  }
  if (pathname === '/caregiver/settings/language') {
    return 'language';
  }
  if (pathname === '/caregiver/settings/billing') {
    return 'billing';
  }

  return 'account';
}

const CaregiverSettings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const activeMenu = useMemo<SettingsMenu>(
    () => resolveSettingsMenu(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const navigateToMenu = (menu: SettingsMenu) => {
    navigate(SETTINGS_TAB_PATHS[menu]);
  };

  return (
    <div
      className="min-h-screen bg-[#F6F8F9] flex flex-col md:flex-row"
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
    >
      {/* ═══ Tab Navigation (Left Sidebar) ═══ */}
      <div className="w-full md:w-[250px] bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
        {/* Tab Header */}
        <div className="bg-gray-100 px-6 py-4">
          <h3 className="text-[16px] font-bold text-[#0A0A0A]">ตั้งค่าบัญชี</h3>
        </div>

        {/* Tab Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 flex md:flex-col gap-1 md:gap-2 overflow-x-auto md:overflow-x-visible">
          <div className="flex md:flex-col gap-1 md:gap-2 w-max md:w-full">
            <SettingsTab
              icon="account_circle"
              label="บัญชี"
              isActive={activeMenu === 'account'}
              onClick={() => navigateToMenu('account')}
            />
            <SettingsTab
              icon="toggle_on"
              label="การรับงาน"
              isActive={activeMenu === 'jobReception'}
              onClick={() => navigateToMenu('jobReception')}
            />
            <SettingsTab
              icon="notifications"
              label="การแจ้งเตือน"
              isActive={activeMenu === 'notifications'}
              onClick={() => navigateToMenu('notifications')}
            />
            <SettingsTab
              icon="language"
              label="ภาษา"
              isActive={activeMenu === 'language'}
              onClick={() => navigateToMenu('language')}
            />
            <SettingsTab
              icon="payment"
              label="Billing"
              isActive={activeMenu === 'billing'}
              onClick={() => navigateToMenu('billing')}
            />
          </div>
        </div>

        {/* Help Center at bottom */}
        <div className="border-t border-gray-200 px-3 hidden md:block">
          <button className="w-full px-4 py-3 text-left text-[#0A0A0A] hover:bg-gray-100 transition-colors rounded-lg text-[14px] font-medium">
            Help Center
          </button>
        </div>
      </div>

      {/* ═══ Main Content ═══ */}
      <div className="flex-1 overflow-y-auto bg-[#F6F8F9]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 py-4 md:py-7">
          {activeMenu === 'account' && <AccountSettingsTab />}
          {activeMenu === 'jobReception' && <JobReceptionTab />}
          {activeMenu === 'notifications' && <NotificationSettingsTab />}
          {activeMenu === 'language' && <LanguageSettingsTab />}
          {activeMenu === 'billing' && <BillingSettingsTab />}
        </div>
      </div>
    </div>
  );
};

export default CaregiverSettings;
