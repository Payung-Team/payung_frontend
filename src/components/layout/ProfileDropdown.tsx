import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import Avatar from '../ui/Avatar';
import { Icon } from '../ui/Icon';

interface ProfileDropdownProps {
  onViewProfileClick?: () => void;
  onEditProfileClick?: () => void;
  avatarFallbackColor?: string;
}

export default function ProfileDropdown({
  onViewProfileClick,
  onEditProfileClick,
  avatarFallbackColor = '#52B69A',
}: ProfileDropdownProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success: showSuccess } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    const result = await logout();
    if (!result.error) {
      showSuccess('ออกจากระบบสำเร็จ');
      navigate('/login');
    }
  };

  const handleViewProfile = () => {
    setIsOpen(false);
    onViewProfileClick?.();
  };

  const handleEditProfile = () => {
    setIsOpen(false);
    onEditProfileClick?.();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <Avatar
          name={user?.email?.split('@')[0] || 'User'}
          size={36}
          fallbackColor={avatarFallbackColor}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 animate-fadeIn">
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-900">
              {user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>

          <div className="py-2">
            {onViewProfileClick && (
              <button
                onClick={handleViewProfile}
                className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2 transition-colors"
              >
                <Icon name="account_box" size="small" />
                ดูโปรไฟล์
              </button>
            )}

            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left flex items-center gap-2 transition-colors"
            >
              <Icon name="logout" size="small" color="currentColor" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
