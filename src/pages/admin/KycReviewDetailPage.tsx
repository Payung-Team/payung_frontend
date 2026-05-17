import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { ADMIN_KYC_DETAIL, APPROVE_KYC, REJECT_KYC } from '../../graphql/queries';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast, type ToastMessage } from '../../hooks/useToast';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import ImageModal from '../../components/ui/ImageModal';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmModal from '../../components/ui/ConfirmModal';

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
  fileUrl: string;
  fileSize: number;
  mimeType: string;
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

interface AdminKycDetailResponse {
  adminKycDetail: {
    caregiver: CaregiverDetail;
    documents: KycDocument[];
    resubmitCount: number;
    reviews: KycReview[];
  };
}


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

function formatThaiDateTime(value?: string | null) {
  return formatThaiDate(value, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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


function isPdf(doc?: KycDocument | null) {
  return doc?.mimeType === 'application/pdf' || doc?.fileName.toLowerCase().endsWith('.pdf');
}

function isImage(doc?: KycDocument | null) {
  return Boolean(doc?.mimeType?.startsWith('image/'));
}

function getDocumentUrl(doc?: KycDocument | null) {
  return doc?.signedUrl || doc?.fileUrl || '';
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
  title: string;
  isCustom: boolean;
  detail: string;
  documentType: string;
  isChecked: boolean;
  selectedAt?: number;
}

const DOC_OPTIONS = ['บัตรประชาชน', 'รูปถ่ายคู่บัตรประชาชน', 'ใบรับรองอบรม', 'ข้อมูลส่วนตัว'];

function Dropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
}) {
  return (
    <div className="relative shrink-0 flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pl-2 pr-5 w-[93px] h-[22px] border border-[#6B7280] rounded-[6px] bg-white cursor-pointer select-none text-[11px] font-semibold text-[#6B7280] outline-none truncate"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <option value="" disabled hidden>เลือกเอกสาร</option>
        {options.map((option) => (
          <option key={option} value={option} className="text-xs font-medium text-gray-700 bg-white">
            {option}
          </option>
        ))}
      </select>
      <div className="absolute right-[6px] top-[7px] pointer-events-none text-[#757575]">
        <svg width="9" height="9" viewBox="0 0 11 11" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.5 4.5L5.5 7.5L8.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

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
  const [rows, setRows] = useState<RejectReasonRow[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRows([
        {
          id: 'unclear',
          title: 'เอกสารไม่ชัดเจน',
          isCustom: false,
          detail: '',
          documentType: '',
          isChecked: false,
        },
        {
          id: 'mismatch',
          title: 'ข้อมูลไม่ตรงกัน',
          isCustom: false,
          detail: '',
          documentType: '',
          isChecked: false,
        },
        {
          id: 'expired',
          title: 'เอกสารหมดอายุ',
          isCustom: false,
          detail: '',
          documentType: '',
          isChecked: false,
        },
      ]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddRow = () => {
    const newId = `custom-${Date.now()}`;
    setRows((prev) => [
      ...prev,
      {
        id: newId,
        title: '',
        isCustom: true,
        detail: '',
        documentType: '',
        isChecked: true,
        selectedAt: Date.now(),
      },
    ]);
  };

  const handleToggleRow = (id: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              isChecked: !row.isChecked,
              selectedAt: !row.isChecked ? Date.now() : undefined,
            }
          : row
      )
    );
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (row?.isCustom) {
        return prev.filter((r) => r.id !== id);
      }
      return prev.map((r) => (r.id === id ? { ...r, isChecked: false } : r));
    });
  };

  const handleTitleChange = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const isChecking = value.trim() !== '' && !row.isChecked;
          return {
            ...row,
            title: value,
            isChecked: value.trim() !== '' ? true : row.isChecked,
            selectedAt: isChecking ? Date.now() : row.selectedAt,
          };
        }
        return row;
      })
    );
  };

  const handleDetailChange = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const isChecking = value.trim() !== '' && !row.isChecked;
          return {
            ...row,
            detail: value,
            isChecked: value.trim() !== '' ? true : row.isChecked,
            selectedAt: isChecking ? Date.now() : row.selectedAt,
          };
        }
        return row;
      })
    );
  };

  const handleDocTypeChange = (id: string, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const isChecking = !row.isChecked;
          return {
            ...row,
            documentType: value,
            isChecked: true,
            selectedAt: isChecking ? Date.now() : row.selectedAt,
          };
        }
        return row;
      })
    );
  };

  const activeReasons = rows
    .filter((row) => row.isChecked)
    .sort((a, b) => (a.selectedAt || 0) - (b.selectedAt || 0));
  const hasActiveReasons = activeReasons.length > 0;

  const combinedReasonString = activeReasons
    .map((row) => {
      const titleStr = row.title.trim() || (row.isCustom ? 'เหตุผลอื่นๆ' : '');
      const detailStr = row.detail.trim() ? `: ${row.detail.trim()}` : '';
      const docStr = row.documentType ? ` (${row.documentType})` : '';
      return `${titleStr}${detailStr}${docStr}`;
    })
    .filter((str) => str.length > 0)
    .join('\n');

  const combinedReasonLength = combinedReasonString.length;
  const isValid = hasActiveReasons && combinedReasonLength >= 10;
  const showPlusButton = rows.every((row) => !row.isCustom || row.title.trim() !== '');

  const handleConfirmClick = () => {
    if (isValid) {
      const payload = activeReasons.map((row) => {
        const titleStr = row.title.trim() || (row.isCustom ? 'เหตุผลอื่นๆ' : '');
        return {
          title: titleStr,
          ...(row.detail.trim() ? { detail: row.detail.trim() } : {}),
          ...(row.documentType ? { documentType: row.documentType } : {}),
        };
      });
      onConfirm(payload);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="fixed inset-0 -z-10" onClick={onClose} />

      <div className="w-[600px] max-w-[90vw] bg-white rounded-xl shadow-2xl flex flex-col p-8 gap-5 select-none" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {/* Header */}
        <div className="flex flex-col gap-1 w-full">
          <h2 className="text-[20px] font-semibold leading-[25px] text-[#A32D2D] text-left">
            ปฏิเสธ KYC - {caregiverName}
          </h2>
          <p className="text-[16px] font-normal leading-[24px] text-[#717182] text-left">
            กรุณาระบุเหตุผลที่ปฏิเสธ
          </p>
        </div>

        {/* Tags Selection */}
        <div className="w-full flex items-center flex-wrap gap-[10px]">
          {rows.filter(r => !r.isCustom).map((row) => (
            <button
              key={`tag-${row.id}`}
              type="button"
              onClick={() => handleToggleRow(row.id)}
              className={`h-[30px] px-[16px] flex items-center justify-center rounded-full border text-[14px] font-medium transition-all cursor-pointer ${
                row.isChecked
                  ? 'bg-[#A32D2D] border-[#A32D2D] text-white'
                  : 'bg-white border-[#A32D2D] text-[#A32D2D] hover:bg-red-50'
              }`}
            >
              {row.title}
            </button>
          ))}
          {/* + Button Tag */}
          {showPlusButton && (
            <button
              type="button"
              onClick={handleAddRow}
              className="h-[30px] px-[14px] flex items-center justify-center rounded-full border border-[#A32D2D] bg-white text-[#A32D2D] hover:bg-red-50 transition-all text-[16px] leading-none cursor-pointer"
            >
              +
            </button>
          )}
        </div>

        {/* Frame 11 - Reasons List */}
        {hasActiveReasons && (
          <div className="w-full max-h-[40vh] overflow-x-hidden overflow-y-auto pr-1 flex flex-col gap-[13px]">
            {activeReasons.map((row) => (
              <div
                key={row.id}
                className="w-full h-[51px] shrink-0 bg-[#F9FAFB] rounded-lg pl-[14px] pr-[14px] flex items-center gap-[7px]"
              >
                {row.isCustom ? (
                  <div className="flex items-center gap-[6px] flex-1 h-[20px]">
                    {/* Custom Title Input */}
                    <div className="w-[98px] h-[19px] ] rounded px-1 flex items-center">
                      <input
                        type="text"
                        value={row.title}
                        onChange={(e) => handleTitleChange(row.id, e.target.value)}
                        placeholder="หัวข้อ"
                        className="w-full text-[16px] font-medium leading-[20px] text-[#1F2937] placeholder-[#9CA3AF] bg-transparent border-none outline-none py-0"
                        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                      />
                    </div>
                    {/* Separator */}
                    <span className="text-[16px] font-medium text-[#1F2937] leading-[19px] shrink-0">-</span>
                    {/* Custom Detail Input */}
                    <div className="flex-1 h-[19px] ] rounded px-2 flex items-center">
                      <input
                        type="text"
                        value={row.detail}
                        onChange={(e) => handleDetailChange(row.id, e.target.value)}
                        placeholder="โปรดระบุรายละเอียด"
                        className="w-full text-[14px] font-normal leading-[14px] text-[#1F2937] placeholder-[#9CA3AF] bg-transparent border-none outline-none py-0"
                        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-[6px] flex-1 h-[20px]">
                    {/* Default Title */}
                    <span className="text-[16px] font-medium text-[#1F2937] leading-[20px] whitespace-nowrap shrink-0">
                      {row.title} -
                    </span>
                    {/* Default Detail Input */}
                    <div className="flex-1 h-[19px] ] rounded px-2 flex items-center">
                      <input
                        type="text"
                        value={row.detail}
                        onChange={(e) => handleDetailChange(row.id, e.target.value)}
                        placeholder="โปรดระบุรายละเอียด"
                        className="w-full text-[14px] font-normal leading-[14px] text-[#1F2937] placeholder-[#9CA3AF] bg-transparent border-none outline-none py-0"
                        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                      />
                    </div>
                  </div>
                )}

                {/* Dropdown */}
                <Dropdown
                  value={row.documentType}
                  onChange={(val) => handleDocTypeChange(row.id, val)}
                  options={DOC_OPTIONS}
                />

                {/* Remove Button (X) */}
                <button
                  type="button"
                  onClick={() => handleRemoveRow(row.id)}
                  className="w-[26px] h-[26px] shrink-0 flex items-center justify-center text-[#6B7280] hover:text-[#EF4444] transition-colors cursor-pointer"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 1L1 13M1 1L13 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Area (Counter & Buttons) */}
        <div className="flex flex-col w-full gap-2 mt-2">
          {/* Character Count Instruction */}
          <div className="h-[16px] flex items-center">
            {!isValid && hasActiveReasons && (
              <span className="text-xs text-red-500 font-medium">
                ต้องมีอย่างน้อย 10 ตัวอักษร (ปัจจุบันมี {combinedReasonLength} ตัวอักษร)
              </span>
            )}
          </div>

          {/* Action Buttons Container */}
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-[115px] h-[35px] flex items-center justify-center rounded border border-[#000000]/10 bg-white hover:bg-gray-50 text-[14px] font-medium text-[#0A0A0A] active:scale-95 transition-all cursor-pointer"
              style={{ border: '0.8px solid rgba(0, 0, 0, 0.1)' }}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={isLoading || !isValid}
              className="w-[143px] h-[35px] flex items-center justify-center rounded bg-[#DC2626] hover:bg-[#B91C1C] text-[14px] font-medium text-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const { data, loading, error, refetch } = useQuery<AdminKycDetailResponse>(ADMIN_KYC_DETAIL, {
    variables: { caregiverId },
    skip: !caregiverId,
    fetchPolicy: 'cache-and-network',
  });

  const caregiver = data?.adminKycDetail.caregiver;
  const documents = data?.adminKycDetail.documents ?? [];
  const reviews = data?.adminKycDetail.reviews ?? [];
  const resubmitCount = data?.adminKycDetail.resubmitCount ?? caregiver?.resubmitCount ?? 0;
  const selectedDoc = documents.find((doc) => doc.id === selectedDocId) ?? documents[0] ?? null;
  const documentUrl = getDocumentUrl(selectedDoc);
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

  const personalFields = useMemo(
    () => [
      { label: 'ชื่อ', value: nameParts.firstName },
      { label: 'นามสกุล', value: nameParts.lastName },
      { label: 'เลขบัตรประชาชน', value: caregiver?.idCardNumber },
      { label: 'เพศ', value: caregiver?.gender || '-' },
      { label: 'วันเกิด', value: formatThaiDate(caregiver?.dateOfBirth) },
      { label: 'อายุ', value: getAge(caregiver?.dateOfBirth) },
      { label: 'อีเมล', value: caregiver?.email },
      { label: 'เบอร์โทรศัพท์', value: caregiver?.phone },
      { label: 'ประสบการณ์', value: `${caregiver?.experienceYears ?? 0} ปี` },
      { label: 'ค่าบริการต่อชั่วโมง', value: `${caregiver?.hourlyRate ?? 0} บาท` },
    ],
    [nameParts, caregiver],
  );

  const handleApprove = async () => {
    if (!caregiverId) return;

    try {
      await approveKyc({ variables: { caregiverId } });
      setIsApproveOpen(false);
      toast.success('อนุมัติ KYC สำเร็จ');
      await refetch();
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : 'อนุมัติ KYC ไม่สำเร็จ');
    }
  };

  const handleReject = async (reasons: Array<{ title: string; detail?: string; documentType?: string }>) => {
    if (!caregiverId || reasons.length === 0) return;

    try {
      await rejectKyc({ variables: { caregiverId, reasons } });
      setIsRejectOpen(false);
      toast.success('ปฏิเสธ KYC สำเร็จ');
      await refetch();
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : 'ปฏิเสธ KYC ไม่สำเร็จ');
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      <header className="border-b border-[#E5E7EB] bg-white px-4 py-3 md:ml-16 md:px-8">
        <div className="flex h-10 items-center justify-between">
          <div>
            <h1 className="text-xl font-bold leading-6 text-[#064E3B]" style={{ fontFamily: "'Inter', sans-serif" }}>
              ตรวจสอบเอกสาร KYC
            </h1>
            <p className="mt-0.5 text-xs leading-[15px] text-[#6B7280]">ตรวจสอบและจัดการเอกสาร KYC ของผู้ดูแล</p>
          </div>
        </div>
      </header>

      <main className="md:ml-16">
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

                <div className="mt-4 flex items-center gap-4">
                  <Avatar name={caregiver.fullName} size={56} className="shrink-0" />
                  <div>
                    <p className="text-[13px] leading-4 text-[#6B7280]">หมายเลขประจำตัวผู้ดูแล</p>
                    <p className="mt-1 text-lg font-bold leading-[22px] text-[#111827]">
                      {caregiver.caregiverNumber || caregiver.id.slice(0, 8)}
                    </p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {personalFields.map((field) => (
                    <CaregiverField key={field.label} label={field.label} value={field.value} />
                  ))}
                </dl>

                <div className="mt-4">
                  <dt className="text-[13px] font-medium leading-5 text-[#9CA3AF]">ทักษะการดูแล</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {caregiver.skills.length > 0 ? (
                      caregiver.skills.map((skill) => (
                        <span key={skill} className="inline-flex h-[22px] items-center rounded-lg bg-[#88D2BD] px-3 text-xs font-medium text-[#030213]">
                          {skill}
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

              <article className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h3 className="text-base font-semibold leading-5 text-[#064E3B]">ประวัติการดำเนินการ</h3>
                <div className="mt-4">
                  {reviews.length > 0 ? (
                    <>
                      {reviews.map((review) => {
                      const isRejected = review.action === 'rejected';
                      return (
                        <div key={review.id} className="flex gap-3 border-b border-[#F3F4F6] py-2.5 last:border-b-0">
                          <span className={`mt-0.5 h-6 w-6 shrink-0 rounded-full ${isRejected ? 'bg-[#EF4444]' : 'bg-[#059669]'}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium leading-4 text-[#1F2937]">
                              {isRejected ? 'ปฏิเสธเอกสาร KYC' : 'อนุมัติเอกสาร KYC'}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-[#6B7280]">เหตุผล: {review.reason || '-'}</p>
                            <p className="mt-0.5 text-[11px] leading-[14px] text-[#9CA3AF]">โดย {review.reviewedBy}</p>
                          </div>
                          <time className="shrink-0 text-[10px] leading-3 text-[#9CA3AF]">{formatThaiDateTime(review.reviewedAt)}</time>
                        </div>
                      );
                      })}
                      <div className="flex gap-3 border-b border-[#F3F4F6] py-2.5 last:border-b-0">
                        <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-[#F59E0B]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium leading-4 text-[#1F2937]">ส่งเอกสาร KYC</p>
                          <p className="mt-1 text-xs leading-5 text-[#6B7280]">เหตุผล: -</p>
                          <p className="mt-0.5 text-[11px] leading-[14px] text-[#9CA3AF]">โดย {caregiver.fullName}</p>
                        </div>
                        <time className="shrink-0 text-[10px] leading-3 text-[#9CA3AF]">{formatThaiDateTime(caregiver.kycSubmittedAt)}</time>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-3 border-b border-[#F3F4F6] py-2.5">
                      <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-[#F59E0B]" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-4 text-[#1F2937]">ส่งเอกสาร KYC</p>
                        <p className="mt-0.5 text-[11px] leading-[14px] text-[#9CA3AF]">โดย {caregiver.fullName}</p>
                      </div>
                      <time className="shrink-0 text-[10px] leading-3 text-[#9CA3AF]">{formatThaiDateTime(caregiver.kycSubmittedAt)}</time>
                    </div>
                  )}
                </div>
              </article>
            </div>

            <aside className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="relative flex min-h-[433px] items-center justify-center overflow-hidden rounded-xl bg-[#959698]">
                {selectedDoc && documentUrl ? (
                  isPdf(selectedDoc) ? (
                    <iframe title={selectedDoc.fileName} src={documentUrl} className="h-[433px] w-full rounded-xl bg-white" />
                  ) : isImage(selectedDoc) ? (
                    <>
                      <img src={documentUrl} alt={selectedDoc.fileName} className="h-[433px] w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setIsImageModalOpen(true)}
                        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
                      >
                        <Icon name="open_in_full" />
                      </button>
                    </>
                  ) : (
                    <a href={documentUrl} target="_blank" rel="noreferrer" className="text-base font-semibold text-[#F5FFFC] underline cursor-pointer">
                      เปิดเอกสาร
                    </a>
                  )
                ) : (
                  <span className="text-base font-semibold text-[#F5FFFC]">ตัวอย่างเอกสาร</span>
                )}
              </div>

              <h3 className="mt-6 text-base font-bold leading-5 text-[#064E3B]">เอกสารที่อัปโหลด</h3>

              <div className="mt-4 space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F9FAFB] p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-[#EFF6FF]" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-5 text-[#1F2937]">
                          {docTypeLabel[doc.docType] ?? doc.docType}
                        </p>
                        <p className="truncate text-xs leading-4 text-[#9CA3AF]">
                          {isPdf(doc) ? 'PDF' : doc.mimeType.split('/')[1]?.toUpperCase() || 'IMAGE'} · {formatFileSize(doc.fileSize)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedDocId(doc.id)}
                      className="shrink-0 rounded-full border border-[#059669] px-3.5 py-1 text-xs font-semibold text-[#059669] hover:bg-[#ECFDF5] transition-colors cursor-pointer"
                    >
                      ดูเอกสาร
                    </button>
                  </div>
                ))}
                {documents.length === 0 ? <p className="rounded-lg bg-[#F9FAFB] px-4 py-6 text-center text-sm text-gray-500">ยังไม่มีเอกสารที่อัปโหลด</p> : null}
              </div>
            </aside>

            <div className="lg:col-span-2 lg:flex lg:justify-end">
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

            {!isPending ? (
              <p className="text-right text-sm text-gray-500 lg:col-span-2">
                เอกสารนี้อยู่ในสถานะ {statusLabel(caregiver.kycStatus)} จึงไม่สามารถอนุมัติหรือปฏิเสธซ้ำได้
              </p>
            ) : null}
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
        isOpen={isRejectOpen}
        isLoading={rejecting}
        caregiverName={caregiver?.fullName || ''}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleReject}
      />
      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={documentUrl}
        title={selectedDoc ? (docTypeLabel[selectedDoc.docType] ?? selectedDoc.docType) : 'Preview'}
      />
      <ToastContainer toasts={toast.toasts as (ToastMessage & { id: string })[]} onRemove={toast.removeToast} />
    </div>
  );
}
