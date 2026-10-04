/**
 * ProfilePhotoReviewPage — แอดมินเทียบรูปโปรไฟล์ผู้ดูแลกับบัตรประชาชน (PYG-511 / การ์ดแม่ PYG-488)
 *
 * - รูปโปรไฟล์ที่รออนุมัติ กับรูปบัตรประชาชน วางข้างกันขนาดเท่ากัน กดเพื่อดูภาพใหญ่ได้
 * - ถ้ามีรูปที่อนุมัติไว้เดิม แสดงเป็นใบเล็กใบที่สาม — ไว้เทียบว่าเปลี่ยนเป็นคนเดิมไหม
 * - อนุมัติ / ปฏิเสธ (ปฏิเสธต้องมีเหตุผล: เลือกสำเร็จรูปได้ + พิมพ์เองได้)
 * - ประวัติการรีวิวรูปจาก kyc_reviews
 */
import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  ADMIN_PROFILE_PHOTO_REVIEW,
  APPROVE_PROFILE_PHOTO,
  REJECT_PROFILE_PHOTO,
} from '../../graphql/queries';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast, type ToastMessage } from '../../hooks/useToast';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import ConfirmModal from '../../components/ui/ConfirmModal';
import ImageModal from '../../components/ui/ImageModal';

interface IdCardDocument {
  id: string;
  docType: string;
  fileName: string;
  mimeType: string;
  signedUrl?: string | null;
  uploadedAt: string;
}

interface ProfilePhotoReview {
  id: string;
  action: string;
  reason?: string | null;
  reviewerName?: string | null;
  reviewedAt: string;
  documentId?: string | null;
}

interface AdminProfilePhotoReviewResponse {
  adminProfilePhotoReview: {
    caregiver: {
      id: string;
      caregiverNumber?: string | null;
      fullName: string;
      email?: string | null;
      idCardNumber: string;
      kycStatus: string;
    };
    pendingPhoto?: {
      documentId: string;
      reviewStatus: string;
      signedUrl?: string | null;
      uploadedAt: string;
    } | null;
    approvedPhotoUrl?: string | null;
    idCardDocuments: IdCardDocument[];
    reviews: ProfilePhotoReview[];
  };
}

/** เหตุผลสำเร็จรูปตามการ์ด PYG-511 */
const REJECT_PRESETS = ['ใบหน้าไม่ชัด', 'ไม่ตรงกับบัตร', 'ไม่ใช่รูปถ่ายจริง'];
const REJECT_REASON_MAX = 500;

const ID_CARD_LABEL: Record<string, string> = {
  id_card_front: 'บัตรประชาชน (ด้านหน้า)',
  id_card_selfie: 'รูปถ่ายคู่บัตรประชาชน',
  id_card: 'บัตรประชาชน',
};

/** บัตรด้านหน้าขึ้นก่อน — เป็นใบที่ใช้เทียบใบหน้าหลัก */
const ID_CARD_ORDER = ['id_card_front', 'id_card', 'id_card_selfie'];

const KYC_STATUS_LABEL: Record<string, string> = {
  pending: 'KYC รอตรวจสอบ',
  verified: 'KYC อนุมัติแล้ว',
  rejected: 'KYC ถูกปฏิเสธ',
  none: 'ยังไม่ส่ง KYC',
};

const REVIEW_ACTION_META: Record<string, { label: string; dot: string }> = {
  profile_photo_approved: { label: 'อนุมัติรูปโปรไฟล์', dot: 'bg-[#059669]' },
  profile_photo_rejected: { label: 'ปฏิเสธรูปโปรไฟล์', dot: 'bg-[#EF4444]' },
};

function formatThaiDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** 1509966392215 → 1-5099-66392-21-5 (รูปแบบเดียวกับบนบัตร) */
function formatIdCard(value?: string | null) {
  if (!value) return '-';
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 13) return value;
  return `${digits[0]}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits[12]}`;
}

