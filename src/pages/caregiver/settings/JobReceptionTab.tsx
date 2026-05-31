import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { GET_CAREGIVER_PROFILE, SET_CAREGIVER_SEARCHABLE } from '../../../graphql/queries';
import { Icon } from '../../../components/ui/Icon';
import { useToast } from '../../../hooks/useToast';

type JobReceptionChecklistKey = 'profileVisible' | 'jobAlerts' | 'pauseAnytime';

export const JobReceptionTab: React.FC = () => {
  const navigate = useNavigate();
  const { success: showSuccess, error: showError } = useToast();

  const [jobReceptionChecklist, setJobReceptionChecklist] = useState<
    Record<JobReceptionChecklistKey, boolean>
  >({
    profileVisible: true,
    jobAlerts: true,
    pauseAnytime: true,
  });

  const { data: caregiverData, loading: caregiverLoading } = useQuery<{
    myCaregiverProfile: {
      id: string;
      kycStatus: string;
      isSearchable: boolean;
    };
  }>(GET_CAREGIVER_PROFILE);

  const [jobReceptionError, setJobReceptionError] = useState<string | null>(null);
  const [optimisticIsSearchable, setOptimisticIsSearchable] = useState<boolean | null>(null);

  const [setCaregiverSearchable, { loading: updatingSearchable }] = useMutation(
    SET_CAREGIVER_SEARCHABLE,
  );

  const caregiver = caregiverData?.myCaregiverProfile;
  const serverIsSearchable = Boolean(caregiver?.isSearchable);
  const effectiveIsSearchable = optimisticIsSearchable ?? serverIsSearchable;

  const isKycVerified = caregiver?.kycStatus === 'verified';
  const isAcceptingJobs = Boolean(effectiveIsSearchable && isKycVerified);
  const showKycWarning = !isKycVerified;

  const receptionCardClass = isKycVerified
    ? isAcceptingJobs
      ? 'border-[#52B69A] bg-[#E8F5F1]'
      : 'border-[#E0E0E5] bg-[#F3F3F5]'
    : 'border-[#E0E0E5] bg-[#F3F3F5]';

  const receptionBadgeClass = isKycVerified
    ? isAcceptingJobs
      ? 'bg-[#52B69A] text-white'
      : 'bg-[#A0A0AB] text-white'
    : 'bg-[#A0A0AB] text-white';

  const receptionToggleClass = isKycVerified
    ? isAcceptingJobs
      ? 'bg-[#52B69A]'
      : 'bg-[#CBCED4]'
    : 'cursor-not-allowed bg-[#CBCED4]';

  const receptionStatusLabel = isKycVerified
    ? isAcceptingJobs
      ? 'กำลังรับงาน'
      : 'ไม่รับงาน'
    : 'ยังไม่พร้อม';

  const receptionTitle = isKycVerified
    ? isAcceptingJobs
      ? 'คุณกำลังรับงาน'
      : 'คุณไม่รับงานอยู่ตอนนี้'
    : 'เริ่มต้นเปิดใช้งานการรับงาน';

  const receptionDescription = isKycVerified
    ? isAcceptingJobs
      ? 'ผู้ดูแลจะเห็นโปรไฟล์ของคุณและสามารถจองได้'
      : 'โปรไฟล์จะไม่ปรากฏในการค้นหา เปิดเมื่อพร้อม'
    : 'พร้อมใช้งานหลังยืนยันตัวตน';

  const handleToggleReception = async () => {
    if (!isKycVerified || updatingSearchable) {
      return;
    }

    const previousValue = isAcceptingJobs;
    const nextValue = !previousValue;

    setOptimisticIsSearchable(nextValue);
    setJobReceptionError(null);

    try {
      await setCaregiverSearchable({
        variables: { isSearchable: nextValue },
        refetchQueries: [{ query: GET_CAREGIVER_PROFILE }],
        awaitRefetchQueries: true,
      });
      setOptimisticIsSearchable(null);
      showSuccess(nextValue ? 'เปิดรับงานแล้ว' : 'ปิดรับงานแล้ว');
    } catch (error) {
      setOptimisticIsSearchable(previousValue);
      const fallbackMessage = 'ไม่สามารถอัปเดตสถานะการรับงานได้';
      const errorMessage = error instanceof Error ? error.message : fallbackMessage;
      setJobReceptionError(errorMessage || fallbackMessage);
      showError(fallbackMessage);
    }
  };

  const toggleJobReceptionChecklist = (key: JobReceptionChecklistKey) => {
    if (!isAcceptingJobs) {
      return;
    }

    setJobReceptionChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (caregiverLoading) {
    return (
      <div className="space-y-6">
        <div className="h-40 bg-white rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showKycWarning && (
        <div className="relative overflow-hidden rounded-[10px] border border-[#F2D2A4] bg-white p-5">
          <div className="absolute inset-y-0 left-0 w-2.5 bg-[#E09721]" />
          <div className="flex items-center justify-between gap-4 pl-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF6E8] text-[#E09721]">
                <Icon name="warning" variant="outlined" size="medium" color="currentColor" />
              </span>
              <div>
                <p className="text-[20px] font-semibold text-[#0A0A0A]">ยังไม่ได้ยืนยันตัวตน</p>
                <p className="text-[15px] text-[#717182]">คุณต้องยืนยันตัวตนก่อนจึงจะเปิดรับงานได้</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/kyc')}
              className="rounded-[10px] bg-[#0D9488] px-6 py-3 text-[16px] font-bold text-white transition-colors hover:bg-[#0b7f74]"
            >
              เริ่มยืนยันตัวตน
            </button>
          </div>
        </div>
      )}

      <div className={`rounded-[10px] border p-6 ${receptionCardClass}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold ${receptionBadgeClass}`}>
            {isKycVerified && isAcceptingJobs && (
              <span className="h-2 w-2 rounded-full bg-white/80" />
            )}
            {receptionStatusLabel}
          </span>

          <button
            type="button"
            onClick={handleToggleReception}
            disabled={!isKycVerified || updatingSearchable}
            aria-label="สลับสถานะการรับงาน"
            className={`relative h-8 w-14 rounded-full transition-colors ${receptionToggleClass}`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
                isKycVerified && isAcceptingJobs ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <h2 className="text-[24px] font-semibold text-[#0A0A0A]">{receptionTitle}</h2>
        <p className="mt-2 text-[14px] text-[#717182]">{receptionDescription}</p>
      </div>

      {isKycVerified && (
        <div className="rounded-[10px] border border-[#E8EBEF] bg-white p-6">
          <div className="space-y-4">
            {[
              { key: 'profileVisible' as const, label: 'โปรไฟล์แสดงในหน้าค้นหา' },
              { key: 'jobAlerts' as const, label: 'รับการแจ้งเตือนเมื่อมีงาน' },
              { key: 'pauseAnytime' as const, label: 'ปิดรับงานได้ทุกเมื่อ' },
            ].map((item) => (
              <label
                key={item.key}
                className={`flex items-center gap-3 ${
                  isAcceptingJobs ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
                }`}
              >
                <input
                  type="checkbox"
                  checked={jobReceptionChecklist[item.key]}
                  onChange={() => toggleJobReceptionChecklist(item.key)}
                  disabled={!isAcceptingJobs}
                  className="h-5 w-5 rounded border-[#CBCED4] text-[#52B69A] accent-[#52B69A]"
                  aria-label={item.label}
                />
                <span
                  className={`text-[16px] ${
                    jobReceptionChecklist[item.key] ? 'text-[#0A0A0A]' : 'text-[#919497]'
                  }`}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {jobReceptionError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-600">
          {jobReceptionError}
        </p>
      )}
    </div>
  );
};
