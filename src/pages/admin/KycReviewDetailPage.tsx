import { useEffect, useMemo, useState } from 'react';
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

interface CaregiverEditLog {
  id: string;
  action: string;
  editorName?: string | null;
  createdAt: string;
  fieldChanges?: Array<{ field: string; oldValue?: string; newValue?: string }> | null;
}

interface AdminKycDetailResponse {
  adminKycDetail: {
    caregiver: CaregiverDetail;
    documents: KycDocument[];
    resubmitCount: number;
    reviews: KycReview[];
    editHistory: CaregiverEditLog[];
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
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  error?: boolean;
}) {
  return (
    <div className="relative shrink-0 flex items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pl-2 pr-5 w-[93px] h-[22px] border rounded-[6px] bg-white cursor-pointer select-none text-[11px] font-semibold outline-none truncate ${
          error ? 'border-red-500 text-red-500' : 'border-[#6B7280] text-[#6B7280]'
        }`}
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <option value="" disabled hidden>เลือกเอกสาร</option>
        {options.map((option) => (
          <option key={option} value={option} className="text-xs font-medium text-gray-700 bg-white">
            {option}
          </option>
        ))}
      </select>
      <div className="absolute right-[4px] pointer-events-none text-[#757575] flex items-center h-full">
        <Icon name="expand_more" size="small" />
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
  const allHaveDocType = activeReasons.every((row) => row.documentType !== '');
  const allHaveDetail = activeReasons.every((row) => row.detail.trim() !== '');
  const isValid = hasActiveReasons && combinedReasonLength >= 10 && allHaveDocType && allHaveDetail;
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
                        className={`w-full text-[14px] font-normal leading-[14px] text-[#1F2937] bg-transparent border-none outline-none py-0 ${row.detail.trim() === '' ? 'placeholder-red-400' : 'placeholder-[#9CA3AF]'}`}
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
                        className={`w-full text-[14px] font-normal leading-[14px] text-[#1F2937] bg-transparent border-none outline-none py-0 ${row.detail.trim() === '' ? 'placeholder-red-400' : 'placeholder-[#9CA3AF]'}`}
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
                  error={row.documentType === ''}
                />

                {/* Remove Button (X) */}
                <button
                  type="button"
                  onClick={() => handleRemoveRow(row.id)}
                  className="w-[26px] h-[26px] shrink-0 flex items-center justify-center text-[#6B7280] hover:text-[#EF4444] transition-colors cursor-pointer"
                >
                  <Icon name="close" size="small" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Area (Counter & Buttons) */}
        <div className="flex flex-col w-full gap-2 mt-2">
          {/* Validation Messages */}
          <div className="flex flex-col gap-0.5 min-h-[16px]">
            {hasActiveReasons && combinedReasonLength < 10 && (
              <span className="text-xs text-red-500 font-medium">
                ต้องมีอย่างน้อย 10 ตัวอักษร (ปัจจุบันมี {combinedReasonLength} ตัวอักษร)
              </span>
            )}
            {hasActiveReasons && !allHaveDocType && (
              <span className="text-xs text-red-500 font-medium">
                กรุณาเลือกประเภทเอกสารให้ครบทุกเหตุผล
              </span>
            )}
            {hasActiveReasons && !allHaveDetail && (
              <span className="text-xs text-red-500 font-medium">
                กรุณาระบุรายละเอียดให้ครบทุกเหตุผล
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
                {/*Avatar*/}
                <div className="mt-4 flex items-center gap-4">
                  <Avatar name={caregiver.fullName} size={56} className="shrink-0" />
                  <div>
                    <p className="text-[13px] leading-4 text-[#6B7280]">หมายเลขประจำตัวผู้ดูแล</p>
                    <p className="mt-1 text-lg font-bold leading-[22px] text-[#111827]">
                      {caregiver.caregiverNumber || caregiver.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
                {/*Personal Information*/}
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
