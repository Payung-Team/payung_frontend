import React, { useEffect, useRef, useState } from 'react';
import Avatar from '../ui/Avatar';
import { Icon } from '../ui/Icon';
import PhotoCropModal from './PhotoCropModal';
import { validatePhotoSourceFile } from '../../lib/profilePhotoCrop';
import { uploadCroppedProfilePhoto } from '../../lib/profilePhoto';
import {
  clearPhotoReviewState,
  getPhotoReviewState,
  savePendingPhotoReview,
  type PhotoReviewState,
} from '../../lib/profilePhotoReviewState';
import type { ToastType } from '../ui/Toast';

interface ProfilePhotoUploadCardProps {
  caregiverId?: string;
  currentAvatarUrl?: string;
  displayName: string;
  onToast: (type: ToastType, message: string) => void;
}

export default function ProfilePhotoUploadCard({
  caregiverId,
  currentAvatarUrl,
  displayName,
  onToast,
}: ProfilePhotoUploadCardProps) {
  const [reviewState, setReviewState] = useState<PhotoReviewState | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!caregiverId) return;
    setReviewState(getPhotoReviewState(caregiverId));
  }, [caregiverId]);

  // ปล่อย object URL ของพรีวิวหลัง crop ทุกครั้งที่เปลี่ยน/เลิกใช้ ไม่งั้นค้างใน memory
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openPicker = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset ให้เลือกไฟล์เดิมซ้ำแล้ว onChange ยังทำงาน
    e.target.value = '';
    if (!file) return;

    const invalid = validatePhotoSourceFile(file);
    if (invalid) {
      onToast('error', invalid);
      return;
    }
    setPickedFile(file);
  };

  const handleCropCancel = () => setPickedFile(null);

  const handleCropConfirm = (blob: Blob) => {
    setPickedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingBlob(blob);
    setPreviewUrl(URL.createObjectURL(blob));
  };

  const handleDiscardPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingBlob(null);
    setPreviewUrl(null);
  };

  const handleUpload = async () => {
    if (!pendingBlob || !caregiverId) return;
    setUploading(true);
    try {
      const result = await uploadCroppedProfilePhoto(pendingBlob);
      savePendingPhotoReview(caregiverId, result.photoUrl);
      setReviewState(getPhotoReviewState(caregiverId));
      onToast('success', 'อัปโหลดรูปแล้ว รอแอดมินอนุมัติก่อนผู้ใช้อื่นจะเห็นรูปใหม่');
      handleDiscardPreview();
    } catch (err) {
      onToast('error', err instanceof Error ? err.message : 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setUploading(false);
    }
  };

  const handleReuploadAfterRejection = () => {
    if (caregiverId) clearPhotoReviewState(caregiverId);
    setReviewState(null);
    openPicker();
  };

  return (
    <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.1)] p-6">
      <h3 className="text-[16px] font-semibold text-[#0A0A0A] mb-1">รูปโปรไฟล์</h3>
      <p className="text-[12px] text-[#717182] mb-4">
        ใช้รูปหน้าตรงที่เห็นใบหน้าชัดเจน รูปใหม่ต้องผ่านการอนุมัติจากแอดมินก่อนผู้ใช้อื่นจะเห็น
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />

      {/* ขั้นพรีวิวหลัง crop — ยังไม่ส่งจนกว่าจะกดยืนยัน */}
      {previewUrl ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={previewUrl}
            alt="พรีวิวรูปที่จะอัปโหลด"
            className="w-28 h-28 rounded-full object-cover border-[3px] border-white shadow-[0_4px_16px_rgba(82,182,154,0.2)]"
          />
          <p className="text-[12px] text-[#717182]">พรีวิวรูปที่จะส่ง — ยังไม่ถูกอัปโหลด</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDiscardPreview}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 disabled:opacity-50"
            >
              เลือกรูปใหม่
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 rounded-lg text-[13px] font-medium text-white bg-[#52B69A] hover:bg-[#409E82] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'กำลังอัปโหลด...' : 'ยืนยันและอัปโหลด'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Avatar
            src={reviewState?.status === 'pending' ? reviewState.photoUrl ?? undefined : currentAvatarUrl}
            name={displayName}
            size={112}
            fallbackColor="#52B69A"
          />

          {reviewState?.status === 'pending' && (
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-semibold bg-[#FFF4E5] text-[#B26A00]">
                <Icon name="hourglass_top" size="small" color="#B26A00" />
                รออนุมัติ
              </span>
              <p className="text-[12px] text-[#717182] max-w-[280px]">
                ผู้ใช้อื่นยังเห็นรูปเดิมของคุณ จนกว่าแอดมินจะอนุมัติรูปใหม่นี้
              </p>
            </div>
          )}

          {reviewState?.status === 'rejected' && (
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-semibold bg-red-50 text-red-600">
                <Icon name="cancel" size="small" color="#DC3545" />
                ถูกปฏิเสธ
              </span>
              {reviewState.rejectionReason && (
                <p className="text-[12px] text-red-500 max-w-[280px]">{reviewState.rejectionReason}</p>
              )}
            </div>
          )}

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={reviewState?.status === 'rejected' ? handleReuploadAfterRejection : openPicker}
              disabled={uploading}
              className="px-4 py-2 bg-[#52B69A] text-white rounded-lg font-semibold text-[13px] hover:bg-[#409E82] transition-colors disabled:opacity-50"
            >
              {reviewState?.status === 'rejected' ? 'อัปโหลดรูปใหม่' : 'เปลี่ยนรูปโปรไฟล์'}
            </button>
            {reviewState?.status === 'pending' && (
              <button
                type="button"
                onClick={openPicker}
                disabled={uploading}
                className="text-[12px] text-[#717182] underline hover:text-[#0A0A0A] disabled:opacity-50"
              >
                เลือกรูปใหม่อีกครั้ง
              </button>
            )}
          </div>
        </div>
      )}

      {pickedFile && (
        <PhotoCropModal file={pickedFile} onCancel={handleCropCancel} onConfirm={handleCropConfirm} />
      )}
    </div>
  );
}
