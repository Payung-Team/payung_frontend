import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { ADMIN_KYC_DETAIL, APPROVE_KYC, REJECT_KYC } from '../../graphql/queries';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast, type ToastMessage } from '../../hooks/useToast';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import KycDocumentsPreview from '../../components/ui/KycDocumentsPreview';
import KycHistoryCard from '../../components/ui/KycHistoryCard';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { getBankLabel } from '../../features/kyc/omiseBanks';
import { skillLabel } from '../../lib/skillLabels';

type KycStatus = 'pending' | 'verified' | 'rejected' | 'none' | string;

interface CaregiverDetail {
  id: string;
  userId: string;
  caregiverNumber?: string | null;
  fullName: string;
  email?: string | null;
  idCardNumber: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  phone: string;
  skills: string[];
  experienceYears: number;
  hourlyRate: number;
  bio?: string | null;
  kycStatus: KycStatus;
  kycSubmittedAt?: string | null;
  kycVerifiedAt?: string | null;
  resubmitCount: number;
  createdAt: string;
  updatedAt: string;
}

interface KycDocument {
  id: string;
  docType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** BE PR #39: ใช้ signedUrl เท่านั้น (fileUrl เป็นสตริงว่างเสมอ) — อายุ 15 นาที */
  signedUrl?: string | null;
  uploadedAt: string;
}

interface KycReview {
  id: string;
  action: string;
  reason?: string | null;
  reviewedBy: string;
  reviewedAt: string;
}

interface CaregiverEditLog {
  id: string;
  action: string;
  editorName?: string | null;
  createdAt: string;
  fieldChanges?: Array<{ field: string; oldValue?: string; newValue?: string }> | null;
}

interface AdminPayoutAccountSummary {
  bankCode: string;
  accountName: string;
  accountNumberLast4: string;
  status: string;
  recipientStatus: string;
  hasOmiseRecipient: boolean;
}

interface AdminKycDetailResponse {
  adminKycDetail: {
    caregiver: CaregiverDetail;
    documents: KycDocument[];
    resubmitCount: number;
    reviews: KycReview[];
    editHistory: CaregiverEditLog[];
    payoutAccount?: AdminPayoutAccountSummary | null;
    /** PYG-511: มีรูปโปรไฟล์รออนุมัติ → แสดงลิงก์ไปหน้าเทียบรูป */
    pendingProfilePhotoDocumentId?: string | null;
  };
}

const RECIPIENT_STATUS_META: Record<string, { label: string; className: string }> = {
  unverified: { label: 'รอตรวจสอบ', className: 'bg-[#FFF7ED] text-[#C2410C]' },
  verified: { label: 'ยืนยันแล้ว', className: 'bg-[#ECFDF5] text-[#047857]' },
  failed: { label: 'ตรวจสอบไม่ผ่าน', className: 'bg-[#FEF2F2] text-[#DC2626]' },
};


const statusMeta: Record<string, { label: string; badge: string; dot: string }> = {
  pending: {
    label: 'รอตรวจสอบ',
    badge: 'bg-[#FFFBEB] text-[#92400E]',
    dot: 'bg-[#F59E0B]',
  },
  verified: {
    label: 'อนุมัติแล้ว',
    badge: 'bg-[#ECFDF5] text-[#047857]',
    dot: 'bg-[#059669]',
  },
  rejected: {
    label: 'ปฏิเสธแล้ว',
    badge: 'bg-[#FEF2F2] text-[#DC2626]',
    dot: 'bg-[#EF4444]',
  },
  none: {
    label: 'ยังไม่ส่ง',
    badge: 'bg-gray-100 text-gray-600',
    dot: 'bg-gray-400',
  },
};

const docTypeLabel: Record<string, string> = {
  id_card_front: 'บัตรประชาชน (ด้านหน้า)',
  id_card_selfie: 'รูปถ่ายคู่บัตรประชาชน',
  certificate: 'ใบรับรองอบรม',
  id_card: 'บัตรประชาชน',
  photo: 'รูปถ่าย',
  license: 'ใบอนุญาต',
};

