import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import Icon from '../../components/ui/Icon';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { APPROVE_DRIVING_LICENSE, REJECT_DRIVING_LICENSE } from '../../graphql/drivingLicense';
import { extractGraphQLErrorCode } from '../../lib/apolloErrors';
import { logGraphQLError } from '../../lib/logGraphQLError';
import { daysUntilBangkok, toBangkokYmd } from '../../lib/license';
import { formatLicenseDate } from '../../lib/licenseStrings';
import { drivingLicenseErrorCode, drivingLicenseStatus, type DrivingLicenseInfo } from '../../lib/drivingLicense';
import { useDrivingLicenseStrings } from '../../lib/drivingLicenseStrings';
import { DrivingLicenseStatusPill } from './DrivingLicenseStatusCard';
import { kycDateTime } from './kycDate';

const REJECT_REASON_MAX = 500;

export interface DrivingLicenseReview {
  id: string;
  action: string;
  reason: string | null;
  reviewerName: string | null;
  reviewedAt: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium leading-5 text-[#9CA3AF]">{label}</dt>
      <dd className="mt-1 text-[15px] leading-6 text-[#1F2937]">{children}</dd>
    </div>
  );
}

/**
 * ส่วนใบขับขี่ในหน้า KYC review ของแอดมิน (PYG-598 · ดีไซน์ PYG-595 "Admin ตรวจใบขับขี่")
 *
 * - อนุมัติ / ปฏิเสธรายใบ (approveDrivingLicense / rejectDrivingLicense) แยกจากอนุมัติ KYC ทั้งชุด
 * - ปฏิเสธต้องมีเหตุผล (กันที่หน้าจอ + BE ตอบ REJECT_REASON_REQUIRED)
 * - หมดอายุแล้วอนุมัติไม่ได้ — อ่าน isExpired ของ BE ไม่คำนวณจากนาฬิกาเครื่อง · DRIVING_LICENSE_EXPIRED จาก API แสดงข้อความเดียวกัน
 * - แสดงประวัติการตรวจทุกรอบ (drivingLicenseReviews ใหม่สุดก่อน)
 */
