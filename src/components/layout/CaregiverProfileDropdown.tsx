import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import Avatar from '../ui/Avatar';
import { Icon } from '../ui/Icon';

interface CaregiverProfileDropdownProps {
  onSettingsClick?: () => void;
  avatarFallbackColor?: string;
  displayName?: string;
}

export default function CaregiverProfileDropdown({
  onSettingsClick,
  avatarFallbackColor = '#52B69A',
  displayName,
}: CaregiverProfileDropdownProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success: showSuccess } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const displayUserName = displayName || user?.email?.split('@')[0] || 'User';

  const handleLogout = async () => {
    const result = await logout();
    if (!result.error) {
      showSuccess('ออกจากระบบสำเร็จ');
      navigate('/login');
    }
  };

  const handleSettings = () => {
    setIsOpen(false);
    navigate('/caregiver/settings');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center hover:opacity-80 transition-opacity hover:cursor-pointer"
      >
        <Avatar
          name={displayUserName}
          size={36}
          fallbackColor={avatarFallbackColor}
        />
        <span 
          className="hidden md:block text-[14px] font-medium text-[#0A0A0A] ml-3"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {displayUserName}
        </span>
        <Icon 
          name="expand_more" 
          className="hidden md:block text-[#0A0A0A] ml-4" 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 animate-fadeIn">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          <div className="py-2">
            <button
              onClick={handleSettings}
              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-3 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Icon name="settings" size="small" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">ตั้งค่า</p>
              </div>
            </button>

            <div className="border-t border-gray-200 my-2" />

            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-3 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <Icon name="logout" size="small" color="currentColor" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-600">ออกจากระบบ</p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
