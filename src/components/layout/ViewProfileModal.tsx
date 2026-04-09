import { useQuery } from '@apollo/client/react';
import { GET_USER } from '../../graphql/queries';
import Avatar from '../ui/Avatar';
import { Icon } from '../ui/Icon';

interface ViewProfileModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onEditClick: () => void;
}

export default function ViewProfileModal({
  isOpen,
  onClose,
  onEditClick,
}: ViewProfileModalProps) {
  const { data, loading } = useQuery(GET_USER);

  if (!isOpen) return null;

  const user = data?.me;
  const userInitial = user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto backdrop-blur-sm">
      <div
        className="w-full max-w-[460px] max-h-[620px] rounded-3xl bg-white p-6 shadow-2xl animate-fadeIn my-8 overflow-y-auto"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">รายละเอียดโปรไฟล์</h2>
            <p className="text-xs text-gray-500 mt-0.5">ดูและจัดการข้อมูลส่วนตัวของคุณ</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none transition-colors w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#52B69A]"></div>
          </div>
        ) : (
          <>
            {/* Avatar Section */}
            <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-200">
              <div className="relative">
                <Avatar
                  name={userInitial}
                  size={70}
                  fallbackColor="#52B69A"
                />
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-3">
                {user?.displayName || user?.email?.split('@')[0] || 'ผู้ใช้'}
              </p>
              <p className="text-xs text-gray-500 mt-1">{user?.email}</p>
            </div>

            {/* Profile Information */}
            <div className="space-y-4">
              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                  ชื่อ-นามสกุล
                </label>
                <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                  {user?.displayName || '—'}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                  เบอร์โทรศัพท์
                </label>
                <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                  {user?.phone || '—'}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                  ที่อยู่
                </label>
                <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-700 min-h-[50px] whitespace-pre-wrap">
                  {user?.address || '—'}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
                  เกี่ยวกับตัวเอง
                </label>
                <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg text-gray-700 min-h-[50px] whitespace-pre-wrap">
                  {user?.bio || '—'}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-100 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                ปิด
              </button>
              <button
                type="button"
                onClick={onEditClick}
                className="flex-1 px-3 py-2 text-sm bg-[#52B69A] text-white rounded-lg font-semibold hover:bg-[#3d9178] transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <Icon name="edit" size="small" />
                แก้ไขโปรไฟล์
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
