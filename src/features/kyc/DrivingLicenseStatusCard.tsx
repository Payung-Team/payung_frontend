import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/ui/Icon';
import type { LicenseFileUpload } from '../../context/KycContext';
import { toBangkokYmd } from '../../lib/license';
import { formatLicenseDate, useLicenseStrings } from '../../lib/licenseStrings';
import {
  drivingLicenseStatus,
  type DrivingLicenseInfo,
  type DrivingLicenseStatus,
} from '../../lib/drivingLicense';
import { useDrivingLicenseStrings } from '../../lib/drivingLicenseStrings';
import {
  checkDrivingLicenseFile,
  useDrivingLicenseUpload,
  validateDrivingLicenseDraft,
  type DrivingLicenseFieldErrors,
  type DrivingLicenseUploadState,
} from './drivingLicenseDraft';
import DrivingLicenseFields from './DrivingLicenseFields';

const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

/** ไอคอน + สี ของแต่ละสถานะ — ป้ายมีข้อความเสมอ ไม่พึ่งสีอย่างเดียว */
const STATUS_STYLE: Record<DrivingLicenseStatus, { icon: string; className: string }> = {
  none: { icon: 'remove', className: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]' },
  pending: { icon: 'hourglass_top', className: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]' },
  approved: { icon: 'verified', className: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]' },
  rejected: { icon: 'cancel', className: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]' },
  expired: { icon: 'event_busy', className: 'bg-[#F1F5F9] text-[#334155] border-[#CBD5E1]' },
  unknown: { icon: 'help', className: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]' },
};