function PhotoFrame({
  title,
  imageUrl,
  emptyText,
  caption,
  onZoom,
  headerExtra,
}: {
  title: string;
  imageUrl?: string | null;
  emptyText: string;
  caption?: ReactNode;
  onZoom: () => void;
  headerExtra?: ReactNode;
}) {
  return (
    <figure className="flex min-w-0 flex-col rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex min-h-[28px] items-center justify-between gap-2">
        <h3 className="text-base font-semibold leading-5 text-[#064E3B]">{title}</h3>
        {headerExtra}
      </div>
      {/* ความสูงคงที่เท่ากันทั้งสองฝั่ง — เดิมเป็น aspect 3:4 เต็มคอลัมน์ รูปสูงเกือบ 1,000px ต้องเลื่อนดู */}
      <div className="relative h-[320px] w-full overflow-hidden rounded-lg bg-[#1F2937] sm:h-[380px]">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={title} className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={onZoom}
              aria-label={`ขยาย${title}`}
              className="absolute right-3 top-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <Icon name="zoom_in" />
            </button>
          </>
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-gray-300">
            {emptyText}
          </div>
        )}
      </div>
      {caption ? <figcaption className="mt-3 text-sm leading-5 text-[#374151]">{caption}</figcaption> : null}
    </figure>
  );
}