const genderLabel: Record<string, string> = {
  male: 'ชาย',
  female: 'หญิง',
  other: 'อื่นๆ',
};

/** 1509966392215 → 1-5099-66392-21-5 (รูปแบบเดียวกับบนบัตร ช่วยให้เทียบกับเอกสารง่าย) */
function formatIdCard(value?: string | null) {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 13) return value;
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
}

function formatPhone(value?: string | null) {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  return value;
}

function formatThaiDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date);
}

function getAge(dateOfBirth?: string | null) {
  if (!dateOfBirth) return '-';
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return '-';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return `${age} ปี`;
}

function statusLabel(status: KycStatus) {
  return statusMeta[status]?.label ?? status;
}

function CaregiverField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium leading-5 text-[#9CA3AF]">{label}</dt>
      <dd className="mt-1 truncate text-[15px] leading-6 text-[#1F2937]">{value || '-'}</dd>
    </div>
  );
}

interface RejectReasonRow {
  id: string;
  documentType: string;
  reason: string;
}

// ค่าต้องตรงกับที่ KycStatusPage / KycResubmitPage ใช้ map ไปหน้าแก้ไข
const DOC_OPTIONS = [
  { value: 'บัตรประชาชน', icon: 'badge' },
  { value: 'รูปถ่ายคู่บัตรประชาชน', icon: 'photo_camera' },
  { value: 'ใบรับรองอบรม', icon: 'workspace_premium' },
  { value: 'ข้อมูลส่วนตัว', icon: 'person' },
];
const DOC_ICON: Record<string, string> = Object.fromEntries(DOC_OPTIONS.map((o) => [o.value, o.icon]));
const MAX_REASON_LENGTH = 200;

