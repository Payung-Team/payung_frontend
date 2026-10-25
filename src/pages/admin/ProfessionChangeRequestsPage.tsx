import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  ADMIN_PROFESSION_CHANGE_PENDING_COUNT,
  ADMIN_PROFESSION_CHANGE_REQUESTS,
  APPROVE_PROFESSION_CHANGE_REQUEST,
  REJECT_PROFESSION_CHANGE_REQUEST,
  type AdminProfessionChangeRequest,
  type ProfessionChangeStatus,
} from '../../graphql/professionChange';
import { PROFESSIONS, isProfession, professionErrorMessage } from '../../lib/professions';
import { daysUntilBangkok, licenseErrorCodes, normalizeLicenseStatus, toBangkokYmd } from '../../lib/license';
import { useLicenseStrings } from '../../lib/licenseStrings';
import { extractGraphQLErrorCode, extractGraphQLErrorMessage, userFacingErrorMessage } from '../../lib/apolloErrors';
import { logGraphQLError } from '../../lib/logGraphQLError';
import ProfessionBadge from '../../components/ui/ProfessionBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import FilterTabs, { type FilterTabItem } from '../../components/ui/FilterTabs';
import Pagination from '../../components/ui/Pagination';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { kycDate, kycDateTime } from '../../features/kyc/kycDate';

/**
 * คิวตรวจคำขอเปลี่ยนวิชาชีพ (PYG-665 · S01-AC6 · BE PYG-575 / PYG-663)
 *
 * - อนุมัติ = เปลี่ยนวิชาชีพ + อนุมัติใบประกอบฯ ที่แนบ (ทรานแซคชันเดียว)
 * - ปฏิเสธ = วิชาชีพคงเดิม + ใบที่ยังรอตรวจถูกปฏิเสธด้วยเหตุผลเดียวกัน (ผู้ดูแลเห็นเหตุผล)
 * - ไฟล์ใบไม่ส่งมากับคิว (BE ไม่ออก signedUrl) → ปุ่ม "ดูใบ" พาไปหน้า KYC ของผู้ดูแล ซึ่งลง audit ก่อนเปิดไฟล์
 */

const PAGE_SIZE = 20;
const REJECT_REASON_MAX = 500;
const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

const TABS: Array<{ key: ProfessionChangeStatus; label: string; empty: string }> = [
  { key: 'pending', label: 'รอตรวจ', empty: 'ไม่มีคำขอที่รอตรวจ' },
  { key: 'approved', label: 'อนุมัติแล้ว', empty: 'ยังไม่มีคำขอที่อนุมัติ' },
  { key: 'rejected', label: 'ปฏิเสธแล้ว', empty: 'ยังไม่มีคำขอที่ปฏิเสธ' },
  { key: 'cancelled', label: 'ผู้ดูแลยกเลิก', empty: 'ยังไม่มีคำขอที่ถูกยกเลิก' },
];

function parseTab(value: string | null): ProfessionChangeStatus {
  return TABS.some((t) => t.key === value) ? (value as ProfessionChangeStatus) : 'pending';
}

function thaiDate(value: string | null | undefined, withTime = false): string {
  return withTime ? kycDateTime(value) : kycDate(value);
}

/** ข้อความ error ของการอนุมัติ/ปฏิเสธ — code วิชาชีพ / ใบประกอบฯ ก่อน แล้วค่อยข้อความจาก BE */
function useDecisionErrorMessage() {
  const ls = useLicenseStrings();
  return (err: unknown, fallback: string) => {
    const professionMessage = professionErrorMessage(err);
    if (professionMessage) return professionMessage;
    const [licenseCode] = licenseErrorCodes(err);
    if (licenseCode) return ls.apiError[licenseCode];
    return extractGraphQLErrorMessage(err) ?? fallback;
  };
}

