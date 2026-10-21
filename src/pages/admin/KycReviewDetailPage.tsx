import { useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@apollo/client/react';
import { ADMIN_KYC_DETAIL, APPROVE_KYC, REJECT_KYC } from '../../graphql/queries';
import { APPROVE_LICENSE, REJECT_LICENSE } from '../../graphql/license';
import { APPROVE_DRIVING_LICENSE, REJECT_DRIVING_LICENSE } from '../../graphql/drivingLicense';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast, type ToastMessage } from '../../hooks/useToast';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import KycHistoryCard from '../../components/ui/KycHistoryCard';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { getBankLabel } from '../../features/kyc/omiseBanks';
import { skillLabel } from '../../lib/skillLabels';
import ProfessionBadge from '../../components/ui/ProfessionBadge';
import AdminCareLevelCard from '../../features/kyc/AdminCareLevelCard';
import { useAdminCareLevel } from '../../features/kyc/useCareLevel';
import { useCareLevelStrings, type CareLevel } from '../../lib/careLevels';
import { extractGraphQLErrorCode, extractGraphQLErrorExtensions } from '../../lib/apolloErrors';
import { logGraphQLError } from '../../lib/logGraphQLError';
import { licenseErrorCodes } from '../../lib/license';
import { useLicenseStrings } from '../../lib/licenseStrings';
import { drivingLicenseErrorCode } from '../../lib/drivingLicense';
import { useDrivingLicenseStrings } from '../../lib/drivingLicenseStrings';
import KycChecklistCard from '../../features/kyc/adminReview/KycChecklistCard';
import KycDecisionFooter from '../../features/kyc/adminReview/KycDecisionFooter';
import KycRejectConfirmModal from '../../features/kyc/adminReview/KycRejectConfirmModal';
import { buildReviewItems, initialResults, type ReviewItem } from '../../features/kyc/adminReview/kycReviewItems';
import { useKycChecklist } from '../../features/kyc/adminReview/useKycChecklist';
import { formatBirthDate, formatIdCard, formatPhone, formatThaiDateTime, genderLabel, splitName } from '../../features/kyc/adminReview/format';
import type { AdminKycDetailResponse } from '../../features/kyc/adminReview/types';

const RECIPIENT_STATUS_META: Record<string, { label: string; className: string }> = {
  unverified: { label: 'รอตรวจสอบ', className: 'bg-[#FFF7ED] text-[#C2410C]' },
  verified: { label: 'ยืนยันแล้ว', className: 'bg-[#ECFDF5] text-[#047857]' },
  failed: { label: 'ตรวจสอบไม่ผ่าน', className: 'bg-[#FEF2F2] text-[#DC2626]' },
};

const STATUS_PILL: Record<string, { label: string; className: string; icon: string }> = {
  pending: { label: 'รอตรวจสอบ', className: 'bg-[#FFF7ED] text-[#C2410C]', icon: 'schedule' },
  verified: { label: 'อนุมัติแล้ว', className: 'bg-[#D1FAE5] text-[#047857]', icon: 'check' },
  rejected: { label: 'ปฏิเสธแล้ว · รอผู้ดูแลแก้ไข', className: 'bg-[#FEE2E2] text-[#B91C1C]', icon: 'close' },
  none: { label: 'ยังไม่ส่ง', className: 'bg-[#F3F4F6] text-[#4B5563]', icon: 'remove' },
};

function CaregiverField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[13px] font-medium leading-5 text-[#6B7280]">{label}</dt>
      <dd className="mt-1 truncate text-[15px] leading-6 text-[#1F2937]">{value || '-'}</dd>
    </div>
  );
}

const cardClass = 'rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:px-6 sm:py-5';

