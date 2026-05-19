import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { GET_KYC_STATUS } from '../../../graphql/queries';
import { useKyc } from '../../../context/KycContext';
import KycStep1 from '../steps/KycStep1';
import KycStep2 from '../steps/KycStep2';
import KycStep3 from '../steps/KycStep3';
import KycRejectionList from '../../../components/ui/KycRejectionList';

export default function KycResubmitPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setInitialData, step, goToStep } = useKyc();
  const { data, loading, error } = useQuery<any>(GET_KYC_STATUS, {
    fetchPolicy: 'network-only',
  });

  const [isReady, setIsReady] = useState(false);

  // Guard & Initial Data
  useEffect(() => {
    if (!loading && data && !isReady) {
      const kyc = data.kycStatus;
      const status = kyc?.status;

      if (status && status !== 'rejected') {
        navigate('/kyc/status');
        return;
      }

      // Pre-fill context with existing data
      if (kyc?.caregiver) {
        const caregiver = kyc.caregiver;
        const [firstName, ...rest] = (caregiver.fullName || '').split(' ');
        const lastName = rest.join(' ');

        setInitialData({
          step1: {
            firstName: firstName || '',
            lastName: lastName || '',
            birthDate: caregiver.dateOfBirth ? caregiver.dateOfBirth.split('T')[0] : '',
            gender: caregiver.gender || '',
            idCardNumber: caregiver.idCardNumber || '',
            phone: caregiver.phone || '',
            skills: caregiver.skills || [],
            experienceYears: caregiver.experienceYears || 0,
            hourlyRate: caregiver.hourlyRate || 0,
            bio: caregiver.bio || '',
          },
          docs: (kyc.documents || []).map((d: any) => ({
            docId: d.id,
            docType: d.docType,
            fileName: d.fileName,
            fileUrl: d.signedUrl || d.fileUrl,
          })),
        });
        // Start at target step if provided in route state, otherwise Step 1
        const targetStep = location.state?.step || 1;
        goToStep(targetStep);
        setIsReady(true);
      }
    }
  }, [data, loading, navigate, location.state, setInitialData, step, goToStep, isReady]);

  if (loading || !isReady) return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">เกิดข้อผิดพลาด: {error.message}</div>;

  const kyc = data?.kycStatus;
  const rejectionReasons = kyc?.caregiver?.rejectionReasons || [];
  const rejectedReason = kyc?.rejectedReason;

  const handleItemClick = (reason: any) => {
    let targetStep = 1;
    if (reason.documentType === 'ข้อมูลส่วนตัว') {
      targetStep = 1;
    } else if (reason.documentType === 'บัตรประชาชน' || reason.documentType === 'รูปถ่ายคู่บัตรประชาชน') {
      targetStep = 2;
    } else if (reason.documentType === 'ใบรับรองอบรม') {
      targetStep = 3;
    }
    goToStep(targetStep);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center py-[48px] px-4">
      <div
        className="w-full max-w-[720px] bg-white border border-[#F1F5F9] rounded-[20px] p-[48px_56px] flex flex-col gap-[28px]"
        style={{
          boxShadow: '0px 12px 28px -6px rgba(15, 23, 43, 0.06), 0px 1px 2px rgba(15, 23, 43, 0.04)'
        }}
      >

        {/* Header Section */}
        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[30px] font-bold text-[#0F172A] leading-[30px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            แก้ไขข้อมูลยืนยันตัวตน
          </h1>
          <p className="text-[14px] text-[#64748B] leading-[20px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            กรุณาแก้ไขข้อมูลตามรายการที่ถูกปฏิเสธด้านล่าง
          </p>
        </div>

        {/* Rejection Alert Section */}
        {(rejectionReasons.length > 0 || rejectedReason) && (
          <div className="w-full pb-4 border-b border-[#E2E8F0] mb-2">
            <KycRejectionList 
              rejectionReasons={rejectionReasons} 
              rejectedReason={rejectedReason} 
              onItemClick={handleItemClick}
            />
          </div>
        )}

        {/* Steps Content - Render based on context step */}
        <div className="w-full">
          {step === 1 && <KycStep1 mode="resubmit" />}
          {step === 2 && <KycStep2 mode="resubmit" />}
          {step === 3 && <KycStep3 mode="resubmit" />}
        </div>
      </div>
    </div>
  );
}
