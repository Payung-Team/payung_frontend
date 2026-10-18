import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import Icon from '../../components/ui/Icon';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { APPROVE_LICENSE, REJECT_LICENSE } from '../../graphql/license';
import { extractGraphQLErrorCode } from '../../lib/apolloErrors';
import { logGraphQLError } from '../../lib/logGraphQLError';
import { PROFESSIONS, isProfession } from '../../lib/professions';
import {
  daysUntilBangkok,
  licenseErrorCodes,
  normalizeLicenseStatus,
  requiresLicense,
  toBangkokYmd,
  type LicenseInfo,
} from '../../lib/license';
import { formatLicenseDate, useLicenseStrings } from '../../lib/licenseStrings';
import { LicenseStatusPill } from './LicenseStatusCard';

const REJECT_REASON_MAX = 500; // ตรงกับ RejectLicenseInput.reason ของ BE

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium leading-5 text-[#9CA3AF]">{label}</dt>
      <dd className="mt-1 text-[15px] leading-6 text-[#1F2937]">{children}</dd>
    </div>
  );
}

/**
 * ส่วนใบประกอบวิชาชีพในหน้า KYC review ของแอดมิน (PYG-588 · ดีไซน์ PYG-584 A1 / A2)
 *
 * - อนุมัติ / ปฏิเสธรายใบ (approveLicense / rejectLicense) แยกจากอนุมัติ KYC ทั้งชุด
 * - ปฏิเสธต้องมีเหตุผล (กันที่หน้าจอ + BE ตอบ LICENSE_REJECT_REASON_REQUIRED)
 * - E7: ใบที่หมดอายุแล้วอนุมัติไม่ได้ — ปุ่มปิดพร้อมเหตุผล และ LICENSE_EXPIRED จาก API แสดงข้อความเดียวกัน
 * - ตัวดูไฟล์ใช้ KycDocumentsPreview ในคอลัมน์ขวา (รองรับทั้งรูปและ PDF) — ที่นี่มีปุ่มเปิดไฟล์ในแท็บใหม่
 */