export function DrivingLicenseStatusPill({ status }: { status: DrivingLicenseStatus }) {
  const s = useDrivingLicenseStrings();
  const style = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${style.className}`} style={font}>
      <Icon name={style.icon} color="currentColor" style={{ fontSize: 15 }} />
      {s.status[status]}
    </span>
  );
}

/**
 * การ์ด "ใบขับขี่" ในหน้าสถานะ KYC (PYG-598 · ดีไซน์ PYG-595 "สถานะใบขับขี่")
 *
 * ทางอัปโหลดใบใหม่ (ไม่ผ่าน / หมดอายุ) และทาง "เปลี่ยนเป็นขับรถรับส่งเอง":
 *   - KYC อนุมัติแล้ว → อัปโหลดที่การ์ดนี้ได้เลย (uploadKycDocument · BE จับคู่ใบกับผู้ดูแลด้วย user_id)
 *   - KYC ถูกปฏิเสธ → แก้ KYC ที่ขั้น 2 (resubmitKyc ผูกใบใหม่ให้)
 */
export default function DrivingLicenseStatusCard({
  info,
  kycStatus,
  onChanged,
}: {
  info: DrivingLicenseInfo | null;
  kycStatus: string | null | undefined;
  onChanged: () => Promise<unknown> | void;
}) {
  const s = useDrivingLicenseStrings();
  const ls = useLicenseStrings();
  const navigate = useNavigate();
  const { uploadFile, register, removeStorage } = useDrivingLicenseUpload();
  const status = drivingLicenseStatus(info);
  const expiry = info?.expiresAt ? formatLicenseDate(toBangkokYmd(info.expiresAt)) : '-';
  const kycVerified = kycStatus === 'verified';

  // ── อัปโหลดใบใหม่ (KYC อนุมัติแล้ว) ──
  const [formOpen, setFormOpen] = useState(false);
  const [file, setFile] = useState<LicenseFileUpload | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [upload, setUpload] = useState<DrivingLicenseUploadState>({ status: 'idle' });
  const [showErrors, setShowErrors] = useState(false);
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState<DrivingLicenseFieldErrors>({});
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const clientErrors = validateDrivingLicenseDraft({ file, expiresAt }, s);

  function resetForm() {
    setFormOpen(false);
    setFile(null);
    setExpiresAt('');
    setUpload({ status: 'idle' });
    setShowErrors(false);
    setExpiryTouched(false);
    setServerErrors({});
    setMessage('');
  }

  async function cancelForm() {
    if (file) await removeStorage(file.storagePath);
    resetForm();
  }

  async function handleFile(picked: File) {
    const invalid = checkDrivingLicenseFile(picked, ls);
    if (invalid) {
      setUpload(invalid);
      return;
    }
    setUpload({ status: 'uploading', fileName: picked.name });
    try {
      const uploaded = await uploadFile(picked);
      if (file) await removeStorage(file.storagePath);
      setFile(uploaded);
      setServerErrors({});
      setUpload({ status: 'idle' });
    } catch {
      setUpload({ status: 'error', kind: 'network', fileName: picked.name, message: ls.errUploadFailed(picked.name) });
    }
  }

  async function submit() {
    setMessage('');
    if (Object.keys(clientErrors).length > 0 || !file) {
      setShowErrors(true);
      return;
    }
    setSending(true);
    const result = await register({ file, expiresAt }, s);
    setSending(false);
    if (!result.ok) {
      setShowErrors(true);
      setServerErrors(result.fieldErrors);
      setMessage(result.message ?? '');
      return;
    }
    resetForm();
    setSent(true);
    await onChanged();
  }

  const reuploadLabel = status === 'expired' ? s.uploadNew : s.reupload;
  const needsNew = status === 'rejected' || status === 'expired';

  return (
    <section
      aria-labelledby="driving-license-status-title"
      className="w-full rounded-[16px] border border-[#E2E8F0] bg-white p-5 text-left"
      style={font}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="driving-license-status-title" className="flex items-center gap-2 text-[15px] font-semibold text-[#0F172A]">
          <Icon name="directions_car" color="#2D6A58" style={{ fontSize: 20 }} />
          {s.adminTitle}
        </h3>
        {status !== 'none' && <DrivingLicenseStatusPill status={status} />}
      </div>

      {sent && status === 'pending' && (
        <p role="status" className="mt-2 flex items-center gap-1.5 text-[13px] text-[#15803D]">
          <Icon name="check_circle" color="currentColor" style={{ fontSize: 16 }} />
          {s.changeSent}
        </p>
      )}

      {status !== 'none' && status !== 'expired' && info?.expiresAt && (
        <p className="mt-2 text-[13.5px] leading-[20px] text-[#475569]">{s.expiryMeta(expiry)}</p>
      )}
      {status === 'pending' && <p className="mt-1 text-[13px] text-[#64748B]">{s.pendingNote}</p>}
      {status === 'approved' && <p className="mt-1 text-[13px] text-[#64748B]">{s.approvedNote}</p>}
      {status === 'rejected' && (
        <div className="mt-3 rounded-[10px] bg-[#FEF2F2] px-3 py-2">
          <p className="text-[12px] font-semibold text-[#B91C1C]">{s.rejectedReasonLabel}</p>
          <p className="mt-0.5 text-[13.5px] text-[#7F1D1D]">{info?.rejectionReason || '-'}</p>
        </div>
      )}
      {status === 'expired' && (
        <p className="mt-3 rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-[13.5px] text-[#334155]">{s.expiredBody(expiry)}</p>
      )}
      {status === 'unknown' && <p className="mt-2 text-[13px] text-[#64748B]">{s.unknownNote}</p>}
      {status === 'none' && !formOpen && <p className="mt-2 text-[13.5px] text-[#475569]">{s.changeIntro}</p>}

      {/* KYC ถูกปฏิเสธ → แก้ที่ฟอร์ม KYC ขั้น 2 */}
      {needsNew && kycStatus === 'rejected' && (
        <button
          type="button"
          onClick={() => navigate('/kyc/resubmit', { state: { step: 2 } })}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0D9488] px-4 text-[14px] font-bold text-white hover:bg-[#0B7A70] sm:w-auto cursor-pointer"
        >
          <Icon name="upload" color="white" style={{ fontSize: 18 }} />
          {reuploadLabel}
        </button>
      )}

      {/* KYC อนุมัติแล้ว → อัปโหลดที่นี่ (ใบใหม่ / เปลี่ยนเป็นขับรถรับส่งเอง) */}
      {kycVerified && (needsNew || status === 'none') && !formOpen && (
        <button
          type="button"
          onClick={() => { setSent(false); setFormOpen(true); }}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0D9488] px-4 text-[14px] font-bold text-white hover:bg-[#0B7A70] sm:w-auto cursor-pointer"
        >
          <Icon name={status === 'none' ? 'directions_car' : 'upload'} color="white" style={{ fontSize: 18 }} />
          {status === 'none' ? s.changeStart : reuploadLabel}
        </button>
      )}

      {formOpen && (
        <div className="mt-4 flex flex-col gap-4 border-t border-[#F1F5F9] pt-4">
          <DrivingLicenseFields
            idPrefix="status-driving-license"
            file={file}
            expiresAt={expiresAt}
            upload={upload}
            fileError={serverErrors.file ?? (showErrors ? clientErrors.file : undefined)}
            expiryError={serverErrors.expiresAt ?? (showErrors || expiryTouched ? clientErrors.expiresAt : undefined)}
            onPickFile={(picked) => void handleFile(picked)}
            onRemoveFile={() => { if (file) void removeStorage(file.storagePath); setFile(null); setUpload({ status: 'idle' }); }}
            onExpiryChange={(value) => { setExpiresAt(value); setServerErrors({}); setMessage(''); }}
            onExpiryBlur={() => setExpiryTouched(true)}
          />
          <p className="flex items-start gap-2 rounded-[10px] bg-[#F8FAFC] px-3 py-2 text-[13px] text-[#475569]">
            <Icon name="visibility_lock" color="currentColor" style={{ fontSize: 18 }} />
            {s.privacy}
          </p>
          {message && (
            <p role="alert" className="flex items-start gap-2 text-[13px] text-[#B91C1C]">
              <Icon name="error" color="currentColor" style={{ fontSize: 16 }} />
              {message}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => void cancelForm()}
              className="h-10 rounded-lg border border-[#E2E8F0] px-4 text-[14px] font-semibold text-[#334155] hover:bg-[#F8FAFC] cursor-pointer"
            >
              {s.changeCancel}
            </button>
            <button
              type="button"
              disabled={sending || upload.status === 'uploading'}
              onClick={() => void submit()}
              className="h-10 rounded-lg bg-[#2D6A58] px-4 text-[14px] font-bold text-white hover:bg-[#255a4a] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {sending ? s.savingDrivingLicense : s.changeSubmit}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
