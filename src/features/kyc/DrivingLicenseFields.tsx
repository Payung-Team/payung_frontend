import { useRef } from 'react';
import Icon from '../../components/ui/Icon';
import type { LicenseFileUpload } from '../../context/KycContext';
import { bangkokYmd } from '../../lib/license';
import type { DrivingLicenseUploadState } from './drivingLicenseDraft';
import { formatFileSize, useLicenseStrings } from '../../lib/licenseStrings';
import { useDrivingLicenseStrings } from '../../lib/drivingLicenseStrings';

const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

function FieldMessage({ id, error, hint, icon }: { id: string; error?: string; hint?: string; icon: string }) {
  if (error) {
    return (
      <span id={id} role="alert" className="flex items-start gap-1 text-[12.5px] leading-snug text-[#DC2626]" style={font}>
        <Icon name="error" style={{ fontSize: 15 }} className="mt-px" color="currentColor" />
        {error}
      </span>
    );
  }
  if (!hint) return null;
  return (
    <span id={id} className="flex items-start gap-1 text-[12.5px] leading-snug text-[#64748B]" style={font}>
      <Icon name={icon} style={{ fontSize: 15 }} className="mt-px" color="currentColor" />
      {hint}
    </span>
  );
}

/**
 * ช่องรูปใบขับขี่ + วันหมดอายุ (PYG-598 · ดีไซน์ PYG-595 "สถานะช่องใบขับขี่")
 * หน้าตาเดียวกับช่องใบประกอบฯ (PYG-584) — ใช้ทั้งในฟอร์ม KYC ขั้น 2 และในการ์ดสถานะ (อัปโหลดใบใหม่)
 * component นี้แสดงผลอย่างเดียว ผู้เรียกเป็นคนอัปโหลด/เก็บค่า
 */
export default function DrivingLicenseFields({
  idPrefix,
  file,
  expiresAt,
  upload,
  fileError,
  expiryError,
  onPickFile,
  onRemoveFile,
  onExpiryChange,
  onExpiryBlur,
}: {
  idPrefix: string;
  file: LicenseFileUpload | null;
  expiresAt: string;
  upload: DrivingLicenseUploadState;
  /** "ยังไม่ได้แนบ" / error จาก API — error ของการเลือกไฟล์อยู่ใน upload */
  fileError?: string;
  expiryError?: string;
  onPickFile: (file: File) => void;
  onRemoveFile: () => void;
  onExpiryChange: (value: string) => void;
  onExpiryBlur?: () => void;
}) {
  const s = useDrivingLicenseStrings();
  const ls = useLicenseStrings();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const boxError = upload.status === 'error' ? upload.message : fileError;
  const uploading = upload.status === 'uploading';

  return (
    <div className="grid gap-4" style={font}>
      {/* รูปใบขับขี่ */}
      <div className="flex flex-col gap-1.5">
        <span id={`${idPrefix}-file-label`} className="text-[14px] font-semibold text-[#0F172A]">
          {s.fileLabel} <span className="text-[#DC2626]" aria-hidden="true">*</span>
        </span>
        <div
          className={`flex min-h-[72px] items-center gap-4 rounded-[16px] px-4 py-3 transition-colors ${
            boxError
              ? 'border border-[#DC2626] bg-[#FEF2F2]'
              : file && !uploading
                ? 'border-2 border-[#0F766E] bg-[#E8F0EB]'
                : 'border border-dashed border-[#CBD5E1] bg-[#F8FAFC]'
          }`}
          aria-labelledby={`${idPrefix}-file-label`}
          aria-describedby={fileError ? `${idPrefix}-file-msg` : undefined}
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-white">
            <Icon
              name={
                uploading ? 'sync'
                  : upload.status === 'error' && upload.kind === 'network' ? 'cloud_off'
                    : boxError ? 'error'
                      : file ? 'lock' : 'id_card'
              }
              color={boxError ? '#DC2626' : '#2D6A58'}
              className={uploading ? 'animate-spin' : undefined}
              style={{ fontSize: 20 }}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-[15px] font-semibold leading-5 ${boxError ? 'text-[#B91C1C]' : 'text-[#0F172A]'}`}>
              {file && !uploading && !boxError ? file.fileName : s.fileTitle}
            </p>
            <p className={`truncate text-[13px] leading-5 ${boxError ? 'text-[#DC2626]' : 'text-[#64748B]'}`}>
              {uploading
                ? ls.fileUploading(upload.fileName)
                : upload.status === 'error'
                  ? upload.message
                  : file
                    ? [formatFileSize(file.fileSize), s.filePrivateThumb].filter(Boolean).join(' · ')
                    : s.fileHint}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!uploading && file && (
              <>
                {file.previewUrl && (
                  <a
                    href={file.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={ls.fileView}
                    title={ls.fileView}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white hover:border-[#2D6A58]"
                  >
                    <Icon name="visibility" color="#2D6A58" style={{ fontSize: 18 }} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label={ls.fileReplace}
                  title={ls.fileReplace}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white hover:border-[#2D6A58] cursor-pointer"
                >
                  <Icon name="upload" color="#2D6A58" style={{ fontSize: 18 }} />
                </button>
                <button
                  type="button"
                  onClick={onRemoveFile}
                  aria-label={ls.fileRemove}
                  title={ls.fileRemove}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white hover:bg-red-50 cursor-pointer"
                >
                  <Icon name="delete" color="#DC2626" style={{ fontSize: 18 }} />
                </button>
              </>
            )}
            {!uploading && !file && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] font-semibold text-[#334155] hover:border-[#2D6A58] cursor-pointer"
              >
                <Icon name={upload.status === 'error' && upload.kind === 'network' ? 'refresh' : 'upload'} color="currentColor" style={{ fontSize: 18 }} />
                {upload.status === 'error'
                  ? upload.kind === 'network' ? ls.fileRetry : ls.fileChooseAgain
                  : ls.fileChoose}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => {
              const picked = e.target.files?.[0];
              if (picked) onPickFile(picked);
              e.target.value = '';
            }}
          />
        </div>
        <FieldMessage id={`${idPrefix}-file-msg`} error={upload.status === 'error' ? undefined : fileError} icon="info" />
      </div>

      {/* วันหมดอายุ — ปิดวันนี้และย้อนหลัง (E5) */}
      <div className="flex flex-col gap-1.5 sm:max-w-[320px]">
        <label htmlFor={`${idPrefix}-expiry`} className="text-[14px] font-semibold text-[#0F172A]">
          {s.expiryLabel} <span className="text-[#DC2626]" aria-hidden="true">*</span>
        </label>
        <input
          id={`${idPrefix}-expiry`}
          type="date"
          min={bangkokYmd(1)}
          value={expiresAt}
          onChange={(e) => onExpiryChange(e.target.value)}
          onBlur={onExpiryBlur}
          aria-required="true"
          aria-invalid={!!expiryError || undefined}
          aria-describedby={`${idPrefix}-expiry-msg`}
          className={`h-11 w-full rounded-[10px] border px-3.5 text-[15px] text-[#0F172A] outline-none transition-colors focus:border-[#2D6A58] focus:ring-2 focus:ring-[#2D6A58]/15 ${
            expiryError ? 'border-[#DC2626] bg-[#FEF2F2]' : 'border-[#E2E8F0] bg-white'
          }`}
        />
        <FieldMessage id={`${idPrefix}-expiry-msg`} error={expiryError} hint={s.expiryHint} icon="event" />
      </div>
    </div>
  );
}