function RejectModal({
  isOpen,
  isLoading,
  caregiverName,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  isLoading: boolean;
  caregiverName: string;
  onClose: () => void;
  onConfirm: (reasons: Array<{ title: string; detail?: string; documentType?: string }>) => void;
}) {
  // state ถูก reset ทุกครั้งที่เปิด เพราะ parent remount ผ่าน key
  const [rows, setRows] = useState<RejectReasonRow[]>([]);
  // แถวที่เพิ่งเพิ่ม — ใช้ไฮไลต์ชั่วครู่ให้ admin เห็นว่ากด chip แล้วเกิดแถวใหม่
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const nextIdRef = useRef(0);

  if (!isOpen) return null;

  const handleAddRow = (documentType: string) => {
    const id = `${documentType}-${nextIdRef.current++}`;
    setRows((prev) => [...prev, { id, documentType, reason: '' }]);
    setHighlightId(id);
    setTimeout(() => setHighlightId((current) => (current === id ? null : current)), 1200);
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleReasonChange = (id: string, value: string) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, reason: value } : row)));
  };

  const hasRows = rows.length > 0;
  const allHaveReason = rows.every((row) => row.reason.trim() !== '');
  const isValid = hasRows && allHaveReason;

  const handleConfirmClick = () => {
    if (!isValid) return;
    onConfirm(rows.map((row) => ({ title: row.reason.trim(), documentType: row.documentType })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div
        className="w-[520px] max-w-full max-h-full bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-4">
          <span className="w-10 h-10 shrink-0 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center justify-center">
            <Icon name="assignment_return" style={{ fontSize: '20px' }} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[17px] font-semibold leading-6 text-[#111827] truncate">ปฏิเสธ KYC - {caregiverName}</h2>
            <p className="text-[13px] leading-5 text-[#6B7280]">ส่งกลับให้ผู้ดูแลแก้ไขตามรายการด้านล่าง</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="ปิด"
            className="w-8 h-8 shrink-0 -mr-1 flex items-center justify-center rounded-full text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#4B5563] transition-colors cursor-pointer"
          >
            <Icon name="close" style={{ fontSize: '18px' }} />
          </button>
        </div>

        {/* Body — เลื่อนแนวตั้งได้เมื่อรายการยาวเกินจอ */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 pb-2 flex flex-col gap-5">
          {/* Document type quick actions */}
          <section className="flex flex-col gap-2">
            <div>
              <h3 className="text-[14px] font-semibold text-[#111827]">
                ระบุส่วนที่ต้องการให้แก้ไข <span className="text-[#DC2626]">*</span>
              </h3>
              <p className="text-[12px] text-[#9CA3AF]">กดเพื่อเพิ่มรายการ · กดซ้ำได้ถ้ามีหลายเหตุผล</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DOC_OPTIONS.map((option) => {
                const count = rows.filter((row) => row.documentType === option.value).length;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleAddRow(option.value)}
                    className="group h-11 pl-3 pr-2 flex items-center gap-2.5 rounded-xl border border-[#E5E7EB] bg-white text-left transition-all cursor-pointer select-none hover:border-[#DC2626] hover:bg-[#FFFBFB] active:scale-[0.98]"
                  >
                    <span className="flex text-[#9CA3AF] transition-colors group-hover:text-[#DC2626]">
                      <Icon name={option.icon} style={{ fontSize: '18px' }} />
                    </span>
                    <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-[#374151]">{option.value}</span>
                    {count > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#DC2626] text-white text-[11px] font-semibold flex items-center justify-center">
                        {count}
                      </span>
                    )}
                    <span className="w-7 h-7 shrink-0 rounded-lg bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center transition-colors group-hover:bg-[#DC2626] group-hover:text-white">
                      <Icon name="add" style={{ fontSize: '18px' }} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Reasons list */}
          {hasRows && (
            <section className="flex flex-col gap-2">
              <h3 className="text-[12px] font-medium text-[#6B7280]">รายการที่ต้องแก้ไข ({rows.length})</h3>
              {rows.map((row, index) => {
                // ลำดับของแถวในประเภทเดียวกัน — แสดง #2, #3 เมื่อเพิ่มประเภทซ้ำ
                const sameTypeIndex = rows.slice(0, index + 1).filter((r) => r.documentType === row.documentType).length;
                const isEmpty = row.reason.trim() === '';
                return (
                  <div
                    key={row.id}
                    className={`rounded-xl border p-3 flex flex-col gap-2 transition-colors duration-700 ${
                      highlightId === row.id ? 'border-[#FCA5A5] bg-[#FEF2F2]' : 'border-[#F3F4F6] bg-[#F9FAFB]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex text-[#DC2626]">
                        <Icon name={DOC_ICON[row.documentType] ?? 'description'} style={{ fontSize: '16px' }} />
                      </span>
                      <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-[#111827]">
                        {row.documentType}
                        {sameTypeIndex > 1 && <span className="ml-1 font-normal text-[#9CA3AF]">#{sameTypeIndex}</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        aria-label={`ลบรายการ ${row.documentType}`}
                        className="h-6 px-2 flex items-center gap-1 rounded-md text-[12px] text-[#9CA3AF] hover:bg-white hover:text-[#DC2626] transition-colors cursor-pointer"
                      >
                        <Icon name="delete" style={{ fontSize: '14px' }} />
                        ลบ
                      </button>
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={row.reason}
                      maxLength={MAX_REASON_LENGTH}
                      onChange={(e) => handleReasonChange(row.id, e.target.value)}
                      placeholder="ระบุเหตุผล เช่น รูปไม่ชัด มองไม่เห็นเลขบัตร"
                      aria-label={`เหตุผลที่ต้องแก้ไข ${row.documentType}`}
                      className={`w-full h-10 px-3 rounded-lg border bg-white text-[14px] text-[#111827] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#DC2626] focus:ring-2 focus:ring-[#FEE2E2] ${
                        isEmpty ? 'border-[#FECACA]' : 'border-[#E5E7EB]'
                      }`}
                      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                    />
                  </div>
                );
              })}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="mt-2 px-6 py-4 border-t border-[#F3F4F6] flex items-center justify-between gap-4">
          <span className={`text-[12px] ${hasRows && !allHaveReason ? 'text-[#DC2626]' : 'text-[#9CA3AF]'}`}>
            {!hasRows && 'เลือกอย่างน้อย 1 รายการ'}
            {hasRows && !allHaveReason && 'กรุณาระบุเหตุผลให้ครบทุกรายการ'}
            {isValid && `พร้อมส่ง ${rows.length} รายการ`}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="h-10 px-4 rounded-lg border border-[#E5E7EB] text-[14px] font-medium text-[#374151] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isLoading || !isValid}
              className="h-10 px-4 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-[14px] font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? 'กำลังบันทึก...' : 'ยืนยันการปฏิเสธ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function KycReviewDetailPage() {
  const { caregiverId } = useParams<{ caregiverId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery<AdminKycDetailResponse>(ADMIN_KYC_DETAIL, {
    variables: { caregiverId },
    skip: !caregiverId,
    fetchPolicy: 'cache-and-network',
  });

  const caregiver = data?.adminKycDetail.caregiver;
  const documents = data?.adminKycDetail.documents ?? [];
  const reviews = data?.adminKycDetail.reviews ?? [];
  const editHistory = data?.adminKycDetail.editHistory ?? [];
  const resubmitCount = data?.adminKycDetail.resubmitCount ?? caregiver?.resubmitCount ?? 0;
  const payoutAccount = data?.adminKycDetail.payoutAccount ?? null;
  const isPending = caregiver?.kycStatus === 'pending';


  const [approveKyc, { loading: approving }] = useMutation(APPROVE_KYC);
  const [rejectKyc, { loading: rejecting }] = useMutation(REJECT_KYC);

  const currentStatusMeta = statusMeta[caregiver?.kycStatus || 'none'] ?? statusMeta.none;

  const nameParts = useMemo(() => {
    if (!caregiver?.fullName) return { firstName: '-', lastName: '-' };
    const parts = caregiver.fullName.trim().split(/\s+/);
    return {
      firstName: parts[0] || '-',
      lastName: parts.slice(1).join(' ') || '-',
    };
  }, [caregiver?.fullName]);

  const genderText = caregiver?.gender ? genderLabel[caregiver.gender] ?? caregiver.gender : '-';
  const ageText = getAge(caregiver?.dateOfBirth);

  const handleApprove = async () => {
    if (!caregiverId) return;

    try {
      await approveKyc({ variables: { caregiverId } });
      setIsApproveOpen(false);
      toast.success('อนุมัติ KYC เรียบร้อยแล้ว');
      await refetch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : 'อนุมัติ KYC ไม่สำเร็จ');
    }
  };

  const handleReject = async (reasons: Array<{ title: string; detail?: string; documentType?: string }>) => {
    if (!caregiverId || reasons.length === 0) return;

    try {
      await rejectKyc({ variables: { caregiverId, reasons } });
      setIsRejectOpen(false);
      toast.success('ปฏิเสธ KYC เรียบร้อยแล้ว');
      await refetch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : 'ปฏิเสธ KYC ไม่สำเร็จ');
    }
  };

  return (
    <div className="bg-[#F9FAFB] text-gray-900" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      <main>
        <section className="mx-auto max-w-[1312px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/kyc')}
                className="inline-flex h-7 items-center rounded-md bg-[#F3F4F6] px-2.5 text-[13px] font-medium leading-4 text-[#374151] hover:bg-gray-200 cursor-pointer"
              >
                ← กลับ
              </button>
              <h2 className="text-base font-medium leading-5 text-[#064E3B]">อนุมัติเอกสาร KYC</h2>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-base font-semibold leading-5 text-[#064E3B]">สถานะปัจจุบัน:</span>
              <StatusBadge
                label={caregiver ? currentStatusMeta.label : '-'}
                badgeClass={currentStatusMeta.badge}
                dotClass={`${currentStatusMeta.dot} h-2.5 w-2.5`}
                className="h-10 rounded-lg px-4 text-[15px]"
              />
            </div>
          </div>
        </section>

        {loading && !data ? (
          <section className="mx-auto grid max-w-[1312px] gap-7 px-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,691px)_minmax(360px,592px)] lg:px-8">
            <Skeleton height={447} borderRadius={12} />
            <Skeleton height={761} borderRadius={12} />
            <Skeleton height={283} borderRadius={12} />
          </section>
        ) : error || !caregiver ? (
          <section className="mx-auto max-w-[1312px] px-4 pb-8 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-red-100 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Icon name="error" variant="outlined" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">โหลดรายละเอียด KYC ไม่สำเร็จ</h2>
              <p className="mt-1 text-sm text-gray-500">{error?.message || 'ไม่พบข้อมูลผู้ดูแล'}</p>
            </div>
          </section>
        ) : (
          <section className="mx-auto grid max-w-[1312px] gap-7 px-4 pb-20 sm:px-6 lg:grid-cols-[minmax(0,691px)_minmax(360px,592px)] lg:px-8">
            <div className="space-y-7">
              <article className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold leading-5 text-[#064E3B]">ข้อมูลส่วนตัว</h3>
                  <span className="inline-flex items-center rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-semibold text-[#047857]">
                    ส่งใหม่ {resubmitCount} ครั้ง
                  </span>
                </div>
                {/*Profile header*/}
                <div className="mt-4 flex items-center gap-4">
                  <Avatar name={caregiver.fullName} size={56} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold leading-6 text-[#111827]">{caregiver.fullName || '-'}</p>
                    <p className="text-[13px] leading-5 text-[#6B7280]">
                      {caregiver.caregiverNumber || caregiver.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                {/*Personal Information*/}
                <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-[#F3F4F6] pt-5 sm:grid-cols-2">
                  <CaregiverField label="ชื่อ" value={nameParts.firstName} />
                  <CaregiverField label="นามสกุล" value={nameParts.lastName} />
                  <CaregiverField label="เลขบัตรประชาชน" value={formatIdCard(caregiver.idCardNumber)} />
                  <CaregiverField label="เพศ" value={genderText} />
                  <CaregiverField
                    label="วันเกิด"
                    value={ageText !== '-' ? `${formatThaiDate(caregiver.dateOfBirth)} (${ageText})` : formatThaiDate(caregiver.dateOfBirth)}
                  />
                  <CaregiverField label="ประสบการณ์" value={`${caregiver.experienceYears ?? 0} ปี`} />
                  <CaregiverField label="อีเมล" value={caregiver.email} />
                  <CaregiverField label="เบอร์โทรศัพท์" value={formatPhone(caregiver.phone)} />
                  {caregiver.address ? (
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-[13px] font-medium leading-5 text-[#9CA3AF]">ที่อยู่</dt>
                      <dd className="mt-1 text-[15px] leading-6 text-[#1F2937]">{caregiver.address}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-5 border-t border-[#F3F4F6] pt-5">
                  <dt className="text-[13px] font-medium leading-5 text-[#9CA3AF]">ทักษะการดูแล</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {caregiver.skills.length > 0 ? (
                      caregiver.skills.map((skill) => (
                        <span key={skill} className="inline-flex items-center rounded-md bg-[#F3F4F6] px-2.5 py-1 text-[13px] text-[#374151]">
                          {skillLabel(skill)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[15px] text-[#1F2937]">-</span>
                    )}
                  </dd>
                </div>

                {caregiver.bio ? (
                  <div className="mt-4">
                    <dt className="text-[13px] font-medium leading-5 text-[#9CA3AF]">ประวัติโดยย่อ</dt>
                    <dd className="mt-1.5 text-[15px] leading-6 text-[#1F2937]">{caregiver.bio}</dd>
                  </div>
                ) : null}
              </article>

              {/*Payout Account (PYG-266)*/}
              <article className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h3 className="text-base font-semibold leading-5 text-[#064E3B]">บัญชีธนาคาร/ข้อมูลรับเงิน</h3>
                {payoutAccount ? (
                  <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <CaregiverField label="ธนาคาร" value={getBankLabel(payoutAccount.bankCode)} />
                    <CaregiverField label="ชื่อบัญชี (เทียบกับชื่อในบัตร)" value={payoutAccount.accountName} />
                    <CaregiverField label="เลขบัญชี" value={`•••• ${payoutAccount.accountNumberLast4}`} />
                    <div className="min-w-0">
                      <dt className="text-[13px] font-medium leading-5 text-[#9CA3AF]">สถานะการยืนยันกับ Omise</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          (RECIPIENT_STATUS_META[payoutAccount.recipientStatus] ?? RECIPIENT_STATUS_META.unverified).className
                        }`}>
                          {(RECIPIENT_STATUS_META[payoutAccount.recipientStatus] ?? RECIPIENT_STATUS_META.unverified).label}
                        </span>
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-3 text-[15px] text-[#9CA3AF]">ยังไม่มีข้อมูลบัญชี</p>
                )}
              </article>

              {/*KYC History*/}
              <KycHistoryCard
                caregiver={caregiver}
                reviews={reviews}
                editHistory={editHistory}
                onlyKycLogs={true}
              />
            </div>
            
            {/*Right Column: Documents Preview + Action Buttons*/}
            <div className="space-y-6 self-start">
              {/* PYG-511: อนุมัติ KYC ไม่อนุมัติรูปโปรไฟล์ให้ — ต้องเทียบหน้าแยกอีกหน้า */}
              {data?.adminKycDetail.pendingProfilePhotoDocumentId ? (
                <div className="flex flex-col gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 text-sm text-[#92400E]">
                    <Icon name="face" />
                    <span>ผู้ดูแลมีรูปโปรไฟล์รออนุมัติ — การอนุมัติ KYC ไม่ได้อนุมัติรูปให้อัตโนมัติ</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/admin/kyc/${caregiver.id}/profile-photo`)}
                    className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#D97706] px-3 text-[13px] font-semibold text-white hover:bg-[#B45309]"
                  >
                    ตรวจรูปโปรไฟล์
                  </button>
                </div>
              ) : null}

              <KycDocumentsPreview documents={documents} docTypeLabel={docTypeLabel} />
              
              {/*Action Buttons*/}
              <div className="flex justify-end">
                <div className="flex w-full gap-3 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsRejectOpen(true)}
                    disabled={!isPending}
                    className="inline-flex h-8 w-full items-center justify-center rounded-lg border-[1.5px] border-[#EF4444] px-4 text-[13px] font-semibold leading-4 text-[#DC2626] hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent sm:w-[114px] cursor-pointer"
                  >
                    ปฏิเสธ
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsApproveOpen(true)}
                    disabled={!isPending}
                    className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-[#059669] px-4 text-[13px] font-semibold leading-4 text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-[142px] cursor-pointer"
                  >
                    อนุมัติ
                  </button>
                </div>
              </div>

              {/*Pending Status*/}
              {!isPending ? (
                <p className="text-right text-sm text-gray-500">
                  เอกสารนี้อยู่ในสถานะ {statusLabel(caregiver.kycStatus)} จึงไม่สามารถอนุมัติหรือปฏิเสธซ้ำได้
                </p>
              ) : null}
            </div>
          </section>
        )}
      </main>

      <ConfirmModal
        isOpen={isApproveOpen}
        isLoading={approving}
        title="ยืนยันอนุมัติ KYC?"
        description={
          <>
            อนุมัติ <strong className="font-bold text-gray-500">{caregiver?.fullName || '-'}</strong> – ผู้ดูแลจะได้รับการแจ้งเตือนทันที
          </>
        }
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApprove}
      />
      <RejectModal
        key={isRejectOpen ? 'reject-open' : 'reject-closed'}
        isOpen={isRejectOpen}
        isLoading={rejecting}
        caregiverName={caregiver?.fullName || ''}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleReject}
      />
      <ToastContainer
        toasts={toast.toasts as (ToastMessage & { id: string })[]}
        onRemove={toast.removeToast}
        position="top-right"
        variant="admin-toast"
      />
    </div>
  );
}
