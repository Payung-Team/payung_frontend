import React, { useRef } from 'react';
import Avatar from './Avatar';
import { Icon } from './Icon';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

interface ProfileImageUploadProps {
  previewUrl?: string;
  name?: string;
  onFileSelect: (file: File) => void;
  onError: (message: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function ProfileImageUpload({
  previewUrl,
  name,
  onFileSelect,
  onError,
  error,
  disabled = false,
}: ProfileImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset input so selecting the same file again still fires onChange
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      onError('รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP');
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      onError('ไฟล์ใหญ่เกิน 5MB กรุณาเลือกรูปภาพอื่น');
      return;
    }

    onFileSelect(file);
  };

  return (
    <div className="flex flex-col items-center">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="อัปโหลดรูปโปรไฟล์"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`relative ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
      >
        <Avatar src={previewUrl} name={name} size={96} />
        <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#52B69A] shadow-md">
          <Icon name="photo_camera" size="small" color="white" />
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_AVATAR_TYPES.join(',')}
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
      </div>
      <p className="mt-3 text-sm font-medium text-[#575859]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        อัปโหลดรูปโปรไฟล์
      </p>
      {error && (
        <p
          className="mt-1.5 text-[12px] font-medium leading-[15px] text-[#DC3545]"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
