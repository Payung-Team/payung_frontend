import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { ApolloError } from '@apollo/client';
import { UPDATE_PROFILE, GET_USER } from '../../graphql/queries';
import { useToast } from '../../hooks/useToast';
import Avatar from '../ui/Avatar';
import {
  ALLOWED_PROFILE_PHOTO_TYPES,
  uploadProfilePhoto,
  validateProfilePhoto,
} from '../../lib/profilePhoto';

interface EditProfileModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly userEmail?: string;
  readonly currentDisplayName?: string;
  readonly currentPhone?: string;
  readonly currentAddress?: string;
  readonly currentBio?: string;
  readonly currentAvatarUrl?: string;
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
  currentAvatarUrl,
  onSuccess,
}: EditProfileModalProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState(currentPhone);
  const [address, setAddress] = useState(currentAddress);
  const [bio, setBio] = useState(currentBio);
  const [error, setError] = useState('');
  // รูปที่เลือกไว้แต่ยังไม่อัป — อัปตอนกด "บันทึก" เพื่อให้ "ยกเลิก" ยกเลิกรูปได้จริง
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: showSuccess, error: showError } = useToast();

  // ปล่อย blob URL ของพรีวิวเก่าทุกครั้งที่เปลี่ยนรูป/ปิด modal ไม่งั้นค้างใน memory
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  const [updateProfile, { loading }] = useMutation(UPDATE_PROFILE, {
    refetchQueries: [{ query: GET_USER }],
    awaitRefetchQueries: true,
    onCompleted: (data) => {
      // อัปเดต state ของ modal ด้วยข้อมูลใหม่จาก mutation result
      const updatedUser = data.updateProfile;
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
    onError: (err: ApolloError) => {
      const errorMessage = err.message || 'เกิดข้อผิดพลาดในการอัปเดต';
      showError(errorMessage);
      setError(errorMessage);
    },
  });

  const handleClose = () => {
    setDisplayName(currentDisplayName);
    setFullName('');
    setPhone(currentPhone);
    setAddress(currentAddress);
    setBio(currentBio);
    setError('');
    setNotice('');
    setPhotoFile(null);
    setPhotoPreview(null);
    onClose();
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset เพื่อให้เลือกไฟล์เดิมซ้ำแล้ว onChange ยังทำงาน
    e.target.value = '';
    if (!file) return;

    const invalid = validateProfilePhoto(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError('');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!displayName.trim()) {
      setError('กรุณากรอกชื่อที่แสดง');
      return;
    }

    if (displayName.length > 50) {
      setError('ชื่อที่แสดงต้องไม่เกิน 50 ตัวอักษร');
      return;
    }

    // อัปรูปก่อน — ล้มแล้วหยุด ไม่บันทึกฟอร์ม ผู้ใช้จะได้ลองใหม่ได้ทั้งชุด
    // สำเร็จแล้วเคลียร์ photoFile ทันที ถ้า updateProfile ล้มแล้วกดบันทึกซ้ำจะได้ไม่อัปรูปเดิมอีกรอบ
    if (photoFile) {
      setPhotoUploading(true);
      try {
        const result = await uploadProfilePhoto(photoFile);
        setPhotoFile(null);
        if (result.reviewStatus === 'pending') {
          setNotice('อัปโหลดรูปแล้ว รอแอดมินอนุมัติก่อนผู้อื่นจะเห็นรูปใหม่');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      } finally {
        setPhotoUploading(false);
      }
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

  const busy = loading || photoUploading;
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
              src={photoPreview ?? currentAvatarUrl}
              name={userInitial}
              size={70}
              fallbackColor="#52B69A"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_PROFILE_PHOTO_TYPES.join(',')}
            onChange={handlePhotoChange}
            disabled={busy}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="mt-3 px-4 py-1.5 bg-[#52B69A] text-white rounded-lg font-semibold text-xs hover:bg-[#3d9178] transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Change avatar"
          >
            เปลี่ยนรูปโปรไฟล์
          </button>
          {photoFile && (
            <p className="text-[11px] text-[#52B69A] mt-1.5 text-center">
              รูปใหม่จะถูกบันทึกเมื่อกด "บันทึกการเปลี่ยนแปลง"
            </p>
          )}
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
              disabled={busy}
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
              disabled={busy}
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
              disabled={busy}
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
              disabled={busy}
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

          {notice && (
            <div className="text-xs text-[#3A9A7E] bg-[#E6F5ED] p-3 rounded-lg border border-[#A7D8C2]">
              {notice}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className="flex-1 px-3 py-2 text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 px-3 py-2 text-sm bg-[#52B69A] text-white rounded-lg font-semibold hover:bg-[#3d9178] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin">⏳</span>
                  {photoUploading ? 'กำลังอัปโหลดรูป' : 'บันทึก'}
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