function LicenseInfo({ item }: { item: AdminProfessionChangeRequest }) {
  const ls = useLicenseStrings();
  const doc = item.licenseDocument;
  if (!doc) {
    const required = isProfession(item.toProfession) && PROFESSIONS[item.toProfession].requiresLicense;
    return (
      <p className={`text-[13px] ${required ? 'font-semibold text-[#B42318]' : 'text-[#64748B]'}`}>
        {required ? 'ไม่มีใบประกอบวิชาชีพแนบมา (คำขอก่อนบังคับแนบใบ) · อนุมัติไม่ได้ ให้ปฏิเสธแล้วให้ผู้ดูแลยื่นใหม่' : 'ไม่ต้องแนบใบประกอบวิชาชีพ'}
      </p>
    );
  }

  const expiry = toBangkokYmd(item.licenseExpiresAt);
  const daysLeft = expiry ? daysUntilBangkok(expiry) : null;
  const status = normalizeLicenseStatus(doc.reviewStatus);
  return (
    <div className="flex flex-col gap-1 text-[13px] text-[#334155]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="material-icons-outlined text-[#B7791F]" style={{ fontSize: 18 }} aria-hidden="true">badge</span>
        <span className="font-semibold">{doc.fileName}</span>
        <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[12px] text-[#475569]">ใบ: {ls.status[status]}</span>
      </div>
      <span>
        เลขที่ {item.licenseNumber ?? '-'} · หมดอายุ {thaiDate(item.licenseExpiresAt)}
        {daysLeft !== null && (
          <span className={daysLeft <= 0 ? 'ml-1 font-semibold text-[#B42318]' : daysLeft <= 30 ? 'ml-1 text-[#B45309]' : 'ml-1 text-[#64748B]'}>
            ({daysLeft <= 0 ? 'หมดอายุแล้ว' : `เหลือ ${daysLeft} วัน`})
          </span>
        )}
      </span>
    </div>
  );
}

/** mount เฉพาะตอนเปิด — เปิดใหม่ได้ฟอร์มว่างเสมอ */
function RejectModal({
  item,
  isLoading,
  onClose,
  onConfirm,
}: {
  item: AdminProfessionChangeRequest;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const tooLong = trimmed.length > REJECT_REASON_MAX;
  const valid = trimmed.length > 0 && !tooLong;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="fixed inset-0 -z-10" onClick={isLoading ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-profession-title"
        className="flex w-[560px] max-w-[92vw] flex-col gap-4 rounded-xl bg-white p-7 shadow-2xl"
        style={font}
      >
        <div className="flex flex-col gap-1">
          <h2 id="reject-profession-title" className="text-[20px] font-semibold text-[#A32D2D]">
            ปฏิเสธคำขอเปลี่ยนวิชาชีพ - {item.caregiverName}
          </h2>
          <p className="text-[14px] leading-6 text-[#717182]">
            วิชาชีพของผู้ดูแลคงเดิม{item.licenseDocument ? ' และใบประกอบฯ ที่ยังรอตรวจจะถูกปฏิเสธด้วยเหตุผลนี้' : ''} · ผู้ดูแลเห็นเหตุผลนี้
          </p>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#374151]">
            เหตุผล <span className="text-red-600" aria-hidden="true">*</span>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="เช่น เลขใบประกอบฯ ไม่ตรงกับในรูป"
            aria-invalid={tooLong || undefined}
            className="resize-none rounded-lg border border-[#D1D5DB] px-3 py-2 text-[14px] text-[#1F2937] outline-none focus:border-[#A32D2D]"
          />
        </label>
        <div className="min-h-[16px]">
          {!trimmed && <span className="text-xs font-medium text-red-500">ต้องระบุเหตุผลที่ปฏิเสธ</span>}
          {tooLong && (
            <span className="text-xs font-medium text-red-500">
              เหตุผลยาวเกิน {REJECT_REASON_MAX} ตัวอักษร (ปัจจุบัน {trimmed.length})
            </span>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-[35px] w-[115px] cursor-pointer rounded border border-black/10 bg-white text-[14px] font-medium text-[#0A0A0A] hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => valid && onConfirm(trimmed)}
            disabled={isLoading || !valid}
            className="h-[35px] w-[143px] cursor-pointer rounded bg-[#DC2626] text-[14px] font-medium text-white hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'กำลังบันทึก...' : 'ยืนยันการปฏิเสธ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfessionChangeRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = parseTab(searchParams.get('status'));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const toast = useToast();
  const decisionErrorMessage = useDecisionErrorMessage();

  const { data, loading, error, refetch } = useQuery<{
    adminProfessionChangeRequests: {
      items: AdminProfessionChangeRequest[];
      total: number;
      page: number;
      totalPages: number;
    };
  }>(ADMIN_PROFESSION_CHANGE_REQUESTS, {
    variables: { input: { status, page, limit: PAGE_SIZE } },
    fetchPolicy: 'cache-and-network',
  });
  const { data: pendingData } = useQuery<{ adminProfessionChangeRequests: { total: number } }>(
    ADMIN_PROFESSION_CHANGE_PENDING_COUNT,
    { fetchPolicy: 'cache-and-network' },
  );

  // หลังตัดสิน: โหลดคิวใหม่ + จำนวนรอตรวจ (badge ในเมนูใช้ query เดียวกัน)
  const afterDecision = {
    refetchQueries: [{ query: ADMIN_PROFESSION_CHANGE_PENDING_COUNT }],
    awaitRefetchQueries: true,
  };
  const [approveRequest, { loading: approving }] = useMutation(APPROVE_PROFESSION_CHANGE_REQUEST, afterDecision);
  const [rejectRequest, { loading: rejecting }] = useMutation(REJECT_PROFESSION_CHANGE_REQUEST, afterDecision);

  const [approveTarget, setApproveTarget] = useState<AdminProfessionChangeRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<AdminProfessionChangeRequest | null>(null);

  const list = data?.adminProfessionChangeRequests;
  const items = list?.items ?? [];
  const tab = TABS.find((t) => t.key === status)!;
  const pendingTotal = pendingData?.adminProfessionChangeRequests.total ?? 0;

  const tabs = useMemo<FilterTabItem<ProfessionChangeStatus>[]>(
    () => TABS.map((t) => ({ key: t.key, label: t.label, ...(t.key === 'pending' ? { count: pendingTotal } : {}) })),
    [pendingTotal],
  );

  function setQuery(nextStatus: ProfessionChangeStatus, nextPage = 1) {
    const next = new URLSearchParams();
    if (nextStatus !== 'pending') next.set('status', nextStatus);
    if (nextPage > 1) next.set('page', String(nextPage));
    setSearchParams(next);
  }

  /** ข้อมูลบนจอเก่า (ยกเลิก/ตัดสินไปแล้ว) → โหลดใหม่ */
  function syncIfStale(err: unknown) {
    const code = extractGraphQLErrorCode(err);
    if (code === 'PROFESSION_CHANGE_NOT_PENDING' || code === 'PROFESSION_CHANGE_NOT_FOUND') void refetch();
  }

  async function approve() {
    if (!approveTarget) return;
    try {
      await approveRequest({ variables: { id: approveTarget.id } });
      toast.success(`อนุมัติแล้ว · ${approveTarget.caregiverName} เป็น${PROFESSIONS[approveTarget.toProfession as keyof typeof PROFESSIONS]?.label ?? approveTarget.toProfession}`, undefined, 'admin-toast');
      setApproveTarget(null);
      void refetch();
    } catch (err) {
      logGraphQLError('ApproveProfessionChangeRequest', err);
      setApproveTarget(null);
      syncIfStale(err);
      toast.error(decisionErrorMessage(err, 'อนุมัติไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'), 6000, 'admin-toast');
    }
  }

  async function reject(reason: string) {
    if (!rejectTarget) return;
    try {
      await rejectRequest({ variables: { id: rejectTarget.id, reason } });
      toast.success(`ปฏิเสธคำขอของ ${rejectTarget.caregiverName} แล้ว`, undefined, 'admin-toast');
      setRejectTarget(null);
      void refetch();
    } catch (err) {
      logGraphQLError('RejectProfessionChangeRequest', err);
      setRejectTarget(null);
      syncIfStale(err);
      toast.error(decisionErrorMessage(err, 'ปฏิเสธไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'), 6000, 'admin-toast');
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6" style={font}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[#0F172A]">คำขอเปลี่ยนวิชาชีพ</h1>
          <p className="text-[13px] text-[#64748B]">อนุมัติ = เปลี่ยนวิชาชีพและอนุมัติใบประกอบฯ ที่แนบไปพร้อมกัน</p>
        </div>
        <FilterTabs items={tabs} activeKey={status} onChange={(key) => setQuery(key)} />
      </div>

      {error && !data ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700">
          โหลดคำขอเปลี่ยนวิชาชีพไม่สำเร็จ · {userFacingErrorMessage(error, 'กรุณาลองใหม่อีกครั้ง')}
        </div>
      ) : loading && !data ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[132px] animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[#CBD5E1] bg-white px-4 py-12 text-center">
          <span className="material-icons-outlined text-[#94A3B8]" style={{ fontSize: 36 }} aria-hidden="true">swap_horiz</span>
          <p className="text-[15px] font-semibold text-[#334155]">{tab.empty}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold text-[#0F172A]">
                    {item.caregiverName || '-'}
                    {item.caregiverNumber && <span className="ml-2 text-[13px] font-medium text-[#64748B]">{item.caregiverNumber}</span>}
                  </span>
                  <span className="text-[12.5px] text-[#64748B]">ยื่นเมื่อ {thaiDate(item.requestedAt, true)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ProfessionBadge profession={item.fromProfession} />
                  <span className="material-icons text-[#94A3B8]" style={{ fontSize: 18 }} aria-label="เปลี่ยนเป็น">arrow_forward</span>
                  <ProfessionBadge profession={item.toProfession} />
                </div>
              </div>

              <LicenseInfo item={item} />

              {item.status === 'rejected' && (
                <p className="text-[13px] text-[#B42318]">เหตุผลที่ปฏิเสธ: {item.rejectionReason || '-'}</p>
              )}
              {item.reviewedAt && (
                <p className="text-[12.5px] text-[#64748B]">
                  ตัดสินเมื่อ {thaiDate(item.reviewedAt, true)}{item.reviewerName ? ` โดย ${item.reviewerName}` : ''}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#F1F5F9] pt-3">
                <Link
                  to={`/admin/kyc/${item.caregiverId}`}
                  className="mr-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[#2D6A58] hover:underline"
                >
                  <span className="material-icons-outlined" style={{ fontSize: 17 }} aria-hidden="true">visibility</span>
                  {item.licenseDocument ? 'ดูใบประกอบฯ และ KYC ของผู้ดูแล' : 'ดู KYC ของผู้ดูแล'}
                </Link>
                {item.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setRejectTarget(item)}
                      className="h-[35px] cursor-pointer rounded border border-[#DC2626] px-4 text-[14px] font-medium text-[#DC2626] hover:bg-red-50"
                    >
                      ปฏิเสธ
                    </button>
                    <button
                      type="button"
                      onClick={() => setApproveTarget(item)}
                      className="h-[35px] cursor-pointer rounded bg-[#059669] px-4 text-[14px] font-medium text-white hover:bg-[#047857]"
                    >
                      อนุมัติ
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {list && list.totalPages > 1 && (
        <Pagination className="self-center" page={page} totalPages={list.totalPages} onPageChange={(p) => setQuery(status, p)} />
      )}

      <ConfirmModal
        isOpen={!!approveTarget}
        isLoading={approving}
        title="อนุมัติคำขอเปลี่ยนวิชาชีพ?"
        iconName="how_to_reg"
        confirmText="อนุมัติ"
        onClose={() => setApproveTarget(null)}
        onConfirm={approve}
        description={
          approveTarget && (
            <div className="flex flex-col items-center gap-3 text-left">
              <div className="flex items-center gap-2">
                <ProfessionBadge profession={approveTarget.fromProfession} />
                <span className="material-icons text-[#94A3B8]" style={{ fontSize: 18 }} aria-hidden="true">arrow_forward</span>
                <ProfessionBadge profession={approveTarget.toProfession} />
              </div>
              <ul className="list-disc pl-5 text-[14px] text-[#334155]">
                <li>โปรไฟล์ของ {approveTarget.caregiverName} จะแสดงวิชาชีพใหม่ทันที</li>
                {approveTarget.licenseDocument && <li>ใบประกอบฯ เลขที่ {approveTarget.licenseNumber ?? '-'} จะถูกอนุมัติไปพร้อมกัน</li>}
              </ul>
            </div>
          )
        }
      />

      {rejectTarget && (
        <RejectModal item={rejectTarget} isLoading={rejecting} onClose={() => setRejectTarget(null)} onConfirm={reject} />
      )}

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} position="top-right" variant="admin-toast" />
    </div>
  );
}
