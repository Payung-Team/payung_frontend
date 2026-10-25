import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { useKyc } from '../../../context/KycContext';
import { useAuth } from '../../../context/AuthContext';
import { SUBMIT_KYC, RESUBMIT_KYC, DELETE_KYC_DOCUMENT } from '../../../graphql/queries';
import { getBankLabel } from '../../../features/kyc/omiseBanks';
import { SEND_PAYOUT_ACCOUNT_WITH_KYC } from '../../../features/kyc/payoutAccountFlag';
import { logGraphQLError } from '../../../lib/logGraphQLError';
import Icon from '../../../components/ui/Icon';
import Tooltip from '../../../components/ui/Tooltip';
import { supabase } from '../../../lib/supabase';
import { useEffect } from 'react';
import KycStepper from '../KycStepper';
import { skillErrorMessage, skillLabel } from '../../../lib/skillLabels';
import { isKycProfessionError, professionErrorMessage } from '../../../lib/professions';
import ProfessionBadge from '../../../components/ui/ProfessionBadge';
import { LICENSE_DOC_TYPE, LICENSE_KYC_ENABLED, licenseErrorCodes, requiresLicense } from '../../../lib/license';
import {
  DRIVING_LICENSE_DOC_TYPE,
  DRIVING_LICENSE_KYC_ENABLED,
  drivingLicenseErrorCode,
  transportChoiceToMode,
} from '../../../lib/drivingLicense';
import { useDrivingLicenseStrings } from '../../../lib/drivingLicenseStrings';
import { isDrivingLicenseRegistered } from '../../../features/kyc/drivingLicenseDraft';
import { formatLicenseDate, useLicenseStrings } from '../../../lib/licenseStrings';
import { isDraftRegistered, storagePathFromUrl } from '../../../features/kyc/licenseDraft';
import { kycDate } from '../../../features/kyc/kycDate';

