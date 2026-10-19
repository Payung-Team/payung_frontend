import { useEffect, useState } from 'react';
import { useKyc } from '../../context/KycContext';
import Icon from '../../components/ui/Icon';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { TRANSPORT_OPTIONS, type TransportChoice } from '../../lib/drivingLicense';
import { useDrivingLicenseStrings } from '../../lib/drivingLicenseStrings';
import { useLicenseStrings } from '../../lib/licenseStrings';
import { hasDrivingLicenseInput } from './drivingLicenseDraftState';
import {
  checkDrivingLicenseFile,
  useDrivingLicenseDraftActions,
  validateDrivingLicenseDraft,
  type DrivingLicenseFieldErrors,
  type DrivingLicenseUploadState,
} from './drivingLicenseDraft';
import DrivingLicenseFields from './DrivingLicenseFields';

const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

/**
 * ส่วน "การรับส่งผู้รับการดูแล" ในขั้น 2 "เอกสาร" (PYG-598 · ดีไซน์ PYG-595 "KYC ขั้น 2 ใบขับขี่")
 *
 * - คำถามไม่มีค่าเริ่มต้น (E10 / E11) · ตอบ "ขับเอง" → ช่องใบขับขี่โผล่ด้านล่างทันที
 * - เปลี่ยนจาก "ขับเอง" หลังแนบ/กรอกแล้ว → ถามก่อน แล้วลบไฟล์และวันหมดอายุ (ไม่ส่งไปกับ KYC)
 * - error ขึ้นหลังออกจากช่องหรือกด "ถัดไป" (showAllErrors)
 */
