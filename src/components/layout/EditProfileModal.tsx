import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { UPDATE_PROFILE, GET_USER } from '../../graphql/queries';
import { useToast } from '../../hooks/useToast';
import Avatar from '../ui/Avatar';

interface EditProfileModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly userEmail?: string;
  readonly currentDisplayName?: string;
  readonly currentPhone?: string;
  readonly currentAddress?: string;
  readonly currentBio?: string;
  readonly onSuccess?: () => void;
}

export default function EditProfileModal({
  isOpen,
  onClose,
  userEmail = '',
  currentDisplayName = '',
  currentPhone = '',
  currentAddress = '',
  currentBio = '',
  onSuccess,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [phone, setPhone] = useState(currentPhone);
  const [address, setAddress] = useState(currentAddress);
  const [bio, setBio] = useState(currentBio);
  const [error, setError] = useState('');
  const { success: showSuccess, error: showError } = useToast();
  
  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE, {
    refetchQueries: [{ query: GET_USER }],
    awaitRefetchQueries: true,
    onCompleted: (data: unknown) => {
      // อัปเดต state ของ modal ด้วยข้อมูลใหม่จาก mutation result
      const updatedUser = (data as any)?.updateProfile;
      if (updatedUser) {
        setDisplayName(updatedUser.displayName || '');
        setPhone(updatedUser.phone || '');
        setAddress(updatedUser.address || '');
        setBio(updatedUser.bio || '');
      }
      showSuccess('โปรไฟล์ได้รับการอัปเดตแล้ว');
      onSuccess?.();
      // หน่วงเวลาสักครู่ให้ user เห็นข้อมูลถูกอัปเดต แล้วปิด modal
      setTimeout(() => {
        handleClose();
      }, 1500);
    },
    onError: (err: Error) => {
      const errorMessage = err.message || 'เกิดข้อผิดพลาดในการอัปเดต';
      showError(errorMessage);
      setError(errorMessage);
    },
  });

  const handleClose = () => {
    setDisplayName(currentDisplayName);
    setPhone(currentPhone);
    setAddress(currentAddress);
    setBio(currentBio);
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!displayName.trim()) {
      setError('กรุณากรอกชื่อที่แสดง');
      return;
    }

    if (displayName.length > 50) {
      setError('ชื่อที่แสดงต้องไม่เกิน 50 ตัวอักษร');
      return;
    }

    try {
      await updateProfile({
        variables: {
          displayName: displayName.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          bio: bio.trim() || undefined,
        },
      });
    } catch {
      // Error is handled in onError
    }
  };

  if (!isOpen) return null;

  const userInitial = displayName.charAt(0).toUpperCase() || userEmail.charAt(0).toUpperCase() || '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto backdrop-blur-sm">
      <div
        className="w-full max-w-[460px] max-h-[620px] rounded-3xl bg-white p-6 shadow-2xl animate-fadeIn my-8 overflow-y-auto"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {/* Header with Close Button */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1A1A1A]">แก้ไขโปรไฟล์</h2>
            <p className="text-xs text-gray-500 mt-0.5">อัปเดตข้อมูลส่วนตัวของคุณ</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none transition-colors w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Avatar Section */}
        <div className="flex flex-col items-center mb-6 pb-6 border-b border-gray-200">
          <div className="relative">
            <Avatar
              name={userInitial}
              size={70}
              fallbackColor="#52B69A"
            />
          </div>
          <button
            type="button"
            className="mt-3 px-4 py-1.5 bg-[#52B69A] text-white rounded-lg font-semibold text-xs hover:bg-[#3d9178] transition-colors shadow-md"
            aria-label="Change avatar"
          >
            เปลี่ยนรูปโปรไฟล์
          </button>
          <p className="text-xs text-gray-500 mt-3 text-center">
            {displayName || userEmail?.split('@')[0] || 'ผู้ใช้'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
              ชื่อ-นามสกุล <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="กรอกชื่อที่แสดง"
              maxLength={50}
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none transition-all duration-200 focus:border-[#52B69A] focus:ring-2 focus:ring-[#52B69A]/20 disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-400"
            />
            <div className="text-xs text-gray-500 text-right mt-0.5">
              {displayName.length}/50
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
              เบอร์โทรศัพท์
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เบอร์โทรศัพท์ของคุณ"
              disabled={loading}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none transition-all duration-200 focus:border-[#52B69A] focus:ring-2 focus:ring-[#52B69A]/20 disabled:bg-gray-50 disabled:text-gray-500 placeholder:text-gray-400"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
              ที่อยู่
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ที่อยู่ปัจจุบันของคุณ"
              disabled={loading}
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none transition-all duration-200 focus:border-[#52B69A] focus:ring-2 focus:ring-[#52B69A]/20 disabled:bg-gray-50 disabled:text-gray-500 resize-none placeholder:text-gray-400"
            />
            <div className="text-xs text-gray-500 text-right mt-0.5">
              {address.length}/200
            </div>
          </div>

          {/* Bio / Description */}
          <div>
            <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">
              เกี่ยวกับตัวเอง
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="เกี่ยวกับตัวเอง"
              disabled={loading}
              rows={2}
              maxLength={300}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none transition-all duration-200 focus:border-[#52B69A] focus:ring-2 focus:ring-[#52B69A]/20 disabled:bg-gray-50 disabled:text-gray-500 resize-none placeholder:text-gray-400"
            />
            <div className="text-xs text-gray-500 text-right mt-0.5">
              {bio.length}/300
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2">
              <span className="text-base">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-3 py-2 text-sm bg-[#52B69A] text-white rounded-lg font-semibold hover:bg-[#3d9178] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin">⏳</span>
                  บันทึก
                </span>
              ) : (
                '✓ บันทึกการเปลี่ยนแปลง'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