// ── Main Component ────────────────────────────────────────────────────────
export default function KycStep4({ mode = 'create' }: { mode?: 'create' | 'resubmit' }) {
  const {
    goToStep,
    step1Data,
    uploadedDocs,
    payoutData,
    initialStep1Data,
    initialDocs,
    initialPayoutData,
    pendingDeleteDocs,
    clearPendingDeleteDocs,
    licenseDraft,
    transportChoice,
    drivingLicenseDraft,
  } = useKyc();
  const ls = useLicenseStrings();
  // PYG-588: ใบประกอบฯ เฉพาะพยาบาล / นักกายภาพฯ — วิชาชีพอื่นไม่ส่งใบที่ค้างอยู่ไปกับ KYC (E1)
  const needsLicense = LICENSE_KYC_ENABLED && requiresLicense(step1Data?.profession);
  // PYG-598: ใบขับขี่ส่งไปกับ KYC เฉพาะเมื่อตอบ "ขับเอง" — ตอบอย่างอื่นไม่ส่งใบที่ค้างอยู่
  const ds = useDrivingLicenseStrings();
  const selfDrive = DRIVING_LICENSE_KYC_ENABLED && transportChoice === 'self';
  const submitDocs = uploadedDocs.filter((doc) =>
    (doc.docType !== LICENSE_DOC_TYPE || needsLicense) &&
    (doc.docType !== DRIVING_LICENSE_DOC_TYPE || selfDrive));
  const [drivingLicenseError, setDrivingLicenseError] = useState('');
  const [licenseError, setLicenseError] = useState('');
  const [professionError, setProfessionError] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isConsented, setIsConsented] = useState(false);
  const [submitKyc, { loading: creating }] = useMutation(SUBMIT_KYC);
  const [resubmitKyc, { loading: updating }] = useMutation(RESUBMIT_KYC);
  const [deleteDocMutation] = useMutation(DELETE_KYC_DOCUMENT);
  const loading = creating || updating;
  const [refreshedDocs, setRefreshedDocs] = useState(uploadedDocs);

  // Refresh signed URLs for all documents to ensure thumbnails show up
  useEffect(() => {
    const refreshAll = async () => {
      const updated = await Promise.all(uploadedDocs.map(async (doc) => {
        if (doc.previewUrl.includes('/kyc-documents/')) {
          try {
            const parts = doc.previewUrl.split('/kyc-documents/');
            const path = parts.length > 1 ? parts[1].split('?')[0] : null;
            if (path) {
              const { data } = await supabase.storage
                .from('kyc-documents')
                .createSignedUrl(decodeURIComponent(path), 3600);
              if (data?.signedUrl) {
                return { ...doc, previewUrl: data.signedUrl };
              }
            }
          } catch (err) {
            console.warn('Failed to refresh URL in Step 4:', err);
          }
        }
        return doc;
      }));
      setRefreshedDocs(updated);
    };

    if (uploadedDocs.length > 0) {
      refreshAll();
    }
  }, [uploadedDocs]);

  const hasDataChanged = () => {
    if (mode !== 'resubmit') return true;
    if (!initialStep1Data || !step1Data) return true;

    if (JSON.stringify(initialStep1Data) !== JSON.stringify(step1Data)) return true;

    const initialDocIds = initialDocs.map(d => d.docId).sort().join(',');
    const currentDocIds = uploadedDocs.map(d => d.docId).sort().join(',');
    if (initialDocIds !== currentDocIds) return true;

    // ผู้ใช้เปิด "แก้ไขบัญชี" แล้วกรอกครบ (payoutData ถูกตั้งค่า) = มีการเปลี่ยนแปลง
    if (payoutData) return true;

    return false;
  };

  const isChanged = hasDataChanged();

  const handleEditPersonalInfo = () => {
    goToStep(1);
  };

  const handleChangeFiles = () => {
    goToStep(2);
  };

  const handleEditPayout = () => {
    goToStep(3);
  };

  const handleSubmit = async () => {
    if (!step1Data) return;
    setLicenseError('');
    setProfessionError('');
    setDrivingLicenseError('');
    // R1: ใบประกอบฯ ต้องครบและบันทึกแล้วที่ขั้น 2 — กันซ้ำตอนกดส่ง (E3: วันหมดอายุตรวจอีกรอบที่ BE)
    if (needsLicense && !isDraftRegistered(licenseDraft)) {
      setLicenseError(ls.submitLicenseError);
      return;
    }
    // PYG-598: ต้องตอบเรื่องการรับส่ง และ "ขับเอง" ต้องบันทึกใบขับขี่แล้วที่ขั้น 2
    if (DRIVING_LICENSE_KYC_ENABLED && (!transportChoice || (selfDrive && !isDrivingLicenseRegistered(drivingLicenseDraft)))) {
      setDrivingLicenseError(ds.submitError);
      return;
    }

    try {
      const kycInput: Record<string, unknown> = {
        fullName: `${step1Data.firstName} ${step1Data.lastName}`.trim(),
        dateOfBirth: step1Data.birthDate ? new Date(step1Data.birthDate) : undefined,
        gender: step1Data.gender,
        idCardNumber: step1Data.idCardNumber,
        phone: step1Data.phone,
        skills: step1Data.skills,
        experienceYears: Number(step1Data.experienceYears),
        // ไม่ส่ง hourlyRate แล้ว (PYG-536) — ผู้ดูแลตั้งราคาเองไม่ได้ ราคามาจาก catalog ฝั่ง BE
        bio: step1Data.bio,
        documentIds: submitDocs.map((doc) => doc.docId),
        // PYG-556: บังคับ — ไม่ส่ง/ค่าผิด BE ตอบ PROFESSION_REQUIRED / PROFESSION_INVALID (contract PYG-573 §3.2)
        profession: step1Data.profession,
        // PYG-659: ทักษะอื่นๆ (BE ชื่อ otherSkills) — ส่งเสมอ ส่ง [] = ไม่มี / ล้างของเดิมตอนยื่นซ้ำ
        otherSkills: step1Data.customSkills ?? [],
      };
      // PYG-662: transportMode = คำตอบ 3 แบบ (BE เก็บไว้ · SELF_DRIVE → บังคับใบขับขี่ในรอบนี้)
      //   selfDriveTransport ส่งคู่กันเพื่อ BE ที่ยังไม่มี transportMode — BE ใหม่ใช้ transportMode ก่อน
      if (DRIVING_LICENSE_KYC_ENABLED) {
        kycInput.selfDriveTransport = selfDrive;
        const mode = transportChoiceToMode(transportChoice);
        if (mode) kycInput.transportMode = mode;
      }

      // PYG-266: ส่ง payoutAccount เฉพาะตอนที่ผู้ใช้กรอก/แก้ไขจริง (ไม่แตะ = ไม่ส่ง)
      // PYG-307: ปิดไว้ชั่วคราวจนกว่า BE PR #37 จะ merge (ดู payoutAccountFlag.ts)
      if (SEND_PAYOUT_ACCOUNT_WITH_KYC && payoutData) {
        kycInput.payoutAccount = payoutData;
      }

      if (mode === 'resubmit') {
        await resubmitKyc({
          variables: { input: kycInput },
        });

        // Delete old docs from storage + DB (permanent cleanup on submit)
        if (pendingDeleteDocs.length > 0) {
          // ไฟล์ที่เอกสารปัจจุบันยังใช้อยู่ห้ามลบ (PYG-588: แก้เลข/วันหมดอายุ = แถวใหม่ที่ใช้ไฟล์เดิม)
          const pathsInUse = new Set(uploadedDocs.map((d) => storagePathFromUrl(d.previewUrl)).filter(Boolean));
          await Promise.allSettled(pendingDeleteDocs.map(async (doc) => {
            const path = storagePathFromUrl(doc.previewUrl);
            if (path && !pathsInUse.has(path)) {
              await supabase.storage.from('kyc-documents').remove([path]);
            }
            await deleteDocMutation({ variables: { documentId: doc.docId } });
          }));
          clearPendingDeleteDocs();
        }

        navigate('/kyc/status');
      } else {
        await submitKyc({
          variables: { input: kycInput },
        });
        navigate('/kyc/success');
      }
    } catch (err) {
      // ห้าม log err ดิบ ๆ — message ของ GraphQL สะท้อน $input ที่มีเลขบัตร/เลขบัญชีกลับมาด้วย
      logGraphQLError(mode === 'resubmit' ? 'ResubmitKyc' : 'SubmitKyc', err);
      // PYG-588: BE ตรวจใบประกอบฯ ซ้ำตอนส่ง (เช่น วันหมดอายุผ่านไประหว่างกรอก) → พาไปแก้ที่ขั้น 2
      if (licenseErrorCodes(err).length > 0) {
        setLicenseError(ls.submitLicenseError);
        return;
      }
      // PYG-598: ใบขับขี่ไม่ครบ / หมดอายุระหว่างกรอก → พาไปแก้ที่ขั้น 2
      const dlCode = drivingLicenseErrorCode(err);
      if (dlCode) {
        setDrivingLicenseError(`${ds.apiError[dlCode]} · ${ds.submitError}`);
        return;
      }
      // PYG-655: ทักษะไม่อยู่ในรายการกลาง / เป็นทักษะเฉพาะของวิชาชีพอื่น → แก้ที่ขั้น 1 (แบนเนอร์เดียวกับวิชาชีพ)
      const skillMessage = skillErrorMessage(err);
      if (skillMessage) {
        setProfessionError(skillMessage);
        return;
      }
      // PYG-556: วิชาชีพว่าง/ไม่ถูกต้อง → พาไปเลือกใหม่ที่ขั้น 1
      if (isKycProfessionError(err)) {
        setProfessionError(professionErrorMessage(err) ?? '');
        return;
      }
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    }
  };

  // แสดงบัญชีธนาคาร: ถ้าเพิ่งกรอกใน step 3 รอบนี้ (payoutData) ให้โชว์ตามนั้น
  // ไม่งั้นถ้ามีบัญชีเดิม (resubmit) โชว์แบบ masked จาก initialPayoutData
  const displayPayout = payoutData
    ? { bankCode: payoutData.bankCode, accountName: payoutData.accountName, last4: payoutData.accountNumber.slice(-4) }
    : initialPayoutData
      ? { bankCode: initialPayoutData.bankCode, accountName: initialPayoutData.accountName, last4: initialPayoutData.accountNumberLast4 }
      : null;

  return (
    <div className={mode === 'resubmit' ? '' : 'min-h-[calc(100vh-64px)] bg-[#F8F9FB] flex flex-col items-center py-6 sm:py-12 px-4 gap-10'}>

      <div
        className={mode === 'resubmit' ? 'w-full flex flex-col gap-6' : 'w-full max-w-[720px] bg-white rounded-[20px] border border-[#F1F5F9] px-5 py-6 sm:p-12 flex flex-col gap-5 sm:gap-6'}
        style={mode === 'resubmit' ? {} : {
          boxShadow: '0px 12px 28px -6px rgba(15, 23, 43, 0.06), 0px 1px 2px rgba(15, 23, 43, 0.04)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <KycStepper current={4} />
          {mode !== 'resubmit' && (
            <>
              <h2
                className="text-xl sm:text-2xl font-bold text-[#0F172A] leading-[30px]"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                ตรวจสอบข้อมูล
              </h2>
              <p
                className="text-sm text-[#64748B] leading-[20px]"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                ตรวจสอบข้อมูลให้ถูกต้องก่อนส่งเพื่อยืนยันตัวตน
              </p>
            </>
          )}
        </div>

        {/* Personal Info Card */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="bg-[#F8FAFC] px-5 py-3.5 flex justify-between items-center border-b border-[#E2E8F0]">
            <span className="text-[15px] font-semibold text-[#1E293B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ข้อมูลส่วนตัว
            </span>
            <button
              onClick={handleEditPersonalInfo}
              className="text-[13px] font-semibold text-[#0F766E] hover:underline transition-all cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              แก้ไข
            </button>
          </div>
          <div className="px-5 py-2 flex flex-col">
            <InfoRow label="ชื่อจริง" value={step1Data?.firstName || '-'} />
            <InfoRow label="นามสกุล" value={step1Data?.lastName || '-'} />
            <InfoRow label="เลขบัตรประชาชน" value={step1Data?.idCardNumber || '-'} />
            <InfoRow label="วันเกิด" value={kycDate(step1Data?.birthDate)} />
            <InfoRow label="เพศ" value={step1Data?.gender === 'male' ? 'ชาย' : step1Data?.gender === 'female' ? 'หญิง' : step1Data?.gender === 'other' ? 'อื่นๆ' : '-'} />
            <InfoRow label="เบอร์โทรศัพท์" value={step1Data?.phone || '-'} />
            <InfoRow label="อีเมล" value={user?.email || '-'} />
            <InfoRow label="ประสบการณ์" value={`${step1Data?.experienceYears || 0} ปี`} />
            <div className="flex justify-between items-center py-2.5 border-b border-[#F1F5F9]">
              <span className="text-[13px] font-medium text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                วิชาชีพ
              </span>
              {step1Data?.profession ? <ProfessionBadge profession={step1Data.profession} /> : <span className="text-[#94A3B8] text-[13px]">-</span>}
            </div>
            <ChipRow label="ทักษะการดูแล" items={(step1Data?.skills ?? []).map(skillLabel)} />
            <ChipRow label="ทักษะอื่นๆ" items={step1Data?.customSkills ?? []} dashed />
            <div className="py-2.5">
              <p className="text-[13px] font-medium text-[#64748B] mb-1" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                แนะนำตัว
              </p>
              <p className="text-[14px] text-[#1E293B] leading-[20px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {step1Data?.bio || '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Attachments Card */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="bg-[#F8FAFC] px-5 py-3.5 flex justify-between items-center border-b border-[#E2E8F0]">
            <span className="text-[15px] font-semibold text-[#1E293B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              เอกสารแนบ
            </span>
            <button
              onClick={handleChangeFiles}
              className="text-[13px] font-semibold text-[#0F766E] hover:underline transition-all cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              เปลี่ยนไฟล์
            </button>
          </div>
          <div className="px-5 py-2 flex flex-col gap-0">
            <DocRow
              label="รูปบัตรประชาชน"
              file={refreshedDocs.find(d => d.docType === 'id_card_front')}
            />
            <DocRow
              label="รูปถ่ายคู่บัตร"
              file={refreshedDocs.find(d => d.docType === 'id_card_selfie')}
            />
            <DocRow
              label={LICENSE_KYC_ENABLED ? ls.certificateTitle : 'ใบประกอบวิชาชีพ (ถ้ามี)'}
              file={refreshedDocs.find(d => d.docType === 'certificate')}
              border={false}
            />
          </div>
        </div>

        {/* PYG-588: ใบประกอบวิชาชีพ — สรุปก่อนส่ง (ดีไซน์ PYG-584 C3) */}
        {needsLicense && (
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="bg-[#F8FAFC] px-5 py-3.5 flex justify-between items-center border-b border-[#E2E8F0]">
              <span className="text-[15px] font-semibold text-[#1E293B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {ls.sectionTitle}
              </span>
              <button
                onClick={handleChangeFiles}
                className="text-[13px] font-semibold text-[#0F766E] hover:underline transition-all cursor-pointer"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                {ls.reviewEdit}
              </button>
            </div>
            <div className="px-5 py-2 flex flex-col">
              <div className="flex justify-between items-center py-2.5 border-b border-[#F1F5F9]">
                <span className="text-[13px] font-medium text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  {ls.reviewProfession}
                </span>
                {step1Data?.profession ? <ProfessionBadge profession={step1Data.profession} /> : <span className="text-[#94A3B8] text-[13px]">-</span>}
              </div>
              <InfoRow label={ls.reviewNumber} value={licenseDraft.licenseNumber.trim() || '-'} />
              <InfoRow label={ls.reviewExpiry} value={licenseDraft.expiresAt ? formatLicenseDate(licenseDraft.expiresAt) : '-'} />
              <DocRow
                label={ls.reviewFile}
                file={refreshedDocs.find(d => d.docType === LICENSE_DOC_TYPE)}
                border={false}
              />
            </div>
          </div>
        )}

        {/* PYG-598: การรับส่งผู้รับการดูแล — สรุปก่อนส่ง */}
        {DRIVING_LICENSE_KYC_ENABLED && (
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="bg-[#F8FAFC] px-5 py-3.5 flex justify-between items-center border-b border-[#E2E8F0]">
              <span className="text-[15px] font-semibold text-[#1E293B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {ds.reviewTitle}
              </span>
              <button
                onClick={handleChangeFiles}
                className="text-[13px] font-semibold text-[#0F766E] hover:underline transition-all cursor-pointer"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                {ds.reviewEdit}
              </button>
            </div>
            <div className="px-5 py-2 flex flex-col">
              <InfoRow
                label={ds.reviewChoice}
                value={transportChoice ? ds.transportOption[transportChoice].label : '-'}
                border={selfDrive}
              />
              {selfDrive && (
                <>
                  <InfoRow
                    label={ds.reviewExpiry}
                    value={drivingLicenseDraft.expiresAt ? formatLicenseDate(drivingLicenseDraft.expiresAt) : '-'}
                  />
                  <DocRow
                    label={ds.reviewFile}
                    file={refreshedDocs.find(d => d.docType === DRIVING_LICENSE_DOC_TYPE)}
                    border={false}
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Payout Account Card (PYG-266) */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="bg-[#F8FAFC] px-5 py-3.5 flex justify-between items-center border-b border-[#E2E8F0]">
            <span className="text-[15px] font-semibold text-[#1E293B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              บัญชีรับเงิน
            </span>
            <button
              onClick={handleEditPayout}
              className="text-[13px] font-semibold text-[#0F766E] hover:underline transition-all cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              แก้ไข
            </button>
          </div>
          <div className="px-5 py-2 flex flex-col">
            {displayPayout ? (
              <>
                <InfoRow label="ธนาคาร" value={getBankLabel(displayPayout.bankCode)} />
                <InfoRow label="ชื่อบัญชี" value={displayPayout.accountName || '-'} />
                <InfoRow label="เลขบัญชี" value={`•••• ${displayPayout.last4}`} border={false} />              </>
            ) : (
              <div className="py-2.5">
                <span className="text-[#94A3B8] text-[13px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  ยังไม่ได้กรอกบัญชีรับเงิน (ไม่บังคับ — เพิ่มทีหลังได้)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Consent Box */}
        {mode !== 'resubmit' && (
          <button
            onClick={() => setIsConsented(!isConsented)}
            className={`w-full rounded-xl p-4 flex gap-3 text-left transition-all cursor-pointer ${isConsented ? 'bg-[#E0F6F1]' : 'bg-[#F8FAFC] border border-[#E2E8F0]'
              }`}
          >
            <div
              className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${isConsented ? 'bg-[#0F766E]' : 'bg-white border-2 border-[#CBD5E1]'
                }`}
            >
              {isConsented && (
                <Icon name="check" color="white" style={{ fontSize: '14px' }} />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className={`text-[13px] font-semibold transition-colors ${isConsented ? 'text-[#115E59]' : 'text-[#485569]'}`} style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                ข้าพเจ้ายินยอมให้ Payung เก็บและใช้ข้อมูลส่วนบุคคล
              </p>
              <p className="text-[12px] text-[#485569]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                ข้อมูลจะถูกใช้เฉพาะการยืนยันตัวตนตามนโยบายความเป็นส่วนตัว (PDPA)
              </p>
            </div>
          </button>
        )}

        {/* Warning Info */}
        {mode === 'resubmit' && (
          <div className="flex flex-row items-center p-[12px_16px] gap-[10px] bg-[#FEF6E9] border border-[#BB7E1C] rounded-[10px]">
            <div className="w-[20px] h-[20px] flex items-center justify-center flex-shrink-0">
              <Icon name="info" color="#F9A825" style={{ fontSize: '20px' }} />
            </div>
            <p className="text-[15px] text-[#0F172A] leading-[19px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ข้อมูลที่แก้ไขจะถูกบันทึกอัตโนมัติ และส่งให้ทีมตรวจสอบเมื่อกด "ส่งใหม่"
            </p>
          </div>
        )}

        {/* PYG-588: ใบประกอบฯ ไม่ครบ / API ไม่รับ — พากลับไปแก้ที่ขั้น "เอกสาร" */}
        {/* PYG-598: การรับส่ง / ใบขับขี่ไม่ครบ หรือ API ไม่รับ — พากลับไปแก้ที่ขั้น "เอกสาร" */}
        {drivingLicenseError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <p className="flex items-start gap-2 text-[14px] text-[#B91C1C]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              <Icon name="error" color="currentColor" style={{ fontSize: '18px' }} />
              {drivingLicenseError}
            </p>
            <button
              type="button"
              onClick={handleChangeFiles}
              className="text-[13px] font-semibold text-[#B91C1C] underline cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {ds.reviewEdit}
            </button>
          </div>
        )}

        {licenseError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <p className="flex items-start gap-2 text-[14px] text-[#B91C1C]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              <Icon name="error" color="currentColor" style={{ fontSize: '18px' }} />
              {licenseError}
            </p>
            <button
              type="button"
              onClick={handleChangeFiles}
              className="text-[13px] font-semibold text-[#B91C1C] underline cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {ls.reviewEdit}
            </button>
          </div>
        )}

        {/* PYG-556: API ไม่รับวิชาชีพ — พากลับไปเลือกที่ขั้น "ข้อมูลส่วนตัว" */}
        {professionError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
            <p className="flex items-start gap-2 text-[14px] text-[#B91C1C]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              <Icon name="error" color="currentColor" style={{ fontSize: '18px' }} />
              {professionError}
            </p>
            <button
              type="button"
              onClick={handleEditPersonalInfo}
              className="text-[13px] font-semibold text-[#B91C1C] underline cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              แก้ไข
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-[#F1F5F9]">
          <button
            onClick={() => goToStep(3)}
            className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] text-[#717182] text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ← ย้อนกลับ
          </button>

          {mode === 'resubmit' && !isChanged ? (
            <Tooltip content="กรุณาแก้ไขข้อมูลอย่างน้อย 1 รายการก่อนส่งข้อมูลอีกครั้ง" position="top">
              <div className="inline-block">
                <button
                  type="button"
                  disabled={true}
                  className="px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 bg-[#CBD5E1] text-white cursor-not-allowed"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  ส่งเอกสารอีกครั้ง
                </button>
              </div>
            </Tooltip>
          ) : (
            <button
              type="button"
              disabled={(mode !== 'resubmit' && !isConsented) || loading}
              onClick={handleSubmit}
              className={`px-6 sm:px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 ${(mode === 'resubmit' || isConsented) && !loading
                  ? 'bg-[#2D6A58] text-white hover:bg-[#255a4a] active:scale-[0.98] cursor-pointer'
                  : 'bg-[#CBD5E1] text-white cursor-not-allowed'
                }`}
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {loading ? (
                <>
                  <Icon name="refresh" className="animate-spin" color="white" style={{ fontSize: '16px' }} />
                  กำลังส่ง...
                </>
              ) : mode === 'resubmit' ? 'ส่งเอกสารอีกครั้ง' : 'ส่งข้อมูล'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, border = true }: { label: string; value: string; border?: boolean }) {
  return (
    <div className={`flex justify-between items-center gap-4 py-2.5 ${border ? 'border-b border-[#F1F5F9]' : ''}`}>
      <span className="shrink-0 text-[13px] font-medium text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {label}
      </span>
      <span className="min-w-0 text-right break-words text-[14px] font-semibold text-[#1E293B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {value}
      </span>
    </div>
  );
}

function ChipRow({ label, items, dashed = false }: { label: string; items: string[]; dashed?: boolean }) {
  return (
    <div className="py-2.5 border-b border-[#F1F5F9]">
      <p className="text-[13px] font-medium text-[#64748B] mb-2" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className={`text-[#485569] text-[12px] font-medium px-2.5 py-1 rounded-full ${dashed ? 'bg-white border border-dashed border-[#CBD5E1]' : 'bg-[#F1F5F9]'}`}
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-[#94A3B8] text-[13px]">-</span>
        )}
      </div>
    </div>
  );
}

function DocRow({ label, file, border = true }: { label: string; file?: { fileName: string; previewUrl: string }; border?: boolean }) {
  const isImage = file?.fileName.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) || file?.previewUrl.includes('token=') || file?.previewUrl.includes('signedURL=');

  return (
    <div className={`flex justify-between items-center gap-3 py-2.5 ${border ? 'border-b border-[#F1F5F9]' : ''}`}>
      <span className="min-w-0 text-[13px] font-medium text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {file ? (
          <div className="flex items-center gap-2 overflow-hidden bg-[#F1F5F9] rounded-lg px-2.5 py-1.5 min-w-[102px]">
            {isImage ? (
              <img src={file.previewUrl} alt={file.fileName} className="w-8 h-8 rounded object-cover border border-white" />
            ) : (
              <div className="w-5 h-5 bg-[#1B6B3A] rounded-sm flex items-center justify-center flex-shrink-0">
                <Icon name="check" color="white" style={{ fontSize: '14px' }} />
              </div>
            )}
            <span className="text-[13px] font-medium text-[#334055] truncate max-w-[110px] sm:max-w-[150px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              {file.fileName}
            </span>
          </div>
        ) : (
          <div className="bg-[#F1F5F9] rounded-lg px-2.5 py-1.5 min-w-[102px]">
            <span className="text-[13px] font-medium text-[#94A3B8]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ยังไม่ได้อัปโหลด
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
