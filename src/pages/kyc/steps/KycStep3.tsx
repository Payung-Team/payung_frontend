import { useState } from 'react';
import { useKyc } from '../../../context/KycContext';
import { useAuth } from '../../../context/AuthContext';

// ── Stepper (shared with Step1 pattern) ──────────────────────────────────
const STEPS = ['ข้อมูลส่วนตัว', 'เอกสาร', 'ตรวจสอบ'];

function KycStepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                  done || active ? 'bg-[#2D6A58] text-white' : 'bg-[#E2E8F0] text-[#717182]'
                }`}
              >
                {done ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 8L6.5 11.5L13 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  n
                )}
              </div>
              <span
                className={`text-xs font-medium ${active ? 'text-[#2D6A58]' : done ? 'text-[#2D6A58]' : 'text-[#717182]'}`}
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-24 h-0.5 mb-5 ${done ? 'bg-[#2D6A58]' : 'bg-[#E2E8F0]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function KycStep3() {
  const { goToStep, step1Data, uploadedDocs } = useKyc();
  const { user } = useAuth();
  const [isConsented, setIsConsented] = useState(false);

  const handleEditPersonalInfo = () => {
    goToStep(1);
  };

  const handleChangeFiles = () => {
    goToStep(2);
  };

  const handleSubmit = () => {
    // Final submission logic would go here
    console.log('Submitting KYC Data:', { step1Data, uploadedDocs });
    // For now, maybe just go to a success page or back to home
    // goToStep(4);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8F9FB] flex flex-col items-center py-12 px-4 gap-10">

      <div
        className="w-full max-w-[720px] bg-white rounded-[20px] border border-[#F1F5F9] p-12 flex flex-col gap-6"
        style={{
          boxShadow: '0px 12px 28px -6px rgba(15, 23, 43, 0.06), 0px 1px 2px rgba(15, 23, 43, 0.04)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col gap-1.5">
          <KycStepper current={3} />
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
            <InfoRow label="ชื่อ-นามสกุล" value={step1Data?.fullName || '-'} />
            <InfoRow label="เลขบัตรประชาชน" value={step1Data?.idCardNumber || '-'} />
            <InfoRow label="วันเกิด" value="-" /> {/* Not currently collected */}
            <InfoRow label="เพศ" value="-" /> {/* Not currently collected */}
            <InfoRow label="เบอร์โทรศัพท์" value={step1Data?.phone || '-'} />
            <InfoRow label="อีเมล" value={user?.email || '-'} border={false} />
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
                fileName={uploadedDocs.find(d => d.docType === 'id_card_front')?.fileName} 
             />
             <DocRow 
                label="รูปถ่ายคู่บัตร" 
                fileName={uploadedDocs.find(d => d.docType === 'id_card_selfie')?.fileName} 
             />
             <DocRow 
                label="ใบประกอบวิชาชีพ (ถ้ามี)" 
                fileName={uploadedDocs.find(d => d.docType === 'certificate')?.fileName} 
                border={false}
             />
          </div>
        </div>

        {/* Consent Box */}
        <button
          onClick={() => setIsConsented(!isConsented)}
          className={`w-full rounded-xl p-4 flex gap-3 text-left transition-all cursor-pointer ${
            isConsented ? 'bg-[#E0F6F1]' : 'bg-[#F8FAFC] border border-[#E2E8F0]'
          }`}
        >
          <div
            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
              isConsented ? 'bg-[#0F766E]' : 'bg-white border-2 border-[#CBD5E1]'
            }`}
          >
            {isConsented && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-[#F1F5F9]">
          <button
            onClick={() => goToStep(2)}
            className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] text-[#717182] text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ← ย้อนกลับ
          </button>
          <button
            type="button"
            disabled={!isConsented}
            onClick={handleSubmit}
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 ${
              isConsented
                ? 'bg-[#2D6A58] text-white hover:bg-[#255a4a] active:scale-[0.98] cursor-pointer'
                : 'bg-[#CBD5E1] text-white cursor-not-allowed'
            }`}
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ส่งข้อมูล
          </button>
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

function DocRow({ label, fileName, border = true }: { label: string; fileName?: string; border?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2.5 ${border ? 'border-b border-[#F1F5F9]' : ''}`}>
      <span className="text-[13px] font-medium text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {label}
      </span>
      <div className="bg-[#F1F5F9] rounded-lg px-2.5 py-1.5 flex items-center gap-2 min-w-[102px]">
        {fileName ? (
          <div className="flex items-center gap-2 overflow-hidden">
             <div className="w-5 h-5 bg-[#1B6B3A] rounded-sm flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2.5 5L4 6.5L7.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
             </div>
             <span className="text-[13px] font-medium text-[#334055] truncate max-w-[150px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {fileName}
             </span>
          </div>
        ) : (
          <span className="text-[13px] font-medium text-[#94A3B8]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
             ยังไม่ได้อัปโหลด
          </span>
        )}
      </div>
    </div>
  );
}
