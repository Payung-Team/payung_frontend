import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client/react';
import { useKyc } from '../../../context/KycContext';
import { useAuth } from '../../../context/AuthContext';
import { SUBMIT_KYC, RESUBMIT_KYC, DELETE_KYC_DOCUMENT } from '../../../graphql/queries';
import { getBankLabel } from '../../../features/kyc/omiseBanks';
import Icon from '../../../components/ui/Icon';
import Tooltip from '../../../components/ui/Tooltip';
import { supabase } from '../../../lib/supabase';
import { useEffect } from 'react';
import KycStepper from '../KycStepper';

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
  } = useKyc();
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
        if (doc.fileUrl.includes('/kyc-documents/')) {
          try {
            const parts = doc.fileUrl.split('/kyc-documents/');
            const path = parts.length > 1 ? parts[1].split('?')[0] : null;
            if (path) {
              const { data } = await supabase.storage
                .from('kyc-documents')
                .createSignedUrl(decodeURIComponent(path), 3600);
              if (data?.signedUrl) {
                return { ...doc, fileUrl: data.signedUrl };
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

    try {
      const kycInput: Record<string, unknown> = {
        fullName: `${step1Data.firstName} ${step1Data.lastName}`.trim(),
        dateOfBirth: step1Data.birthDate ? new Date(step1Data.birthDate) : undefined,
        gender: step1Data.gender,
        idCardNumber: step1Data.idCardNumber,
        phone: step1Data.phone,
        skills: step1Data.skills,
        experienceYears: Number(step1Data.experienceYears),
        hourlyRate: Number(step1Data.hourlyRate),
        bio: step1Data.bio,
        documentIds: uploadedDocs.map((doc) => doc.docId),
      };

      // PYG-266: ส่ง payoutAccount เฉพาะตอนที่ผู้ใช้กรอก/แก้ไขจริง (ไม่แตะ = ไม่ส่ง)
      if (payoutData) {
        kycInput.payoutAccount = payoutData;
      }

      if (mode === 'resubmit') {
        await resubmitKyc({
          variables: { input: kycInput },
        });

        // Delete old docs from storage + DB (permanent cleanup on submit)
        if (pendingDeleteDocs.length > 0) {
          await Promise.allSettled(pendingDeleteDocs.map(async (doc) => {
            const parts = doc.fileUrl.split('/kyc-documents/');
            const path = parts.length > 1 ? parts[1].split('?')[0] : null;
            if (path) {
              await supabase.storage.from('kyc-documents').remove([decodeURIComponent(path)]);
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
      console.error('KYC Submission Error:', err);
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
    <div className={mode === 'resubmit' ? '' : 'min-h-[calc(100vh-64px)] bg-[#F8F9FB] flex flex-col items-center py-12 px-4 gap-10'}>

      <div
        className={mode === 'resubmit' ? 'w-full flex flex-col gap-6' : 'w-full max-w-[720px] bg-white rounded-[20px] border border-[#F1F5F9] p-12 flex flex-col gap-6'}
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
                className="text-2xl font-bold text-[#0F172A] leading-[30px]"
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
            <InfoRow label="วันเกิด" value={step1Data?.birthDate ? new Date(step1Data.birthDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'} />
            <InfoRow label="เพศ" value={step1Data?.gender === 'male' ? 'ชาย' : step1Data?.gender === 'female' ? 'หญิง' : step1Data?.gender === 'other' ? 'อื่นๆ' : '-'} />
            <InfoRow label="เบอร์โทรศัพท์" value={step1Data?.phone || '-'} />
            <InfoRow label="อีเมล" value={user?.email || '-'} />
            <InfoRow label="ประสบการณ์" value={`${step1Data?.experienceYears || 0} ปี`} />
            <InfoRow label="ค่าบริการเริ่มต้น" value={`${step1Data?.hourlyRate || 0} บาท/ชม.`} />
            <div className="py-2.5 border-b border-[#F1F5F9]">
              <p className="text-[13px] font-medium text-[#64748B] mb-2" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                ทักษะการดูแล
              </p>
              <div className="flex flex-wrap gap-1.5">
                {step1Data?.skills && step1Data.skills.length > 0 ? (
                  step1Data.skills.map((skill, idx) => (
                    <span key={idx} className="bg-[#F1F5F9] text-[#485569] text-[12px] font-medium px-2.5 py-1 rounded-full" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-[#94A3B8] text-[13px]">-</span>
                )}
              </div>
            </div>
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
              label="ใบประกอบวิชาชีพ (ถ้ามี)"
              file={refreshedDocs.find(d => d.docType === 'certificate')}
              border={false}
            />
          </div>
        </div>

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
                <InfoRow label="เลขบัญชี" value={`•••• ${displayPayout.last4}`} border={false} />
              </>
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
              className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 flex items-center justify-center gap-2 ${(mode === 'resubmit' || isConsented) && !loading
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
    <div className={`flex justify-between items-center py-2.5 ${border ? 'border-b border-[#F1F5F9]' : ''}`}>
      <span className="text-[13px] font-medium text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {label}
      </span>
      <span className="text-[14px] font-semibold text-[#1E293B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {value}
      </span>
    </div>
  );
}

function DocRow({ label, file, border = true }: { label: string; file?: { fileName: string; fileUrl: string }; border?: boolean }) {
  const isImage = file?.fileName.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i) || file?.fileUrl.includes('token=') || file?.fileUrl.includes('signedURL=');

  return (
    <div className={`flex justify-between items-center py-2.5 ${border ? 'border-b border-[#F1F5F9]' : ''}`}>
      <span className="text-[13px] font-medium text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        {file ? (
          <div className="flex items-center gap-2 overflow-hidden bg-[#F1F5F9] rounded-lg px-2.5 py-1.5 min-w-[102px]">
            {isImage ? (
              <img src={file.fileUrl} alt={file.fileName} className="w-8 h-8 rounded object-cover border border-white" />
            ) : (
              <div className="w-5 h-5 bg-[#1B6B3A] rounded-sm flex items-center justify-center flex-shrink-0">
                <Icon name="check" color="white" style={{ fontSize: '14px' }} />
              </div>
            )}
            <span className="text-[13px] font-medium text-[#334055] truncate max-w-[150px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
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
