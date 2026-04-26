import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_KYC_STATUS, DELETE_KYC_DOCUMENT } from '../../../graphql/queries';

// ── Components ────────────────────────────────────────────────────────────

interface KycDocument {
  id: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  signedUrl?: string;
  mimeType: string;
}

interface DocumentItemProps {
  doc: KycDocument;
  canDelete?: boolean;
  onDelete?: (id: string) => void;
}

function DocumentItem({ doc, canDelete, onDelete }: DocumentItemProps) {
  const isPdf = doc.mimeType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf');
  
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-[#F1F5F9] rounded-xl hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        {/* Thumbnail or Icon */}
        <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#E2E8F0]">
          {isPdf ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 15L12 18L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            doc.signedUrl ? (
              <img src={doc.signedUrl} alt={doc.fileName} className="w-full h-full object-cover" />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-slate-400">
                <path d="M21 12V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 13L11 15L15 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="18" cy="18" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M20 20L22 22" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )
          )}
        </div>
        
        <div className="flex flex-col min-w-0">
          <span className="text-[14px] font-semibold text-[#0F172A] truncate max-w-[150px] sm:max-w-[200px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {doc.fileName}
          </span>
          <span className="text-[12px] text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {doc.docType === 'id_card_front' ? 'บัตรประชาชน' : doc.docType === 'id_card_selfie' ? 'รูปถ่ายคู่บัตร' : 'ใบรับรอง/อื่นๆ'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a 
          href={doc.signedUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 text-[#334055] hover:bg-[#F1F5F9] rounded-lg transition-colors"
          title="ดูไฟล์"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
        {canDelete && onDelete && (
          <button 
            onClick={() => onDelete(doc.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="ลบไฟล์"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[18px] h-[18px] bg-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 5L4.5 7L8 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-[12.5px] font-semibold text-[#111827]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {text}
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function KycStatusPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useQuery(GET_KYC_STATUS, {
    fetchPolicy: 'network-only'
  });
  const [deleteDoc] = useMutation(DELETE_KYC_DOCUMENT);

  const status = data?.kycStatus?.status;
  const submittedAt = data?.kycStatus?.submittedAt;
  const verifiedAt = data?.kycStatus?.verifiedAt;
  const rejectedReason = data?.kycStatus?.rejectedReason;
  const documents = data?.kycStatus?.documents || [];

  useEffect(() => {
    if (!loading && !data?.kycStatus) {
      // If no status at all, maybe redirect to start
      // navigate('/kyc');
    }
  }, [loading, data, navigate]);

  const handleDelete = async (id: string) => {
    if (window.confirm('ยืนยันการลบเอกสาร?')) {
      try {
        await deleteDoc({ variables: { documentId: id } });
        refetch();
      } catch (err) {
        console.error('Delete doc error:', err);
        alert('เกิดข้อผิดพลาดในการลบเอกสาร');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear() + 543;
    const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    return `${day} ${month} ${year} • ${time}`;
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F8F9FB] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#64748B] font-medium" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F8F9FB] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#F1F5F9] max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A] mb-2" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            เกิดข้อผิดพลาด
          </h2>
          <p className="text-[#64748B] mb-6" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ไม่สามารถดึงข้อมูลสถานะได้ กรุณาลองใหม่อีกครั้ง
          </p>
          <button 
            onClick={() => refetch()}
            className="w-full py-3 bg-[#0F766E] text-white font-bold rounded-xl hover:bg-[#0D635C] transition-colors"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F8F9FB] flex flex-col items-center py-12 px-4 md:px-0">
      
      {/* PENDING STATE */}
      {status === 'pending' && (
        <div className="w-full max-w-[720px] bg-white rounded-[20px] border border-[#F1F5F9] p-8 md:p-12 flex flex-col items-center gap-8 shadow-[0px_12px_28px_-6px_rgba(15,23,43,0.06),0px_1px_2px_rgba(15,23,43,0.04)]">
          {/* Status Icon */}
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#FFF5DC] rounded-full"></div>
            <div className="absolute w-16 h-16 bg-[#D97706] rounded-full flex items-center justify-center shadow-lg">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>

          {/* Title & Desc */}
          <div className="text-center space-y-2.5">
            <h1 className="text-[30px] font-bold text-[#0F172A] leading-tight" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              กำลังตรวจสอบข้อมูล
            </h1>
            <p className="max-w-[560px] text-[16px] text-[#64748B] leading-relaxed" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              เราได้รับข้อมูลเรียบร้อย ทีมงานจะใช้เวลาประมาณ 1–2 วันทำการ <br/> เราจะแจ้งผลผ่านอีเมลทันทีที่ตรวจสอบเสร็จ
            </p>
          </div>

          {/* Timeline / Status Steps */}
          <div className="w-full bg-[#F8FAFC] rounded-xl p-5 md:p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[14px] font-semibold text-[#334055]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                สถานะการตรวจสอบ
              </span>
            </div>

            <div className="space-y-0">
              {/* Step 1: Submitted */}
              <div className="flex gap-4 min-h-[64px]">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-[#0F766E]"></div>
                  <div className="w-0.5 h-full bg-[#0F766E] my-1 rounded-full"></div>
                </div>
                <div className="pb-4">
                  <p className="text-[14px] font-bold text-[#0F172A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ส่งข้อมูลเรียบร้อย</p>
                  <p className="text-[12px] text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>{formatDate(submittedAt)}</p>
                </div>
              </div>

              {/* Step 2: Reviewing */}
              <div className="flex gap-4 min-h-[64px]">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-[#D97706] ring-4 ring-[#FFF5DC]"></div>
                  <div className="w-0.5 h-full bg-[#E2E8F0] my-1 rounded-full"></div>
                </div>
                <div className="pb-4">
                  <p className="text-[14px] font-bold text-[#0F172A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ทีมงานกำลังตรวจสอบ</p>
                  <p className="text-[12px] text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ประมาณ 1–2 วันทำการ</p>
                </div>
              </div>

              {/* Step 3: Result */}
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-white border-1.5 border-[#CBD5E1]"></div>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#94A3B8]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>แจ้งผลทางอีเมล</p>
                  <p className="text-[12px] text-[#64748B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>รออยู่</p>
                </div>
              </div>
            </div>
          </div>

          {/* Document List (Read-only) */}
          <div className="w-full space-y-3">
            <h3 className="text-sm font-semibold text-[#1E293B]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>เอกสารที่คุณยื่น</h3>
            <div className="grid grid-cols-1 gap-3">
              {documents.map((doc: KycDocument) => (
                <DocumentItem key={doc.id} doc={doc} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto pt-4">
            <button 
              onClick={() => refetch()}
              className="flex items-center justify-center gap-2 px-7 py-3 bg-white border border-[#CBD5E1] rounded-xl text-[#334055] font-semibold hover:bg-[#F8FAFC] transition-colors w-full sm:w-[180px] cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              รีเฟรชสถานะ
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 px-7 py-3 bg-[#0F766E] text-white font-semibold rounded-xl shadow-[0px_4px_10px_-2px_rgba(15,118,110,0.24)] hover:bg-[#0D635C] transition-all w-full sm:w-[200px] cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              กลับหน้าหลัก
            </button>
          </div>
        </div>
      )}

      {/* VERIFIED STATE */}
      {status === 'verified' && (
        <div className="w-full max-w-[520px] bg-white rounded-[24px] p-10 flex flex-col items-center shadow-[0px_20px_40px_rgba(0,0,0,0.1)] relative">
          
          {/* Icon Halo */}
          <div className="relative mb-8">
            <div className="w-[100px] h-[100px] bg-[#16A34A] rounded-full flex items-center justify-center relative z-10">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <div className="absolute inset-[-8px] border-2 border-[#16A34A] opacity-22 rounded-[58px] z-0 animate-pulse"></div>
          </div>

          {/* Title & Desc */}
          <div className="text-center mb-6">
            <h1 className="text-[24px] font-bold text-[#111827] mb-2 tracking-[-0.24px]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ยืนยันตัวตนสำเร็จ
            </h1>
            <p className="max-w-[380px] text-[13px] text-[#6B7280] leading-[20px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              คุณได้รับสถานะผู้ดูแลที่ผ่านการยืนยัน สามารถเริ่มรับงานบน Payung ได้ทันที
            </p>
          </div>

          {/* Verified Badge Preview */}
          <div className="mb-8 p-1 px-1.5 pr-3 flex items-center gap-2 border border-dashed border-[#16A34A] rounded-full bg-white">
            <div className="w-7 h-7 bg-gradient-to-br from-[#FFEDD5] to-[#FDBA8C] rounded-full flex items-center justify-center text-[13px] font-bold text-[#E07856]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {(data?.kycStatus?.caregiver?.fullName?.[0] || 'ส').toUpperCase()}
            </div>
            <span className="text-[12px] font-semibold text-[#111827]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              {data?.kycStatus?.caregiver?.fullName || 'สมชาย ใจดี'}
            </span>
            <div className="flex items-center gap-1 bg-[#FEF2F2] px-2 py-0.5 rounded-full">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 5L4.5 7L8 3.5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[10px] font-bold text-[#16A34A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ยืนยันแล้ว</span>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="w-full bg-[#FEF2F2]/50 border border-[#CCFBF1] rounded-[14px] p-4.5 mb-6">
            <div className="flex items-center gap-1.5 mb-4 text-[#0F766E]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-[11px] font-bold tracking-[0.88px] uppercase" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>สิทธิ์ที่คุณได้รับ</span>
            </div>
            
            <div className="space-y-3">
              <BenefitItem text="แสดงเครื่องหมายยืนยันแล้ว บนโปรไฟล์ของคุณ" />
              <BenefitItem text="เริ่มรับงาน จากลูกค้าในพื้นที่ของคุณ" />
              <BenefitItem text="ปรากฏในผลการค้นหา ของลูกค้าที่ต้องการผู้ดูแล" />
            </div>
          </div>

          {/* Status Pill */}
          <div className="flex items-center gap-2.5 bg-[#FEF2F2] border border-[#DCFCE7] rounded-xl px-3.5 py-2.5 mb-8">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[#16A34A] rounded-full"></span>
              <span className="text-[12px] font-bold text-[#16A34A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>สถานะ: ยืนยันแล้ว</span>
            </div>
            <div className="w-px h-3.5 bg-[#DCFCE7]"></div>
            <span className="text-[12px] text-[#6B7280]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              อนุมัติเมื่อ {formatDate(verifiedAt)}
            </span>
          </div>

          {/* Actions */}
          <div className="w-full space-y-4">
            <button 
              onClick={() => navigate('/caregiver/availability')}
              className="w-full h-[52px] bg-[#0D9488] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#0B7A70] transition-all cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              เริ่มรับงานแรก
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <div className="text-center">
              <button 
                onClick={() => navigate('/profile')}
                className="text-[13px] font-semibold text-[#0D9488] hover:underline cursor-pointer"
                style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              >
                ไปที่หน้าโปรไฟล์ →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTED STATE */}
      {status === 'rejected' && (
        <div className="w-full max-w-[520px] bg-white rounded-[24px] p-10 flex flex-col items-center shadow-[0px_20px_40px_rgba(0,0,0,0.1)] relative">
          
          {/* Icon Halo (Pencil/Edit) */}
          <div className="relative mb-10 mt-2">
            <div className="w-[100px] h-[100px] bg-[#C62828] rounded-full flex items-center justify-center relative z-10 shadow-lg shadow-red-200">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.5 3.5L20.5 8.5L8.5 20.5H3.5V15.5L15.5 3.5Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.5 5.5L18.5 10.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="absolute inset-[-8px] border-2 border-[#C62828] opacity-10 rounded-[58px] z-0 animate-pulse"></div>
          </div>

          {/* Title & Desc */}
          <div className="text-center mb-8">
            <h1 className="text-[26px] font-bold text-[#0F172A] mb-3 tracking-[-0.02em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ต้องแก้ไขข้อมูลบางส่วน
            </h1>
            <p className="max-w-[340px] text-[13.5px] text-[#64748B] leading-[22px] mx-auto" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ทีมงานตรวจสอบข้อมูลของคุณแล้ว พบ 2 รายการที่ต้องแก้ไข กรุณาอัปเดตและส่งใหม่ ใช้เวลาไม่เกิน 5 นาที
            </p>
          </div>

          {/* Hint Box */}
          <div className="w-full flex items-center gap-3.5 p-4 bg-[#FFF7ED] border border-[#FFEDD5] rounded-[16px] mb-8">
            <div className="w-[28px] h-[28px] bg-[#F97316] rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div className="flex flex-col gap-0">
              <span className="text-[12.5px] font-bold text-[#111827]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ข้อมูลเดิมของคุณถูกบันทึกไว้แล้ว</span>
              <span className="text-[11.5px] text-[#4B5563]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>คุณแก้ไขเฉพาะรายการที่ต้องอัปเดต ไม่ต้องกรอกทั้งหมดใหม่</span>
            </div>
          </div>

          {/* Items to fix list */}
          <div className="w-full mb-10">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-[11px] font-bold tracking-[0.08em] text-[#94A3B8] uppercase" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>รายการที่ต้องแก้ไข</span>
              <div className="bg-[#FEF2F2] px-2.5 py-0.5 rounded-full">
                <span className="text-[11px] font-bold text-[#DC2626]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>2 รายการ</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-white border border-[#F1F5F9] rounded-[16px] hover:border-[#E2E8F0] transition-all cursor-pointer group">
                <div className="w-[26px] h-[26px] bg-[#FEF2F2] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[12px] font-bold text-[#DC2626]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>1</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#0F172A] mb-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>รูปบัตรประชาชน</p>
                  <p className="text-[11.5px] text-[#94A3B8] leading-[16px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    ภาพไม่ชัดเจน — ถ่ายใหม่ในที่แสงเพียงพอ ไม่มีเงาและไม่เอียง
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#94A3B8] transition-colors">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>

              <div className="flex items-center gap-4 p-4 bg-white border border-[#F1F5F9] rounded-[16px] hover:border-[#E2E8F0] transition-all cursor-pointer group">
                <div className="w-[26px] h-[26px] bg-[#FEF2F2] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[12px] font-bold text-[#DC2626]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>2</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#0F172A] mb-0.5" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>เลขบัตรประชาชน</p>
                  <p className="text-[11.5px] text-[#94A3B8] leading-[16px]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    ไม่ตรงกับข้อมูลในรูปบัตร — ตรวจสอบอีกครั้งก่อนส่ง
                  </p>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[#94A3B8] transition-colors">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="w-full flex gap-3">
            <button 
              onClick={() => window.open( '_blank')}
              className="flex-1 h-[52px] bg-white border border-[#0D9488] text-[#0D9488] text-[15px] font-bold rounded-[14px] flex items-center justify-center hover:bg-[#F0FDFA] transition-all cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ติดต่อซัพพอร์ต
            </button>
            <button 
              onClick={() => navigate('/kyc')}
              className="flex-1 h-[52px] bg-[#0D9488] text-white text-[15px] font-bold rounded-[14px] flex items-center justify-center gap-2 hover:bg-[#0B7A70] transition-all cursor-pointer shadow-md shadow-[#0D9488]/10"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ไปที่หน้าแก้ไข
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="12 5 19 12 12 19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
