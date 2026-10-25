import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import PhotoCropModal from '../../components/caregiver/PhotoCropModal';
import { validatePhotoSourceFile } from '../../lib/profilePhotoCrop';

interface KycProfilePhotoPickerProps {
  /** รูปที่ crop แล้ว (JPEG) — เก็บใน KycContext จนกว่าจะส่ง KYC */
  value: Blob | null;
  onChange: (blob: Blob | null) => void;
  /** ข้อความ error จากฟอร์ม (เช่น ยังไม่ได้เลือกรูป) */
  error?: string;
  /** false = ไม่บังคับ (ยื่นใหม่ที่เคยมีรูปแล้ว) */
  required?: boolean;
}

/**
 * เลือก + crop รูปโปรไฟล์ในขั้น "ข้อมูลส่วนตัว" ของ KYC — หน้าตาและขั้นตอนเดียวกับ ProfilePhotoUploadCard
 * (เลือกไฟล์ → crop → พรีวิว) ต่างกันที่ไม่อัปโหลดทันที: แถว caregiver ยังไม่มีจนกว่าจะส่ง KYC
 * (POST /api/v1/profile/photo ตอบ 403) จึงถือ blob ไว้ แล้ว KycStep4 อัปโหลดหลังส่งสำเร็จ
 */
export default function KycProfilePhotoPicker({ value, onChange, error: formError, required = true }: KycProfilePhotoPickerProps) {
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState('');
  const error = fileError || formError;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // สร้าง/ปล่อย object URL ตาม blob ปัจจุบัน — ไม่งั้นค้างใน memory
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const openPicker = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset ให้เลือกไฟล์เดิมซ้ำแล้ว onChange ยังทำงาน
    e.target.value = '';
    if (!file) return;

    const invalid = validatePhotoSourceFile(file);
    if (invalid) {
      setFileError(invalid);
      return;
    }
    setFileError('');
    setPickedFile(file);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="text-center">
        <p className="text-sm font-medium text-gray-700" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          รูปโปรไฟล์{' '}
          {required
            ? <span className="text-red-600" aria-hidden="true">*</span>
            : <span className="text-[#717182] font-normal">(ไม่บังคับ)</span>}
        </p>
        <p className="text-xs text-[#717182] mt-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          {required ? 'ต้องอัปโหลดรูปเพื่อยืนยันตัวตน · ' : ''}ใช้รูปหน้าตรงที่เห็นใบหน้าชัดเจน รูปต้องผ่านการอนุมัติจากแอดมินก่อนผู้ใช้อื่นจะเห็น
        </p>
      </div>

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="พรีวิวรูปโปรไฟล์"
          className="w-28 h-28 rounded-full object-cover border-[3px] border-white shadow-[0_4px_16px_rgba(82,182,154,0.2)]"
        />
      ) : (
        <button
          type="button"
          onClick={openPicker}
          aria-label="เลือกรูปโปรไฟล์"
          className="w-28 h-28 rounded-full bg-[#F3F3F5] border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
        >
          <Icon name="add_a_photo" color="#717182" style={{ fontSize: '32px' }} />
        </button>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={openPicker}
          className="px-4 py-2 bg-[#52B69A] text-white rounded-lg font-semibold text-[13px] hover:bg-[#409E82] transition-colors cursor-pointer"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          {value ? 'เปลี่ยนรูปโปรไฟล์' : 'เลือกรูปโปรไฟล์'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 cursor-pointer"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ลบรูป
          </button>
        )}
      </div>

      {error && (
        <span className="text-sm text-red-500" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{error}</span>
      )}

      {pickedFile && (
        <PhotoCropModal
          file={pickedFile}
          onCancel={() => setPickedFile(null)}
          onConfirm={(blob) => {
            setPickedFile(null);
            onChange(blob);
          }}
        />
      )}
    </div>
  );
}