export default function AdminLicensePanel({
  license,
  profession,
  caregiverName,
  onChanged,
  notify,
}: {
  license: LicenseInfo | null;
  profession: string | null | undefined;
  caregiverName: string;
  onChanged: () => Promise<unknown> | void;
  notify: { success: (message: string) => void; error: (message: string) => void };
}) {
  const s = useLicenseStrings();
  const [approveLicense, { loading: approving }] = useMutation(APPROVE_LICENSE);
  const [rejectLicense, { loading: rejecting }] = useMutation(REJECT_LICENSE);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  // ผู้ดูแลทั่วไปที่ไม่มีใบ → ไม่แสดงส่วนนี้เลย
  if (!license && !requiresLicense(profession)) return null;

  const meta = isProfession(profession) ? PROFESSIONS[profession] : null;
  const status = license ? normalizeLicenseStatus(license.status) : null;
  const expiryYmd = toBangkokYmd(license?.expiresAt);
  const days = expiryYmd ? daysUntilBangkok(expiryYmd) : NaN;
  // E7: หมดอายุแล้ว (วันนี้ตามเวลาไทยเลยวันหมดอายุ) แม้สถานะยังเป็นรอตรวจ — งานรายวันอาจยังไม่รัน
  const expiredNow = status === 'expired' || (Number.isFinite(days) && days < 0);
  const isPending = status === 'pending';
  const canApprove = isPending && !expiredNow;

  async function handleError(err: unknown, fallbackCode: 'approve' | 'reject') {
    logGraphQLError(fallbackCode === 'approve' ? 'ApproveLicense' : 'RejectLicense', err);
    const [code] = licenseErrorCodes(err);
    if (code === 'LICENSE_REJECT_REASON_REQUIRED') {
      setReasonError(s.adminRejectReasonRequired);
      return;
    }
    if (code) notify.error(s.apiError[code]);
    else if (extractGraphQLErrorCode(err) === 'CONFLICT') notify.error(s.adminAlreadyDecided);
    else notify.error(s.adminActionFailed);
    setIsApproveOpen(false);
    setIsRejectOpen(false);
    await onChanged();
  }

  async function handleApprove() {
    if (!license) return;
    try {
      await approveLicense({ variables: { documentId: license.documentId } });
      setIsApproveOpen(false);
      notify.success(s.adminApproved);
      await onChanged();
    } catch (err) {
      await handleError(err, 'approve');
    }
  }

  async function handleReject() {
    if (!license) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError(s.adminRejectReasonRequired);
      return;
    }
    try {
      await rejectLicense({ variables: { documentId: license.documentId, reason: trimmed } });
      setIsRejectOpen(false);
      setReason('');
      notify.success(s.adminRejected);
      await onChanged();
    } catch (err) {
      await handleError(err, 'reject');
    }
  }

  return (
    <article
      aria-labelledby="admin-license-title"
      className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="admin-license-title" className="flex items-center gap-2 text-base font-semibold leading-5 text-[#064E3B]">
          <Icon name="badge" color="currentColor" style={{ fontSize: 20 }} />
          {s.sectionTitle}
        </h3>
        {status && <LicenseStatusPill status={expiredNow && status === 'pending' ? 'expired' : status} />}
      </div>

      {!license ? (
        <p className="mt-3 text-[15px] text-[#9CA3AF]">{s.adminNoLicense}</p>
      ) : (
        <>
          <dl className="mt-4 grid gap-x-6 gap-y-4 border-t border-[#F3F4F6] pt-4 sm:grid-cols-2">
            <Field label={s.adminProfession}>{meta?.label ?? '-'}</Field>
            <Field label={s.adminRequiredType}>{meta?.licenseName ?? '-'}</Field>
            <Field label={s.adminNumber}>
              <span className="font-semibold tracking-wide">{license.licenseNumber ?? '-'}</span>
            </Field>
            <Field label={s.adminExpiry}>
              {expiryYmd ? formatLicenseDate(expiryYmd) : '-'}
              {Number.isFinite(days) && (
                <span className={`ml-1.5 text-[13px] ${days < 0 ? 'font-semibold text-[#B91C1C]' : 'text-[#6B7280]'}`}>
                  · {days < 0 ? s.adminOverdue(-days) : s.adminRemaining(days)}
                </span>
              )}
            </Field>
            <div className="min-w-0 sm:col-span-2">
              <dt className="text-[13px] font-medium leading-5 text-[#9CA3AF]">{s.adminFile}</dt>
              <dd className="mt-1 flex flex-wrap items-center gap-2 text-[15px] text-[#1F2937]">
                <span className="truncate">{license.fileName}</span>
                {license.signedUrl && (
                  <a
                    href={license.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#F3F4F6] px-2.5 text-[13px] font-semibold text-[#374151] hover:bg-gray-200"
                  >
                    <Icon name="open_in_new" color="currentColor" style={{ fontSize: 16 }} />
                    {s.adminViewFile}
                  </a>
                )}
              </dd>
            </div>
          </dl>

          {status === 'rejected' && license.rejectionReason && (
            <div className="mt-4 rounded-lg bg-[#FEF2F2] px-3 py-2">
              <p className="text-[12px] font-semibold text-[#B91C1C]">{s.rejectedReasonLabel}</p>
              <p className="mt-0.5 text-[14px] text-[#7F1D1D]">{license.rejectionReason}</p>
            </div>
          )}

          {isPending && (
            <div className="mt-4 rounded-lg bg-[#F9FAFB] px-4 py-3">
              <p className="text-[13px] font-semibold text-[#374151]">{s.adminChecklistTitle}</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13.5px] text-[#4B5563]">
                {s.adminChecklist.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          {expiredNow && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13.5px] text-[#B91C1C]">
              <Icon name="block" color="currentColor" style={{ fontSize: 18 }} />
              {s.adminExpiredBlocked(expiryYmd ? formatLicenseDate(expiryYmd) : '-')}
            </p>
          )}

          {isPending ? (
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => { setReasonError(''); setIsRejectOpen(true); }}
                className="inline-flex h-9 items-center justify-center rounded-lg border-[1.5px] border-[#EF4444] px-4 text-[13px] font-semibold text-[#DC2626] hover:bg-red-50 cursor-pointer"
              >
                {s.adminReject}
              </button>
              <button
                type="button"
                onClick={() => setIsApproveOpen(true)}
                disabled={!canApprove}
                aria-describedby={expiredNow ? 'admin-license-approve-blocked' : undefined}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#059669] px-4 text-[13px] font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-gray-300 cursor-pointer"
              >
                {!canApprove && <Icon name="lock" color="currentColor" style={{ fontSize: 16 }} />}
                {s.adminApprove}
              </button>
              {expiredNow && <span id="admin-license-approve-blocked" className="sr-only">{s.adminExpiredBlocked(formatLicenseDate(expiryYmd))}</span>}
            </div>
          ) : (
            <p className="mt-4 text-right text-sm text-gray-500">{s.adminDecidedNote}</p>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={isApproveOpen}
        isLoading={approving}
        title={s.adminApproveTitle}
        description={s.adminApproveBody(license?.licenseNumber ?? '-', caregiverName || '-', expiryYmd ? formatLicenseDate(expiryYmd) : '-')}
        cancelText={s.cancel}
        confirmText={s.adminApprove}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={() => void handleApprove()}
      />

      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-license-title">
          <div className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="reject-license-title" className="text-[17px] font-semibold text-[#111827]">{s.adminRejectTitle}</h2>
            <label htmlFor="reject-license-reason" className="mt-4 block text-[14px] font-semibold text-[#111827]">
              {s.adminRejectReason} <span className="text-[#DC2626]" aria-hidden="true">*</span>
            </label>
            <p className="text-[13px] text-[#6B7280]">{s.adminRejectReasonHint}</p>
            <textarea
              id="reject-license-reason"
              value={reason}
              maxLength={REJECT_REASON_MAX}
              rows={4}
              autoFocus
              onChange={(e) => { setReason(e.target.value); if (reasonError) setReasonError(''); }}
              aria-required="true"
              aria-invalid={!!reasonError || undefined}
              aria-describedby={reasonError ? 'reject-license-reason-error' : undefined}
              className={`mt-2 w-full rounded-lg border px-3 py-2 text-[14px] outline-none focus:border-[#059669] ${reasonError ? 'border-[#DC2626] bg-[#FEF2F2]' : 'border-[#E5E7EB]'}`}
            />
            {reasonError && (
              <p id="reject-license-reason-error" role="alert" className="mt-1 flex items-center gap-1 text-[13px] text-[#DC2626]">
                <Icon name="error" color="currentColor" style={{ fontSize: 15 }} />
                {reasonError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRejectOpen(false)}
                className="h-9 rounded-lg border border-[#E5E7EB] px-4 text-[13px] font-semibold text-[#374151] hover:bg-gray-50 cursor-pointer"
              >
                {s.cancel}
              </button>
              <button
                type="button"
                disabled={rejecting}
                onClick={() => void handleReject()}
                className="h-9 rounded-lg bg-[#DC2626] px-4 text-[13px] font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60 cursor-pointer"
              >
                {s.adminRejectConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}
