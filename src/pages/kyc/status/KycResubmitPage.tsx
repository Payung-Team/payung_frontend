import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { GET_KYC_STATUS } from '../../../graphql/queries';
import { useKyc } from '../../../context/KycContext';
import Icon from '../../../components/ui/Icon';
import KycStep1 from '../steps/KycStep1';
import KycStep2 from '../steps/KycStep2';
import KycStep3 from '../steps/KycStep3';

export default function KycResubmitPage() {
  const navigate = useNavigate();
  const { setInitialData, step, goToStep } = useKyc();
  const { data, loading, error } = useQuery(GET_KYC_STATUS, {
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
        // Start at Step 1 for resubmission
        if (step === 0) goToStep(1);
        setIsReady(true);
      }
    }
  }, [data, loading, navigate, setInitialData, step, goToStep, isReady]);

  if (loading || !isReady) return <div className="min-h-screen flex items-center justify-center">กำลังโหลด...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">เกิดข้อผิดพลาด: {error.message}</div>;

  const rejectedReason = data?.kycStatus?.rejectedReason || 'ข้อมูลไม่ถูกต้อง';

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
        {rejectedReason && (
          <div className="w-full flex flex-col gap-[22px] pb-[22px] border-b border-black/10">
            <div className="flex flex-row justify-between items-center">
              <span className="font-bold text-[11px] text-[#6B7280] uppercase tracking-[0.88px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                รายการที่ต้องแก้ไข
              </span>
              <span className="bg-[#FEF2F2] rounded-full px-2 py-[2px] font-bold text-[11px] text-[#DC2626]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {rejectedReason.split('\n').filter(r => r.trim()).length} รายการ
              </span>
            </div>

            <div className="flex flex-col gap-[10px]">
              {rejectedReason.split('\n').filter(r => r.trim()).map((reason, index) => {
                // Try splitting by common separators: ":" or " — " or " - "
                const parts = reason.split(/[:—\-]/);
                const title = parts[0]?.trim() || reason;
                const desc = parts.length > 1 ? parts.slice(1).join('—').trim() : 'กรุณาตรวจสอบและแก้ไขข้อมูล';
                
                return (
                  <div 
                    key={index} 
                    className="flex flex-row items-center p-[12px_14px] gap-[12px] bg-[#F9EAEA] border border-[#C62828] rounded-[12px] cursor-pointer hover:bg-[#FEE2E2] transition-colors group"
                  >
                    <div className="w-[26px] h-[26px] bg-[#FEF2F2] rounded-full flex items-center justify-center font-bold text-[12px] text-[#DC2626] flex-shrink-0" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                      {index + 1}
                    </div>
                    <div className="flex flex-col gap-[2px] flex-1">
                      <div className="font-semibold text-[13px] text-[#111827]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                        {title}
                      </div>
                      <div className="font-normal text-[11px] text-[#6B7280]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                        {desc}
                      </div>
                    </div>
                    <Icon 
                      name="chevron_right" 
                      style={{ fontSize: '16px', color: '#9CA3AF' }} 
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                );
              })}
            </div>
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
