import { useEffect, useRef, useState } from 'react';
import { useKyc } from '../../context/KycContext';
import Icon from '../../components/ui/Icon';
import { PROFESSIONS, type Profession } from '../../lib/professions';
import {
  LICENSE_ALLOWED_TYPES,
  LICENSE_MAX_SIZE,
  LICENSE_NUMBER_MAX_LENGTH,
  bangkokYmd,
  daysUntilBangkok,
  isFutureBangkokDate,
} from '../../lib/license';
import {
  formatFileSize,
  formatLicenseDate,
  formatRemaining,
  useLicenseStrings,
} from '../../lib/licenseStrings';
import { useLicenseDraftActions, validateLicenseDraft, type LicenseFieldErrors } from './licenseDraft';

const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string; replacing?: string }
  | { status: 'error'; message: string; kind: 'type' | 'size' | 'network'; fileName: string };

function FieldMessage({ id, error, hint, icon = 'info' }: { id: string; error?: string; hint?: string; icon?: string }) {
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

const inputClass = (invalid: boolean) =>
  `h-11 w-full rounded-[10px] border px-3.5 text-[15px] text-[#0F172A] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#2D6A58] focus:ring-2 focus:ring-[#2D6A58]/15 ${
    invalid ? 'border-[#DC2626] bg-[#FEF2F2]' : 'border-[#E2E8F0] bg-white'
  }`;

/**
 * ส่วนใบประกอบวิชาชีพในขั้น 2 "เอกสาร" (PYG-588 · ดีไซน์ PYG-584 C1 / C2 / M1)
 * แสดงเฉพาะวิชาชีพที่ requiresLicense — ขั้น 2 เป็นคนตัดสินว่าจะ render หรือไม่
 *
 * error ใต้ช่องขึ้นหลังออกจากช่อง หรือหลังกด "ถัดไป" (showAllErrors) · ไม่ขึ้นตั้งแต่ยังไม่แตะ
 */
export default function LicenseSection({
  profession,
  showAllErrors,
  serverErrors,
  onEdited,
  onBusyChange,
}: {
  profession: Profession;
  showAllErrors: boolean;
  /** error จาก API ล่าสุด — ล้างโดยขั้น 2 เมื่อผู้ใช้แก้ค่า (onEdited) */
  serverErrors: LicenseFieldErrors;
  onEdited: () => void;
  /** กำลังอัปโหลดไฟล์ — ขั้น 2 ปิดปุ่ม "ถัดไป" จนกว่าไฟล์จะขึ้นครบ */
  onBusyChange?: (busy: boolean) => void;
}) {
  const s = useLicenseStrings();
  const meta = PROFESSIONS[profession];
  const { licenseDraft: draft, saveLicenseDraft, goToStep } = useKyc();
  const { uploadFile, replaceFile, removeFile } = useLicenseDraftActions();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [touched, setTouched] = useState<Record<'licenseNumber' | 'expiresAt', boolean>>({
    licenseNumber: false,
    expiresAt: false,
  });

  useEffect(() => {
    onBusyChange?.(upload.status === 'uploading');
  }, [upload.status, onBusyChange]);

  const clientErrors = validateLicenseDraft(draft, s);
  const errorFor = (field: 'licenseNumber' | 'expiresAt' | 'file') => {
    if (serverErrors[field]) return serverErrors[field];
    const shown = field === 'file' ? showAllErrors : showAllErrors || touched[field];
    return shown ? clientErrors[field] : undefined;
  };

  const update = (patch: Partial<typeof draft>) => {
    saveLicenseDraft({ ...draft, ...patch, clearedForProfession: null });
    onEdited();
  };

  async function handleFile(file: File) {
    if (!LICENSE_ALLOWED_TYPES.includes(file.type)) {
      setUpload({ status: 'error', kind: 'type', fileName: file.name, message: s.errFileType(file.name) });
      return;
    }
    if (file.size > LICENSE_MAX_SIZE) {
      setUpload({ status: 'error', kind: 'size', fileName: file.name, message: s.errFileSize });
      return;
    }
    // เปลี่ยนไฟล์: ไฟล์เดิมยังอยู่จนไฟล์ใหม่ขึ้นสำเร็จ
    setUpload({ status: 'uploading', fileName: file.name, replacing: draft.file?.fileName });
    try {
      const uploaded = await uploadFile(file);
      await replaceFile(uploaded);
      onEdited();
      setUpload({ status: 'idle' });
    } catch {
      setUpload({ status: 'error', kind: 'network', fileName: file.name, message: s.errUploadFailed(file.name) });
    }
  }

  const fileError = upload.status === 'error' ? upload.message : errorFor('file');
  const expiryValid = draft.expiresAt && isFutureBangkokDate(draft.expiresAt);
  const expiryHint = expiryValid
    ? s.expiryFilled(formatLicenseDate(draft.expiresAt), formatRemaining(daysUntilBangkok(draft.expiresAt)))
    : s.expiryHint;
  const previous = draft.previous;
  const showPreviousNotice = previous && !draft.file && (previous.status === 'rejected' || previous.status === 'expired');

  return (
    <section
      aria-labelledby="kyc-license-title"
      className="flex flex-col gap-4 rounded-[20px] border border-[#E2E8F0] bg-white p-5"
      style={font}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#E0F6F1]">
            <Icon name={meta.icon} color="#2D6A58" style={{ fontSize: 22 }} />
          </span>
          <div>
            <h3 id="kyc-license-title" className="text-[15px] font-semibold leading-5 text-[#0F172A]">{s.sectionTitle}</h3>
            <p className="text-[13px] leading-5 text-[#64748B]">
              {s.sectionRequiredFor(meta.label)}
              {meta.licenseName ? ` · ${meta.licenseName}` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => goToStep(1)}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-[#2D6A58] hover:bg-[#F0FDFA] cursor-pointer"
        >
          <Icon name="edit" color="currentColor" style={{ fontSize: 16 }} />
          {s.changeProfession}
        </button>
      </header>

      {draft.clearedForProfession === profession && !draft.file && (
        <p className="flex items-start gap-2 rounded-[10px] bg-[#EFF6FF] px-3 py-2 text-[13px] text-[#1E40AF]">
          <Icon name="info" color="currentColor" style={{ fontSize: 18 }} />
          {s.professionChangedNotice(meta.label, meta.licenseName ?? s.sectionTitle)}
        </p>
      )}
      {showPreviousNotice && (
        <p className="flex items-start gap-2 rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#991B1B]" role="status">
          <Icon name={previous.status === 'expired' ? 'event_busy' : 'cancel'} color="currentColor" style={{ fontSize: 18 }} />
          {previous.status === 'expired' ? s.previousExpired : s.previousRejected(previous.rejectionReason ?? '-')}
        </p>
      )}

      {/* ไฟล์ใบอนุญาต */}
      <div className="flex min-w-0 flex-col gap-1.5">
        <span id="kyc-license-file-label" className="text-[14px] font-semibold text-[#0F172A]">
          {s.fileLabel} <span className="text-[#DC2626]" aria-hidden="true">*</span>
        </span>
        {/* มือถือ: ปุ่มขึ้นบรรทัดใหม่ใต้ชื่อไฟล์ — จอกว้างอยู่บรรทัดเดียว */}
        <div
          className={`flex min-h-[72px] flex-wrap items-center gap-x-4 gap-y-3 rounded-[16px] px-4 py-3 transition-colors sm:flex-nowrap ${
            fileError
              ? 'border border-[#DC2626] bg-[#FEF2F2]'
              : draft.file && upload.status !== 'uploading'
                ? 'border-2 border-[#0F766E] bg-[#E8F0EB]'
                : 'border border-dashed border-[#CBD5E1] bg-[#F8FAFC]'
          }`}
          aria-labelledby="kyc-license-file-label"
          aria-describedby={fileError ? 'kyc-license-file-msg' : undefined}
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border border-[#CBD5E1] bg-white">
            <Icon
              name={
                upload.status === 'uploading' ? 'sync'
                  : upload.status === 'error' && upload.kind === 'network' ? 'cloud_off'
                    : fileError ? 'error'
                      : draft.file ? 'check_circle' : 'description'
              }
              color={fileError ? '#DC2626' : '#2D6A58'}
              className={upload.status === 'uploading' ? 'animate-spin' : undefined}
              style={{ fontSize: 20 }}
            />
          </span>
          <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] sm:basis-0">
            <p className={`text-[15px] font-semibold leading-5 ${fileError ? 'text-[#B91C1C]' : 'text-[#0F172A]'}`}>{s.fileTitle}</p>
            <p className={`break-words text-[13px] leading-5 sm:truncate ${fileError ? 'text-[#DC2626]' : 'text-[#64748B]'}`}>
              {upload.status === 'uploading'
                ? upload.replacing
                  ? s.fileReplacing(upload.fileName, upload.replacing)
                  : s.fileUploading(upload.fileName)
                : upload.status === 'error'
                  ? upload.message
                  : draft.file
                    ? s.fileUploaded(draft.file.fileName, formatFileSize(draft.file.fileSize))
                    : s.fileHint}
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 empty:hidden max-sm:w-full">
            {upload.status !== 'uploading' && draft.file && (
              <>
                {draft.file.previewUrl && (
                  <a
                    href={draft.file.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.fileView}
                    title={s.fileView}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white hover:border-[#2D6A58]"
                  >
                    <Icon name="visibility" color="#2D6A58" style={{ fontSize: 18 }} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  aria-label={s.fileReplace}
                  title={s.fileReplace}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white hover:border-[#2D6A58] cursor-pointer"
                >
                  <Icon name="file_upload" color="#2D6A58" style={{ fontSize: 18 }} />
                </button>
                <button
                  type="button"
                  onClick={() => { void removeFile(); onEdited(); }}
                  aria-label={s.fileRemove}
                  title={s.fileRemove}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white hover:bg-red-50 cursor-pointer"
                >
                  <Icon name="delete" color="#DC2626" style={{ fontSize: 18 }} />
                </button>
              </>
            )}
            {upload.status !== 'uploading' && !draft.file && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-[#E2E8F0] bg-white px-3 text-[13px] font-semibold text-[#334155] hover:border-[#2D6A58] cursor-pointer max-sm:w-full"
              >
                <Icon name={upload.status === 'error' && upload.kind === 'network' ? 'refresh' : 'upload'} color="currentColor" style={{ fontSize: 18 }} />
                {upload.status === 'error'
                  ? upload.kind === 'network' ? s.fileRetry : s.fileChooseAgain
                  : s.fileChoose}
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = '';
            }}
          />
        </div>
        {/* error ของการเลือกไฟล์อยู่ในกรอบแล้ว — ใต้กรอบเฉพาะ "ยังไม่ได้แนบ" / error จาก API */}
        <FieldMessage id="kyc-license-file-msg" error={upload.status === 'error' ? undefined : errorFor('file')} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* เลขที่ใบอนุญาต */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kyc-license-number" className="text-[14px] font-semibold text-[#0F172A]">
            {s.numberLabel} <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <input
            id="kyc-license-number"
            type="text"
            autoComplete="off"
            maxLength={LICENSE_NUMBER_MAX_LENGTH + 20}
            value={draft.licenseNumber}
            placeholder={s.numberPlaceholder}
            onChange={(e) => update({ licenseNumber: e.target.value })}
            onBlur={() => {
              setTouched((t) => ({ ...t, licenseNumber: true }));
              // E5: ตัดช่องว่างหัวท้ายตอนออกจากช่อง
              const trimmed = draft.licenseNumber.trim();
              if (trimmed !== draft.licenseNumber) update({ licenseNumber: trimmed });
            }}
            aria-required="true"
            aria-invalid={!!errorFor('licenseNumber') || undefined}
            aria-describedby="kyc-license-number-msg"
            className={inputClass(!!errorFor('licenseNumber'))}
          />
          <FieldMessage id="kyc-license-number-msg" error={errorFor('licenseNumber')} hint={s.numberHint} />
        </div>

        {/* วันหมดอายุ — ปิดวันนี้และย้อนหลัง (E3) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kyc-license-expiry" className="text-[14px] font-semibold text-[#0F172A]">
            {s.expiryLabel} <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </label>
          <input
            id="kyc-license-expiry"
            type="date"
            min={bangkokYmd(1)}
            value={draft.expiresAt}
            onChange={(e) => update({ expiresAt: e.target.value })}
            onBlur={() => setTouched((t) => ({ ...t, expiresAt: true }))}
            aria-required="true"
            aria-invalid={!!errorFor('expiresAt') || undefined}
            aria-describedby="kyc-license-expiry-msg"
            className={inputClass(!!errorFor('expiresAt'))}
          />
          <FieldMessage id="kyc-license-expiry-msg" error={errorFor('expiresAt')} hint={expiryHint} icon="event" />
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#475569]">
        <Icon name="notifications" color="currentColor" style={{ fontSize: 18 }} />
        {s.expiryNotice}
      </p>
    </section>
  );
}