export default function KycReviewDetailPage() {
  const { caregiverId } = useParams<{ caregiverId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const ls = useLicenseStrings();
  const ds = useDrivingLicenseStrings();
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [deciding, setDeciding] = useState(false);

  const { data, loading, error, refetch } = useQuery<AdminKycDetailResponse>(ADMIN_KYC_DETAIL, {
    variables: { caregiverId },
    skip: !caregiverId,
    fetchPolicy: 'cache-and-network',
  });

  const detail = data?.adminKycDetail;
  const caregiver = detail?.caregiver;
  const caregiverProfession = caregiver?.profession ?? detail?.profession ?? null;
  // PYG-659: ทักษะอื่นๆ จาก BE (otherSkills — alias เป็น customSkills ใน query)
  const caregiverCustomSkills = caregiver?.customSkills ?? [];
  const reviews = detail?.reviews ?? [];
  const editHistory = detail?.editHistory ?? [];
  const resubmitCount = detail?.resubmitCount ?? caregiver?.resubmitCount ?? 0;
  const payoutAccount = detail?.payoutAccount ?? null;
  const kycStatus = caregiver?.kycStatus ?? 'none';
  const isPending = kycStatus === 'pending';
  const readOnly = !isPending;

  // ── รายการตรวจ ────────────────────────────────────────────────────────────
  const items = useMemo(() => (detail ? buildReviewItems(detail) : []), [detail]);
  const initial = useMemo(
    () => initialResults(items, kycStatus, caregiver?.rejectionReasons),
    [items, kycStatus, caregiver?.rejectionReasons],
  );
  // สถานะ KYC เปลี่ยน / ผู้ดูแลส่งใหม่ → เริ่มผลตรวจใหม่ · refetch ธรรมดา (เช่น ขอ signedUrl ใหม่) ไม่ล้างผลตรวจ
  const resetKey = `${caregiverId}|${detail ? 'loaded' : 'loading'}|${kycStatus}|${resubmitCount}|${caregiver?.kycSubmittedAt ?? ''}`;
  const checklist = useKycChecklist(items, initial, resetKey, readOnly);

  // PYG-557 · S02: ระดับผู้ดูแล (BE PYG-581) — ระดับปัจจุบันมากับ adminKycDetail.careLevelInfo
  const careLevelStrings = useCareLevelStrings();
  const careLevel = useAdminCareLevel(caregiver?.id, detail?.careLevelInfo, { kycStatus: caregiver?.kycStatus });
  const [pickedLevel, setPickedLevel] = useState<CareLevel | null>(null);
  const [careLevelError, setCareLevelError] = useState<string | undefined>();
  const careLevelPickerRef = useRef<HTMLDivElement>(null);
  // ถูกส่งกลับเข้าตรวจแล้วมีระดับเดิมอยู่ (S02-E8) → เติมระดับเดิมให้ แอดมินเปลี่ยนได้ (BE ใช้ค่าที่ส่งมา)
  const levelToApprove = pickedLevel ?? (isPending ? careLevel.level : null);

  const pickLevel = (level: CareLevel) => {
    setPickedLevel(level);
    setCareLevelError(undefined);
  };

  const showCareLevelRequired = (message = careLevelStrings.required) => {
    setCareLevelError(message);
    careLevelPickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    careLevelPickerRef.current?.querySelector<HTMLButtonElement>('[role="radio"]')?.focus({ preventScroll: true });
  };

  // S02-E1: ผ่านครบแล้วแต่ยังไม่เลือกระดับ → ไม่ปิดปุ่มเงียบๆ — กดได้ แล้วบอก error ที่ตัวเลือก
  const openApprove = () => {
    if (!checklist.allPass) return;
    if (!levelToApprove) {
      showCareLevelRequired();
      return;
    }
    setIsApproveOpen(true);
  };

  const [approveKyc] = useMutation(APPROVE_KYC);
  const [rejectKyc] = useMutation(REJECT_KYC);
  const [approveLicense] = useMutation(APPROVE_LICENSE);
  const [rejectLicense] = useMutation(REJECT_LICENSE);
  const [approveDrivingLicense] = useMutation(APPROVE_DRIVING_LICENSE);
  const [rejectDrivingLicense] = useMutation(REJECT_DRIVING_LICENSE);

  /**
   * ใบประกอบฯ / ใบขับขี่ตัดสินรายใบผ่าน mutation ของตัวเอง — ยิงก่อนคำสั่ง KYC ทั้งชุด
   * พังกลางทาง → แจ้ง error, โหลดสถานะล่าสุด (ใบที่ตัดสินแล้วจะถูกล็อก) แล้วหยุด ไม่ไปต่อที่ KYC
   */
  const decideItem = async (item: ReviewItem, op: 'approve' | 'reject', reason?: string): Promise<boolean> => {
    if (!item.pendingInBe || !item.documentId) return true;
    const isLicense = item.kind === 'license';
    try {
      const variables = op === 'approve' ? { documentId: item.documentId } : { documentId: item.documentId, reason };
      if (isLicense) await (op === 'approve' ? approveLicense : rejectLicense)({ variables });
      else await (op === 'approve' ? approveDrivingLicense : rejectDrivingLicense)({ variables });
      return true;
    } catch (err) {
      logGraphQLError(`${op === 'approve' ? 'Approve' : 'Reject'}${isLicense ? 'License' : 'DrivingLicense'}`, err);
      let message: string;
      if (extractGraphQLErrorCode(err) === 'CONFLICT') {
        message = isLicense ? ls.adminAlreadyDecided : ds.adminAlreadyDecided;
      } else if (isLicense) {
        const [code] = licenseErrorCodes(err);
        message = code ? ls.apiError[code] : ls.adminActionFailed;
      } else {
        const code = drivingLicenseErrorCode(err);
        message = code ? ds.apiError[code] : ds.adminActionFailed;
      }
      toast.error(`${item.name}: ${message}`);
      await refetch();
      return false;
    }
  };

  const handleApprove = async () => {
    if (!caregiverId || !levelToApprove || !checklist.allPass) return;
    setDeciding(true);
    try {
      for (const item of items) {
        if (item.kind !== 'license' && item.kind !== 'driving') continue;
        if (!(await decideItem(item, 'approve'))) {
          setIsApproveOpen(false);
          return;
        }
      }
      // PYG-581: ระดับไปพร้อมคำสั่งอนุมัติ — ระดับ ประวัติ และ kyc_status อยู่ในทรานแซคชันเดียวฝั่ง BE
      await approveKyc({ variables: { caregiverId, careLevel: levelToApprove } });
      setIsApproveOpen(false);
      setPickedLevel(null);
      toast.success(careLevelStrings.approvedToast(careLevelStrings.levelLabel[levelToApprove]));
      await refetch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (mutationError) {
      const code = extractGraphQLErrorExtensions(mutationError)?.code;
      if (code === 'CARE_LEVEL_REQUIRED' || code === 'CARE_LEVEL_INVALID') {
        setIsApproveOpen(false);
        showCareLevelRequired(code === 'CARE_LEVEL_REQUIRED' ? careLevelStrings.required : careLevelStrings.invalid);
        return;
      }
      toast.error(mutationError instanceof Error ? mutationError.message : 'อนุมัติ KYC ไม่สำเร็จ');
    } finally {
      setDeciding(false);
    }
  };

  const handleReject = async () => {
    const fails = checklist.failRows;
    if (!caregiverId || fails.length === 0 || checklist.emptyRows.length > 0) return;
    setDeciding(true);
    try {
      for (const row of fails) {
        if (row.item.kind !== 'license' && row.item.kind !== 'driving') continue;
        if (!(await decideItem(row.item, 'reject', row.result.remark.trim()))) {
          setIsRejectOpen(false);
          return;
        }
      }
      await rejectKyc({
        variables: {
          caregiverId,
          reasons: fails.map((row) => ({ title: row.result.remark.trim(), documentType: row.item.documentType })),
        },
      });
      setIsRejectOpen(false);
      toast.success('ปฏิเสธ KYC เรียบร้อยแล้ว');
      await refetch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (mutationError) {
      toast.error(mutationError instanceof Error ? mutationError.message : 'ปฏิเสธ KYC ไม่สำเร็จ');
    } finally {
      setDeciding(false);
    }
  };

  const nameParts = splitName(caregiver?.fullName);
  const statusPill = STATUS_PILL[kycStatus] ?? STATUS_PILL.none;
  const caregiverNumber = caregiver ? caregiver.caregiverNumber || caregiver.id.slice(0, 8) : '-';
  const latestDecision = [...reviews]
    .filter((r) => r.action === (kycStatus === 'verified' ? 'approved' : 'rejected'))
    .sort((a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime())[0];
  const decisionMeta = latestDecision
    ? `${formatThaiDateTime(latestDecision.reviewedAt)}${latestDecision.reviewerName ? ` · โดย ${latestDecision.reviewerName}` : ''}`
    : '';
  const rejectedCount = caregiver?.rejectionReasons?.length || checklist.failRows.length;
  const levelName = levelToApprove ? careLevelStrings.levelLabel[levelToApprove] : '';
  const approvedLevelName = careLevel.level ? careLevelStrings.levelLabel[careLevel.level] : '';

  return (
    <div className="bg-[#F7F8FA] text-[#1F2937]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      <main>
        <header className="mx-auto flex max-w-[1312px] flex-wrap items-end justify-between gap-3 px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-6 lg:px-8">
          <div className="flex min-w-0 flex-col gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/admin/kyc')}
              className="inline-flex cursor-pointer items-center gap-1 self-start text-[13px] font-medium text-[#047857] hover:underline"
            >
              <Icon name="chevron_left" style={{ fontSize: 16 }} />
              คำขอ KYC ทั้งหมด
            </button>
            <h1 className="text-2xl font-bold leading-8 text-[#064E3B]">อนุมัติเอกสาร KYC</h1>
          </div>
          {caregiver && (
            <span className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${statusPill.className}`}>
              <Icon name={statusPill.icon} style={{ fontSize: 14 }} />
              {statusPill.label}
            </span>
          )}
        </header>

        {caregiver && kycStatus === 'rejected' && (
          <div className="mx-auto mb-5 max-w-[1312px] px-4 sm:px-6 lg:px-8">
            <div role="status" className="flex items-start gap-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3.5">
              <Icon name="cancel" color="#DC2626" style={{ fontSize: 22 }} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-[15px] font-semibold leading-[22px] text-[#991B1B]">ปฏิเสธแล้ว — ส่งกลับให้ผู้ดูแลแก้ไข {rejectedCount} รายการ</p>
                <p className="text-[13px] leading-5 text-[#7F1D1D]">
                  {decisionMeta ? `${decisionMeta} · ` : ''}ผลตรวจด้านล่างเป็นของครั้งล่าสุด แก้ไขไม่ได้
                </p>
              </div>
            </div>
          </div>
        )}
        {caregiver && kycStatus === 'verified' && (
          <div className="mx-auto mb-5 max-w-[1312px] px-4 sm:px-6 lg:px-8">
            <div role="status" className="flex items-start gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3.5">
              <Icon name="check_circle" color="#059669" style={{ fontSize: 22 }} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-[15px] font-semibold leading-[22px] text-[#065F46]">อนุมัติแล้ว{approvedLevelName ? ` · ${approvedLevelName}` : ''}</p>
                <p className="text-[13px] leading-5 text-[#065F46]">{decisionMeta ? `${decisionMeta} · ` : ''}ผลตรวจด้านล่างแก้ไขไม่ได้</p>
              </div>
            </div>
          </div>
        )}

        {loading && !data ? (
          <section className="mx-auto grid max-w-[1312px] gap-7 px-4 pb-8 sm:px-6 lg:grid-cols-[minmax(0,691px)_minmax(360px,592px)] lg:px-8">
            <Skeleton height={447} borderRadius={12} />
            <Skeleton height={761} borderRadius={12} />
            <Skeleton height={283} borderRadius={12} />
          </section>
        ) : error || !caregiver || !detail ? (
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
          <section className="mx-auto grid max-w-[1312px] items-start gap-4 px-4 pb-10 sm:gap-7 sm:px-6 sm:pb-20 lg:grid-cols-[minmax(0,691px)_minmax(360px,592px)] lg:px-8">
            {/* ซ้าย: ข้อมูลผู้ดูแล — บนมือถืออยู่ใต้การ์ดตรวจ */}
            <div className="order-2 flex min-w-0 flex-col gap-4 sm:gap-7 lg:order-1">
              <article className={cardClass}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-semibold leading-5 text-[#064E3B]">ข้อมูลส่วนตัว</h3>
                  <span className="inline-flex h-6 items-center rounded-full bg-[#D1FAE5] px-3 text-xs font-semibold text-[#047857]">
                    ส่งใหม่ {resubmitCount} ครั้ง
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4">
                  <Avatar name={caregiver.fullName} size={56} className="shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold leading-6 text-[#111827]">{caregiver.fullName || '-'}</p>
                    <p className="text-[13px] leading-5 text-[#6B7280]">{caregiverNumber}</p>
                  </div>
                </div>

                <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-[#F3F4F6] pt-5 sm:grid-cols-2">
                  <CaregiverField label="ชื่อ" value={nameParts.firstName} />
                  <CaregiverField label="นามสกุล" value={nameParts.lastName} />
                  <CaregiverField label="เลขบัตรประชาชน" value={formatIdCard(caregiver.idCardNumber)} />
                  <CaregiverField label="เพศ" value={caregiver.gender ? genderLabel[caregiver.gender] ?? caregiver.gender : '-'} />
                  <CaregiverField label="วันเกิด" value={formatBirthDate(caregiver.dateOfBirth)} />
                  <CaregiverField label="ประสบการณ์" value={`${caregiver.experienceYears ?? 0} ปี`} />
                  <CaregiverField label="อีเมล" value={caregiver.email} />
                  <CaregiverField label="เบอร์โทรศัพท์" value={formatPhone(caregiver.phone)} />
                  {caregiverProfession ? (
                    <div className="min-w-0">
                      <dt className="text-[13px] font-medium leading-5 text-[#6B7280]">วิชาชีพ</dt>
                      <dd className="mt-1"><ProfessionBadge profession={caregiverProfession} /></dd>
                    </div>
                  ) : null}
                  {caregiver.address ? (
                    <div className="min-w-0 sm:col-span-2">
                      <dt className="text-[13px] font-medium leading-5 text-[#6B7280]">ที่อยู่</dt>
                      <dd className="mt-1 text-[15px] leading-6 text-[#1F2937]">{caregiver.address}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="mt-5 border-t border-[#F3F4F6] pt-5">
                  <p className="text-[13px] font-medium leading-5 text-[#6B7280]">ทักษะการดูแล</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {caregiver.skills.length > 0 ? (
                      caregiver.skills.map((skill) => (
                        <span key={skill} className="inline-flex items-center rounded-md bg-[#F3F4F6] px-2.5 py-1 text-[13px] text-[#374151]">
                          {skillLabel(skill)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[15px] text-[#1F2937]">-</span>
                    )}
                  </div>
                  {caregiverCustomSkills.length > 0 ? (
                    <>
                      <p className="mt-4 text-[13px] font-medium leading-5 text-[#6B7280]">ทักษะอื่นๆ (ผู้ดูแลพิมพ์เอง · แสดงในโปรไฟล์ ไม่ใช้จับคู่งาน)</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {caregiverCustomSkills.map((skill) => (
                          <span key={skill} className="inline-flex items-center rounded-md border border-dashed border-[#D1D5DB] bg-white px-2.5 py-1 text-[13px] text-[#374151]">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : null}
                  {caregiver.bio ? (
                    <>
                      <p className="mt-4 text-[13px] font-medium leading-5 text-[#6B7280]">ประวัติโดยย่อ</p>
                      <p className="mt-1.5 text-[15px] leading-6 text-[#1F2937]">{caregiver.bio}</p>
                    </>
                  ) : null}
                </div>
              </article>

              {/*Payout Account (PYG-266)*/}
              <article className={cardClass}>
                <h3 className="text-base font-semibold leading-5 text-[#064E3B]">บัญชีธนาคาร/ข้อมูลรับเงิน</h3>
                {payoutAccount ? (
                  <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <CaregiverField label="ธนาคาร" value={getBankLabel(payoutAccount.bankCode)} />
                    <CaregiverField label="ชื่อบัญชี (เทียบกับชื่อในบัตร)" value={payoutAccount.accountName} />
                    <CaregiverField label="เลขบัญชี" value={`•••• ${payoutAccount.accountNumberLast4}`} />
                    <div className="min-w-0">
                      <dt className="text-[13px] font-medium leading-5 text-[#6B7280]">สถานะการยืนยันกับ Omise</dt>
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

              <KycHistoryCard caregiver={caregiver} reviews={reviews} editHistory={editHistory} onlyKycLogs={true} />
            </div>

            {/* ขวา: ตรวจเอกสารทีละรายการ + ระดับผู้ดูแล + ตัดสิน */}
            <div className="order-1 flex min-w-0 flex-col gap-4 sm:gap-6 lg:order-2">
              {/* PYG-511: อนุมัติ KYC ไม่อนุมัติรูปโปรไฟล์ให้ — ต้องเทียบหน้าแยกอีกหน้า */}
              {detail.pendingProfilePhotoDocumentId ? (
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

              <KycChecklistCard checklist={checklist} detail={detail} readOnly={readOnly} onRetry={() => refetch()} />

              {/* PYG-557 · S02: ระดับผู้ดูแล — วางชิดเหนือปุ่มอนุมัติ · ปฏิเสธแล้วไม่ต้องแสดง */}
              {kycStatus !== 'rejected' && (
                <AdminCareLevelCard
                  ref={careLevelPickerRef}
                  caregiverName={caregiver.fullName}
                  kycStatus={caregiver.kycStatus}
                  profession={caregiverProfession}
                  data={careLevel}
                  picked={levelToApprove}
                  onPick={pickLevel}
                  pickerError={careLevelError}
                  onNotify={(type, message) => (type === 'success' ? toast.success(message) : toast.error(message))}
                />
              )}

              {isPending ? (
                <KycDecisionFooter
                  checklist={checklist}
                  levelName={levelName}
                  busy={deciding}
                  onReject={() => setIsRejectOpen(true)}
                  onApprove={openApprove}
                />
              ) : (
                <p className="flex items-start gap-2 rounded-[10px] bg-[#F3F4F6] px-3.5 py-3 text-[13px] leading-5 text-[#374151]">
                  <Icon name="lock" style={{ fontSize: 16 }} />
                  {kycStatus === 'rejected'
                    ? 'ตัดสินแล้ว — แก้ผลตรวจไม่ได้ · ผู้ดูแลส่งใหม่ได้เฉพาะรายการที่ไม่ผ่าน แล้วคำขอจะกลับมารอตรวจอีกครั้ง'
                    : kycStatus === 'verified'
                      ? 'อนุมัติแล้ว — แก้ผลตรวจไม่ได้ · เปลี่ยนระดับผู้ดูแลได้จากการ์ดระดับผู้ดูแลด้านบน'
                      : 'ผู้ดูแลยังไม่ได้ส่ง KYC — ยังตรวจไม่ได้'}
                </p>
              )}
            </div>
          </section>
        )}
      </main>

      <ConfirmModal
        isOpen={isApproveOpen}
        isLoading={deciding}
        title="ยืนยันอนุมัติ KYC?"
        description={
          <>
            {careLevelStrings.approveConfirm.before}
            <strong className="font-bold text-gray-800">{caregiver?.fullName || '-'}</strong>
            {careLevelStrings.approveConfirm.between}
            <strong className="font-bold text-gray-800">{levelName}</strong>
            {careLevelStrings.approveConfirm.after}
          </>
        }
        onClose={() => setIsApproveOpen(false)}
        onConfirm={() => void handleApprove()}
      />
      <KycRejectConfirmModal
        isOpen={isRejectOpen}
        isLoading={deciding}
        caregiverName={caregiver?.fullName || ''}
        caregiverNumber={caregiverNumber}
        checklist={checklist}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={() => void handleReject()}
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