export default function DrivingLicenseSection({
  showAllErrors,
  serverErrors,
  onEdited,
  onBusyChange,
}: {
  showAllErrors: boolean;
  /** error จาก API ล่าสุด — ล้างโดยขั้น 2 เมื่อผู้ใช้แก้ค่า (onEdited) */
  serverErrors: DrivingLicenseFieldErrors;
  onEdited: () => void;
  /** กำลังอัปโหลดไฟล์ — ขั้น 2 ปิดปุ่ม "ถัดไป" จนกว่าไฟล์จะขึ้นครบ */
  onBusyChange?: (busy: boolean) => void;
}) {
  const s = useDrivingLicenseStrings();
  const ls = useLicenseStrings();
  const { transportChoice, saveTransportChoice, drivingLicenseDraft: draft, saveDrivingLicenseDraft } = useKyc();
  const { uploadFile, replaceFile, discard, removeFile } = useDrivingLicenseDraftActions();
  const [upload, setUpload] = useState<DrivingLicenseUploadState>({ status: 'idle' });
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<Exclude<TransportChoice, ''> | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    onBusyChange?.(upload.status === 'uploading');
  }, [upload.status, onBusyChange]);

  const selfDrive = transportChoice === 'self';
  const choiceError = showAllErrors && !transportChoice ? s.transportRequired : undefined;
  const clientErrors = validateDrivingLicenseDraft(draft, s);
  const fileError = serverErrors.file ?? (showAllErrors ? clientErrors.file : undefined);
  const expiryError = serverErrors.expiresAt ?? (showAllErrors || expiryTouched ? clientErrors.expiresAt : undefined);
  const previous = draft.previous;
  const showPreviousNotice = selfDrive && previous && !draft.file && (previous.status === 'rejected' || previous.status === 'expired');

  function pick(id: Exclude<TransportChoice, ''>) {
    if (transportChoice === 'self' && id !== 'self' && hasDrivingLicenseInput(draft)) {
      setPendingChoice(id);
      return;
    }
    saveTransportChoice(id);
    onEdited();
  }

  async function confirmSwitch() {
    if (!pendingChoice) return;
    setSwitching(true);
    await discard();
    setSwitching(false);
    saveTransportChoice(pendingChoice);
    setPendingChoice(null);
    setUpload({ status: 'idle' });
    setExpiryTouched(false);
    onEdited();
  }

  async function handleFile(file: File) {
    const invalid = checkDrivingLicenseFile(file, ls);
    if (invalid) {
      setUpload(invalid);
      return;
    }
    setUpload({ status: 'uploading', fileName: file.name });
    try {
      await replaceFile(await uploadFile(file));
      onEdited();
      setUpload({ status: 'idle' });
    } catch {
      setUpload({ status: 'error', kind: 'network', fileName: file.name, message: ls.errUploadFailed(file.name) });
    }
  }

  return (
    <section
      aria-labelledby="kyc-transport-title"
      className="flex flex-col gap-4 rounded-[20px] border border-[#E2E8F0] bg-white p-5"
      style={font}
    >
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#E0F6F1]">
          <Icon name="directions_car" color="#2D6A58" style={{ fontSize: 22 }} />
        </span>
        <div>
          <h3 id="kyc-transport-title" className="text-[15px] font-semibold leading-5 text-[#0F172A]">
            {s.transportTitle} <span className="text-[#DC2626]" aria-hidden="true">*</span>
          </h3>
          <p id="kyc-transport-question" className="text-[13px] leading-5 text-[#64748B]">{s.transportQuestion}</p>
        </div>
      </header>

      <div
        role="radiogroup"
        aria-labelledby="kyc-transport-question"
        aria-required="true"
        aria-invalid={!!choiceError || undefined}
        aria-describedby={choiceError ? 'kyc-transport-error' : undefined}
        className="grid gap-2 sm:grid-cols-3"
      >
        {TRANSPORT_OPTIONS.map((option) => {
          const on = transportChoice === option.id;
          const copy = s.transportOption[option.id];
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(option.id)}
              className={`flex flex-col items-start gap-1.5 rounded-[14px] text-left transition-colors cursor-pointer ${
                on
                  ? 'border-2 border-[#2D6A58] bg-[#F2F8F5] px-[13px] py-3'
                  : `border-[1.5px] bg-white px-[14px] py-[13px] hover:border-[#2D6A58] ${choiceError ? 'border-[#FCA5A5]' : 'border-[#E2E8F0]'}`
              }`}
            >
              <span className="flex w-full items-center justify-between">
                <Icon name={option.icon} color="#2D6A58" style={{ fontSize: 22 }} />
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${on ? 'border-[#2D6A58]' : 'border-[#CBD5E1]'}`}
                >
                  {on && <span className="h-2.5 w-2.5 rounded-full bg-[#2D6A58]" />}
                </span>
              </span>
              <span className="text-[14px] font-semibold text-[#0F172A]">{copy.label}</span>
              <span className="text-[12.5px] leading-snug text-[#64748B]">{copy.desc}</span>
            </button>
          );
        })}
      </div>
      {choiceError && (
        <span id="kyc-transport-error" role="alert" className="-mt-2 flex items-center gap-1 text-[12.5px] text-[#DC2626]">
          <Icon name="error" color="currentColor" style={{ fontSize: 15 }} />
          {choiceError}
        </span>
      )}

      {selfDrive && (
        <>
          {showPreviousNotice && (
            <p className="flex items-start gap-2 rounded-[10px] bg-[#FEF2F2] px-3 py-2 text-[13px] text-[#991B1B]" role="status">
              <Icon name={previous.status === 'expired' ? 'event_busy' : 'cancel'} color="currentColor" style={{ fontSize: 18 }} />
              {previous.status === 'expired' ? s.previousExpired : s.previousRejected(previous.rejectionReason ?? '-')}
            </p>
          )}
          <DrivingLicenseFields
            idPrefix="kyc-driving-license"
            file={draft.file}
            expiresAt={draft.expiresAt}
            upload={upload}
            fileError={fileError}
            expiryError={expiryError}
            onPickFile={(file) => void handleFile(file)}
            onRemoveFile={() => { setUpload({ status: 'idle' }); void removeFile(); onEdited(); }}
            onExpiryChange={(value) => { saveDrivingLicenseDraft({ ...draft, expiresAt: value }); onEdited(); }}
            onExpiryBlur={() => setExpiryTouched(true)}
          />
          <p className="flex items-start gap-2 rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#475569]">
            <Icon name="visibility_lock" color="currentColor" style={{ fontSize: 18 }} />
            {s.privacy}
          </p>
        </>
      )}

      <ConfirmModal
        isOpen={!!pendingChoice}
        isLoading={switching}
        title={s.switchTitle(pendingChoice ? s.transportOption[pendingChoice].label : '')}
        description={s.switchBody}
        cancelText={s.cancel}
        confirmText={s.switchConfirm}
        iconName="delete_sweep"
        onClose={() => setPendingChoice(null)}
        onConfirm={() => void confirmSwitch()}
      />
    </section>
  );
}