export default function AdminDrivingLicensePanel({
  info,
  reviews,
  caregiverName,
  onChanged,
  notify,
}: {
  info: DrivingLicenseInfo | null;
  reviews: DrivingLicenseReview[];
  caregiverName: string;
  onChanged: () => Promise<unknown> | void;
  notify: { success: (message: string) => void; error: (message: string) => void };
}) {
  const s = useDrivingLicenseStrings();
  const [approve, { loading: approving }] = useMutation(APPROVE_DRIVING_LICENSE);
  const [reject, { loading: rejecting }] = useMutation(REJECT_DRIVING_LICENSE);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const status = drivingLicenseStatus(info);
  // ไม่มีใบและไม่เคยตรวจ → ผู้ดูแลไม่ได้ขับรถรับส่งเอง ไม่ต้องแสดงส่วนนี้
  if (status === 'none' && reviews.length === 0) return null;

  const documentId = info?.documentId ?? null;
  const expiryYmd = toBangkokYmd(info?.expiresAt);
  const expiryText = expiryYmd ? formatLicenseDate(expiryYmd) : '-';
  const days = expiryYmd ? daysUntilBangkok(expiryYmd) : NaN;
  const isPending = info?.status === 'pending';
  const expired = !!info?.isExpired;
  const canApprove = isPending && !expired && !!documentId;

  async function handleError(err: unknown, op: 'approve' | 'reject') {
    logGraphQLError(op === 'approve' ? 'ApproveDrivingLicense' : 'RejectDrivingLicense', err);
    const code = drivingLicenseErrorCode(err);
    if (code === 'REJECT_REASON_REQUIRED') {
      setReasonError(s.adminRejectReasonRequired);
      return;
    }
    if (code === 'DRIVING_LICENSE_EXPIRED') notify.error(s.adminExpiredBlocked(expiryText));
    else if (code) notify.error(s.apiError[code]);
    else if (extractGraphQLErrorCode(err) === 'CONFLICT') notify.error(s.adminAlreadyDecided);
    else notify.error(s.adminActionFailed);
    setIsApproveOpen(false);
    setIsRejectOpen(false);
    await onChanged();
  }

  async function handleApprove() {
    if (!documentId) return;
    try {
      await approve({ variables: { documentId } });
      setIsApproveOpen(false);
      notify.success(s.adminApproved);
      await onChanged();
    } catch (err) {
      await handleError(err, 'approve');
    }
  }

  async function handleReject() {
    if (!documentId) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError(s.adminRejectReasonRequired);
      return;
    }
    try {
      await reject({ variables: { documentId, reason: trimmed } });
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
      aria-labelledby="admin-driving-license-title"
      className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="admin-driving-license-title" className="flex items-center gap-2 text-base font-semibold leading-5 text-[#064E3B]">
          <Icon name="directions_car" color="currentColor" style={{ fontSize: 20 }} />
          {s.adminTitle}
        </h3>
        {status !== 'none' && <DrivingLicenseStatusPill status={status} />}
      </div>

      {status === 'none' || !info ? (
        <p className="mt-3 text-[15px] text-[#9CA3AF]">{s.adminNoLicense}</p>
      ) : (
        <>
          <dl className="mt-4 grid gap-x-6 gap-y-4 border-t border-[#F3F4F6] pt-4 sm:grid-cols-2">
            <Field label={s.adminExpiryEntered}>
              {expiryText}
              {Number.isFinite(days) && (
                <span className={`ml-1.5 text-[13px] ${expired ? 'font-semibold text-[#B91C1C]' : 'text-[#6B7280]'}`}>
                  · {days < 0 ? s.adminOverdue(-days) : s.adminRemaining(days)}
                </span>
              )}
            </Field>
            <Field label={s.adminFile}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="truncate">{info.fileName ?? '-'}</span>
                {info.signedUrl && (
                  <a
                    href={info.signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#F3F4F6] px-2.5 text-[13px] font-semibold text-[#374151] hover:bg-gray-200"
                  >
                    <Icon name="open_in_new" color="currentColor" style={{ fontSize: 16 }} />
                    {s.adminViewFile}
                  </a>
                )}
              </span>
            </Field>
          </dl>

          {/* ดูรูป + กดเพื่อขยาย (แท็บใหม่) · PDF เปิดผ่านปุ่ม "เปิดดูไฟล์" ด้านบน */}
          {info.signedUrl && !/\.pdf$/i.test(info.fileName ?? '') && (
            <a href={info.signedUrl} target="_blank" rel="noreferrer" className="mt-4 block overflow-hidden rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]">
              <img src={info.signedUrl} alt={s.fileTitle} className="max-h-[320px] w-full object-contain" />
            </a>
          )}

          {info.status === 'rejected' && info.rejectionReason && (
            <div className="mt-4 rounded-lg bg-[#FEF2F2] px-3 py-2">
              <p className="text-[12px] font-semibold text-[#B91C1C]">{s.rejectedReasonLabel}</p>
              <p className="mt-0.5 text-[14px] text-[#7F1D1D]">{info.rejectionReason}</p>
            </div>
          )}

          {isPending && !expired && (
            <div className="mt-4 rounded-lg bg-[#F9FAFB] px-4 py-3">
              <p className="text-[13px] font-semibold text-[#374151]">{s.adminChecklistTitle}</p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[13.5px] text-[#4B5563]">
                {s.adminChecklist.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          {expired && (
            <p id="admin-driving-license-approve-blocked" role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13.5px] text-[#B91C1C]">
              <Icon name="block" color="currentColor" style={{ fontSize: 18 }} />
              {s.adminExpiredBlocked(expiryText)}
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
                aria-describedby={expired ? 'admin-driving-license-approve-blocked' : undefined}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#059669] px-4 text-[13px] font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-gray-300 cursor-pointer"
              >
                {!canApprove && <Icon name="lock" color="currentColor" style={{ fontSize: 16 }} />}
                {s.adminApprove}
              </button>
            </div>
          ) : (
            <p className="mt-4 text-right text-sm text-gray-500">{s.adminDecidedNote}</p>
          )}
        </>
      )}

      {/* ประวัติการตรวจทุกรอบ */}
      <div className="mt-5 border-t border-[#F3F4F6] pt-4">
        <p className="text-[13px] font-semibold text-[#374151]">{s.adminHistory}</p>
        {reviews.length === 0 ? (
          <p className="mt-1 text-[13.5px] text-[#9CA3AF]">{s.adminHistoryEmpty}</p>
        ) : (
          <ol className="mt-2 flex flex-col gap-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg bg-[#F9FAFB] px-3 py-2 text-[13.5px] text-[#374151]">
                <span className="font-semibold">{s.adminHistoryAction[r.action] ?? r.action}</span>
                <span className="text-[#6B7280]">
                  {' · '}{kycDateTime(r.reviewedAt)}
                  {r.reviewerName ? ` · ${r.reviewerName}` : ''}
                </span>
                {r.reason && <p className="mt-0.5 text-[#7F1D1D]">{r.reason}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>

      <ConfirmModal
        isOpen={isApproveOpen}
        isLoading={approving}
        title={s.adminApproveTitle}
        description={s.adminApproveBody(caregiverName || '-', expiryText)}
        cancelText={s.cancel}
        confirmText={s.adminApprove}
        onClose={() => setIsApproveOpen(false)}
        onConfirm={() => void handleApprove()}
      />

      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="reject-driving-license-title">
          <div className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-xl">
            <h2 id="reject-driving-license-title" className="text-[17px] font-semibold text-[#111827]">{s.adminRejectTitle}</h2>
            <label htmlFor="reject-driving-license-reason" className="mt-4 block text-[14px] font-semibold text-[#111827]">
              {s.adminRejectReason} <span className="text-[#DC2626]" aria-hidden="true">*</span>
            </label>
            <p className="text-[13px] text-[#6B7280]">{s.adminRejectReasonHint}</p>
            <textarea
              id="reject-driving-license-reason"
              value={reason}
              maxLength={REJECT_REASON_MAX}
              rows={4}
              autoFocus
              onChange={(e) => { setReason(e.target.value); if (reasonError) setReasonError(''); }}
              aria-required="true"
              aria-invalid={!!reasonError || undefined}
              aria-describedby={reasonError ? 'reject-driving-license-reason-error' : undefined}
              className={`mt-2 w-full rounded-lg border px-3 py-2 text-[14px] outline-none focus:border-[#059669] ${reasonError ? 'border-[#DC2626] bg-[#FEF2F2]' : 'border-[#E5E7EB]'}`}
            />
            {reasonError && (
              <p id="reject-driving-license-reason-error" role="alert" className="mt-1 flex items-center gap-1 text-[13px] text-[#DC2626]">
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
                disabled={rejecting || !reason.trim()}
                onClick={() => void handleReject()}
                className="h-9 rounded-lg bg-[#DC2626] px-4 text-[13px] font-semibold text-white hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
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
