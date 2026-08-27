import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { GET_KYC_STATUS } from '../../../graphql/queries';
import { Icon } from '../../../components/ui/Icon';
import Skeleton from '../../../components/ui/Skeleton';
import {
  PayoutSummaryCard,
  PayoutBackfillBanner,
  PayoutAccountModal,
  type PayoutAccountSummary,
} from '../../../features/kyc/PayoutAccountWidgets';

interface KycStatusData {
  kycStatus: {
    status: string;
    payoutAccount?: PayoutAccountSummary | null;
  };
}

export const BillingSettingsTab: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, refetch } = useQuery<KycStatusData>(GET_KYC_STATUS, {
    fetchPolicy: 'network-only',
  });
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);

  const kycStatus = data?.kycStatus?.status;
  const payoutAccount = data?.kycStatus?.payoutAccount ?? null;
  const kycVerifyPath = kycStatus === 'none' ? '/kyc' : '/kyc/status';

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="space-y-3">
        <Skeleton height={80} borderRadius="12px" />
      </div>
    );
  } else if (kycStatus !== 'verified') {
    content = (
      <div className="flex items-center gap-3.5 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[16px]">
        <div className="w-[28px] h-[28px] bg-[#94A3B8] rounded-full flex items-center justify-center flex-shrink-0">
          <Icon name="lock" color="white" style={{ fontSize: '16px' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#111827]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ต้องผ่านการยืนยันตัวตน (KYC) ก่อน
          </p>
          <p className="text-[12px] text-[#4B5563]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            เพิ่มบัญชีรับเงินได้หลังจากยืนยันตัวตนสำเร็จแล้วเท่านั้น
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(kycVerifyPath)}
          className="shrink-0 px-4 py-2 bg-[#0D9488] text-white text-[13px] font-bold rounded-lg hover:bg-[#0B7A70] transition-colors cursor-pointer"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          ไปที่หน้ายืนยันตัวตน
        </button>
      </div>
    );
  } else if (payoutAccount) {
    content = <PayoutSummaryCard payoutAccount={payoutAccount} onEdit={() => setIsPayoutModalOpen(true)} />;
  } else {
    content = <PayoutBackfillBanner onAdd={() => setIsPayoutModalOpen(true)} />;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-[20px] font-bold text-[#0A0A0A] mb-6">Billing</h2>

      {content}

      <PayoutAccountModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        onSaved={() => {
          setIsPayoutModalOpen(false);
          refetch();
        }}
      />
    </div>
  );
};