/** mount เฉพาะตอนเปิด — ปิดแล้วเปิดใหม่ได้ฟอร์มว่างเสมอโดยไม่ต้อง reset state เอง */
function RejectPhotoModal({
  isLoading,
  caregiverName,
  onClose,
  onConfirm,
}: {
  isLoading: boolean;
  caregiverName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const reason = [...selected, note.trim()].filter(Boolean).join(' · ');
  const isTooLong = reason.length > REJECT_REASON_MAX;
  const isValid = reason.length > 0 && !isTooLong;

  const togglePreset = (preset: string) => {
    setSelected((prev) =>
      prev.includes(preset) ? prev.filter((p) => p !== preset) : [...prev, preset],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="fixed inset-0 -z-10" onClick={isLoading ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-photo-title"
        className="flex w-[560px] max-w-[92vw] flex-col gap-5 rounded-xl bg-white p-7 shadow-2xl"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <div className="flex flex-col gap-1">
          <h2 id="reject-photo-title" className="text-[20px] font-semibold leading-[25px] text-[#A32D2D]">
            ปฏิเสธรูปโปรไฟล์ - {caregiverName}
          </h2>
          <p className="text-[15px] leading-6 text-[#717182]">
            เหตุผลจะถูกส่งให้ผู้ดูแลเพื่ออัปโหลดรูปใหม่ · รูปที่อนุมัติไว้เดิม (ถ้ามี) ยังแสดงต่อไป
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {REJECT_PRESETS.map((preset) => {
            const isActive = selected.includes(preset);
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={isActive}
                onClick={() => togglePreset(preset)}
                className={`flex h-[30px] cursor-pointer items-center rounded-full border px-4 text-[14px] font-medium transition-all ${
                  isActive
                    ? 'border-[#A32D2D] bg-[#A32D2D] text-white'
                    : 'border-[#A32D2D] bg-white text-[#A32D2D] hover:bg-red-50'
                }`}
              >
                {preset}
              </button>
            );
          })}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[#374151]">รายละเอียดเพิ่มเติม / เหตุผลอื่น</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="เช่น ใส่แว่นกันแดด มองไม่เห็นใบหน้า"
            className="resize-none rounded-lg border border-[#D1D5DB] px-3 py-2 text-[14px] text-[#1F2937] outline-none focus:border-[#A32D2D]"
          />
        </label>

        <div className="flex min-h-[16px] flex-col gap-0.5">
          {!reason ? (
            <span className="text-xs font-medium text-red-500">เลือกเหตุผลหรือพิมพ์เหตุผลอย่างน้อย 1 ข้อ</span>
          ) : null}
          {isTooLong ? (
            <span className="text-xs font-medium text-red-500">
              เหตุผลยาวเกิน {REJECT_REASON_MAX} ตัวอักษร (ปัจจุบัน {reason.length})
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex h-[35px] w-[115px] cursor-pointer items-center justify-center rounded bg-white text-[14px] font-medium text-[#0A0A0A] transition-all hover:bg-gray-50 active:scale-95"
            style={{ border: '0.8px solid rgba(0, 0, 0, 0.1)' }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => isValid && onConfirm(reason)}
            disabled={isLoading || !isValid}
            className="flex h-[35px] w-[143px] cursor-pointer items-center justify-center rounded bg-[#DC2626] text-[14px] font-medium text-white shadow-[0px_4px_4px_rgba(0,0,0,0.25)] transition-all hover:bg-[#B91C1C] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'กำลังบันทึก...' : 'ยืนยันการปฏิเสธ'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePhotoReviewPage() {
  const { caregiverId } = useParams<{ caregiverId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedIdCardId, setSelectedIdCardId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<{ url: string; title: string } | null>(null);

  const { data, loading, error, refetch } = useQuery<AdminProfilePhotoReviewResponse>(
    ADMIN_PROFILE_PHOTO_REVIEW,
    {
      variables: { caregiverId },
      skip: !caregiverId,
      // signed URL อายุ 1 ชม. / 15 นาที — ดึงใหม่ทุกครั้งที่เปิดหน้า
      fetchPolicy: 'network-only',
    },
  );

  const [approvePhoto, { loading: approving }] = useMutation(APPROVE_PROFILE_PHOTO);
  const [rejectPhoto, { loading: rejecting }] = useMutation(REJECT_PROFILE_PHOTO);

  const detail = data?.adminProfilePhotoReview;
  const caregiver = detail?.caregiver;
  const pendingPhoto = detail?.pendingPhoto ?? null;
  const reviews = detail?.reviews ?? [];
  const idCards = [...(detail?.idCardDocuments ?? [])].sort(
    (a, b) => ID_CARD_ORDER.indexOf(a.docType) - ID_CARD_ORDER.indexOf(b.docType),
  );
  const selectedIdCard = idCards.find((doc) => doc.id === selectedIdCardId) ?? idCards[0] ?? null;
  const idCardTitle = selectedIdCard ? ID_CARD_LABEL[selectedIdCard.docType] ?? 'บัตรประชาชน' : 'บัตรประชาชน';

  const handleApprove = async () => {
    if (!pendingPhoto) return;
    try {
      await approvePhoto({ variables: { documentId: pendingPhoto.documentId } });
      setIsApproveOpen(false);
      toast.success('อนุมัติรูปโปรไฟล์เรียบร้อยแล้ว');
      await refetch();
    } catch (mutationError) {
      setIsApproveOpen(false);
      toast.error(mutationError instanceof Error ? mutationError.message : 'อนุมัติรูปไม่สำเร็จ');
      await refetch();
    }
  };

  const handleReject = async (reason: string) => {
    if (!pendingPhoto) return;
    try {
      await rejectPhoto({ variables: { documentId: pendingPhoto.documentId, reason } });
      setIsRejectOpen(false);
      toast.success('ปฏิเสธรูปโปรไฟล์เรียบร้อยแล้ว');
      await refetch();
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : 'ปฏิเสธรูปไม่สำเร็จ');
    }
  };

  return (
    <div className="bg-[#F9FAFB] text-gray-900" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      <main>
        <section className="mx-auto max-w-[1312px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/kyc?tab=profile_photo')}
                className="inline-flex h-7 cursor-pointer items-center rounded-md bg-[#F3F4F6] px-2.5 text-[13px] font-medium leading-4 text-[#374151] hover:bg-gray-200"
              >
                ← กลับ
              </button>
              <h2 className="text-base font-medium leading-5 text-[#064E3B]">ตรวจสอบรูปโปรไฟล์ผู้ดูแล</h2>
            </div>
            {caregiver ? (
              <button
                type="button"
                onClick={() => navigate(`/admin/kyc/${caregiver.id}`)}
                className="inline-flex h-8 cursor-pointer items-center gap-1 self-start rounded-lg border border-[#059669] px-3 text-[13px] font-semibold text-[#059669] hover:bg-[#ECFDF5] lg:self-auto"
              >
                <Icon name="fact_check" size="small" />
                ดูข้อมูล KYC
              </button>
            ) : null}
          </div>
        </section>

        {loading && !data ? (
          <section className="mx-auto grid max-w-[1312px] gap-6 px-4 pb-8 sm:px-6 md:grid-cols-2 lg:px-8">
            <Skeleton height={520} borderRadius={12} />
            <Skeleton height={520} borderRadius={12} />
          </section>
        ) : error || !caregiver ? (
          <section className="mx-auto max-w-[1312px] px-4 pb-8 sm:px-6 lg:px-8">
            <div className="rounded-xl border border-red-100 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Icon name="error" variant="outlined" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">โหลดข้อมูลรูปโปรไฟล์ไม่สำเร็จ</h2>
              <p className="mt-1 text-sm text-gray-500">{error?.message || 'ไม่พบข้อมูลผู้ดูแล'}</p>
            </div>
          </section>
        ) : (
          <section className="mx-auto max-w-[1312px] space-y-6 px-4 pb-20 sm:px-6 lg:px-8">
            {/* ชื่อตามบัตร — ใช้เทียบกับทั้งสองรูป */}
            <div className="flex flex-col gap-1 rounded-xl border border-[#E5E7EB] bg-white px-6 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[#9CA3AF]">ชื่อตามบัตรประชาชน</p>
                <p className="truncate text-lg font-semibold text-[#111827]">{caregiver.fullName || '-'}</p>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-[#4B5563]">
                <span>เลขบัตร {formatIdCard(caregiver.idCardNumber)}</span>
                <span>{caregiver.caregiverNumber || caregiver.id.slice(0, 8)}</span>
                <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-semibold text-[#374151]">
                  {KYC_STATUS_LABEL[caregiver.kycStatus] ?? caregiver.kycStatus}
                </span>
              </div>
            </div>

            {!pendingPhoto ? (
              <div className="flex items-center gap-3 rounded-xl border border-[#D1FAE5] bg-[#ECFDF5] px-5 py-4 text-sm text-[#065F46]">
                <Icon name="task_alt" />
                ผู้ดูแลคนนี้ไม่มีรูปโปรไฟล์ที่รออนุมัติ
              </div>
            ) : null}

            {/* เทียบใบหน้า: รูปที่รออนุมัติ | บัตรประชาชน — ขนาดเท่ากัน */}
            <div className="grid gap-6 md:grid-cols-2">
              <PhotoFrame
                title="รูปโปรไฟล์ (รออนุมัติ)"
                imageUrl={pendingPhoto?.signedUrl}
                emptyText={pendingPhoto ? 'โหลดรูปไม่สำเร็จ — ลองรีเฟรชหน้า' : 'ไม่มีรูปที่รออนุมัติ'}
                caption={pendingPhoto ? `อัปโหลดเมื่อ ${formatThaiDateTime(pendingPhoto.uploadedAt)}` : undefined}
                onZoom={() =>
                  pendingPhoto?.signedUrl &&
                  setZoom({ url: pendingPhoto.signedUrl, title: 'รูปโปรไฟล์ (รออนุมัติ)' })
                }
              />
              <PhotoFrame
                title={idCardTitle}
                imageUrl={selectedIdCard?.signedUrl}
                emptyText={selectedIdCard ? 'โหลดรูปบัตรไม่สำเร็จ — ลองรีเฟรชหน้า' : 'ยังไม่มีรูปบัตรประชาชนในระบบ'}
                caption={<>ชื่อตามบัตร: <strong>{caregiver.fullName || '-'}</strong></>}
                onZoom={() =>
                  selectedIdCard?.signedUrl && setZoom({ url: selectedIdCard.signedUrl, title: idCardTitle })
                }
                headerExtra={
                  idCards.length > 1 ? (
                    <div className="flex gap-1.5" role="tablist" aria-label="เลือกรูปบัตร">
                      {idCards.map((doc) => {
                        const isActive = doc.id === selectedIdCard?.id;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setSelectedIdCardId(doc.id)}
                            className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                              isActive
                                ? 'border-[#059669] bg-[#059669] text-white'
                                : 'border-[#059669] text-[#059669] hover:bg-[#ECFDF5]'
                            }`}
                          >
                            {doc.docType === 'id_card_selfie' ? 'คู่บัตร' : 'หน้าบัตร'}
                          </button>
                        );
                      })}
                    </div>
                  ) : null
                }
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="space-y-6">
                {/* รูปที่อนุมัติไว้เดิม — เทียบว่าเปลี่ยนเป็นคนเดิมไหม */}
                {detail?.approvedPhotoUrl ? (
                  <div className="flex items-center gap-4 rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                    <button
                      type="button"
                      onClick={() =>
                        setZoom({ url: detail.approvedPhotoUrl as string, title: 'รูปที่อนุมัติอยู่ปัจจุบัน' })
                      }
                      aria-label="ขยายรูปที่อนุมัติอยู่ปัจจุบัน"
                      className="h-28 w-[84px] shrink-0 cursor-pointer overflow-hidden rounded-lg bg-[#1F2937]"
                    >
                      <img src={detail.approvedPhotoUrl} alt="รูปที่อนุมัติอยู่ปัจจุบัน" className="h-full w-full object-cover" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-[#064E3B]">รูปที่อนุมัติอยู่ปัจจุบัน</p>
                      <p className="mt-1 text-sm text-[#6B7280]">
                        {pendingPhoto
                          ? 'ผู้ดูแลขอเปลี่ยนรูป — ตรวจว่ารูปใหม่เป็นคนเดียวกับรูปเดิม ถ้าปฏิเสธ ผู้ใช้จะยังเห็นรูปนี้ต่อไป'
                          : 'รูปที่ผู้ใช้บริการเห็นอยู่ตอนนี้ (ผ่านการอนุมัติแล้ว)'}
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* ปุ่มตัดสิน */}
                <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#4B5563]">
                    {pendingPhoto
                      ? 'อนุมัติเมื่อใบหน้าในรูปโปรไฟล์ตรงกับบัตรประชาชนและเป็นรูปถ่ายจริง'
                      : 'ไม่มีรูปให้ตัดสินในตอนนี้'}
                  </p>
                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsRejectOpen(true)}
                      disabled={!pendingPhoto}
                      className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border-[1.5px] border-[#EF4444] px-4 text-[13px] font-semibold text-[#DC2626] hover:bg-red-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400 disabled:hover:bg-transparent sm:w-[114px] sm:flex-none"
                    >
                      ปฏิเสธ
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsApproveOpen(true)}
                      disabled={!pendingPhoto}
                      className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg bg-[#059669] px-4 text-[13px] font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-[142px] sm:flex-none"
                    >
                      อนุมัติรูป
                    </button>
                  </div>
                </div>
              </div>

              {/* ประวัติการรีวิวรูป */}
              <article className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <h3 className="text-base font-semibold leading-5 text-[#064E3B]">ประวัติการรีวิวรูปโปรไฟล์</h3>
                {reviews.length === 0 ? (
                  <p className="mt-3 text-sm text-[#9CA3AF]">ยังไม่เคยมีการรีวิวรูปโปรไฟล์ของผู้ดูแลคนนี้</p>
                ) : (
                  <ol className="mt-4 space-y-4">
                    {reviews.map((review) => {
                      const meta = REVIEW_ACTION_META[review.action] ?? { label: review.action, dot: 'bg-gray-400' };
                      return (
                        <li key={review.id} className="flex gap-3">
                          <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#1F2937]">{meta.label}</p>
                            {review.reason ? (
                              <p className="mt-0.5 break-words text-sm text-[#4B5563]">เหตุผล: {review.reason}</p>
                            ) : null}
                            <p className="mt-0.5 text-xs text-[#9CA3AF]">
                              {review.reviewerName || 'แอดมิน'} · {formatThaiDateTime(review.reviewedAt)}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </article>
            </div>
          </section>
        )}
      </main>

      <ConfirmModal
        isOpen={isApproveOpen}
        isLoading={approving}
        title="ยืนยันอนุมัติรูปโปรไฟล์?"
        description={
          <>
            รูปนี้จะแสดงต่อผู้ใช้บริการทันทีแทนรูปเดิมของ{' '}
            <strong className="font-bold text-gray-500">{caregiver?.fullName || '-'}</strong>
          </>
        }
        onClose={() => setIsApproveOpen(false)}
        onConfirm={handleApprove}
      />
      {isRejectOpen ? (
        <RejectPhotoModal
          isLoading={rejecting}
          caregiverName={caregiver?.fullName || ''}
          onClose={() => setIsRejectOpen(false)}
          onConfirm={handleReject}
        />
      ) : null}
      <ImageModal
        isOpen={zoom !== null}
        onClose={() => setZoom(null)}
        imageUrl={zoom?.url ?? ''}
        title={zoom?.title}
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
