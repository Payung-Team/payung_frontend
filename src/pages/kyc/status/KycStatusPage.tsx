import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { GET_KYC_STATUS } from '../../../graphql/queries';
import Icon from '../../../components/ui/Icon';
import ImageModal from '../../../components/ui/ImageModal';
import Skeleton from '../../../components/ui/Skeleton';
import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import KycRejectionList from '../../../components/ui/KycRejectionList';

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
  onPreview: (url: string, name: string) => void;
}

function DocumentItem({ doc, onPreview }: DocumentItemProps) {
  const isPdf = doc.mimeType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf');

  const handleView = () => {
    if (isPdf) {
      window.open(doc.signedUrl || doc.fileUrl, '_blank');
    } else {
      onPreview(doc.signedUrl || doc.fileUrl, doc.fileName);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-[#F1F5F9] rounded-xl hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        {/* Thumbnail or Icon */}
        <div className="w-10 h-10 rounded-lg bg-[#F8FAFC] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[#E2E8F0]">
          {isPdf ? (
            <Icon name="picture_as_pdf" color="#EF4444" size="large" />
          ) : (
            (doc.signedUrl || doc.fileUrl) ? (
              <img src={doc.signedUrl || doc.fileUrl} alt={doc.fileName} className="w-full h-full object-cover" />
            ) : (
              <Icon name="image" color="#94A3B8" size="large" />
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
        <button
          onClick={handleView}
          className="flex items-center gap-2 px-4 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all cursor-pointer group"
          title={isPdf ? "เปิด PDF" : "ดูรูปภาพ"}
        >
          <Icon name="visibility" size="small" color="#64748B" className="group-hover:text-[#0F172A] transition-colors" />
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ดูตัวอย่าง</span>
        </button>
      </div>
    </div>
  );
}

function BenefitItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[18px] h-[18px] bg-[#16A34A] rounded-full flex items-center justify-center flex-shrink-0">
        <Icon name="check" color="white" style={{ fontSize: '12px' }} />
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
  const { data, loading, error, refetch } = useQuery<any>(GET_KYC_STATUS, {
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });

  // Refetch signed URLs ทุกครั้งที่ผู้ใช้กลับมาที่ tab/window นี้
  // (ป้องกัน signed URL หมดอายุเมื่อเปิด tab ทิ้งไว้นาน)
  useEffect(() => {
    const handleFocus = () => refetch();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetch]);

  // Preview State
  const [preview, setPreview] = useState<{ isOpen: boolean; url: string; name: string }>({
    isOpen: false,
    url: '',
    name: '',
  });

  const handlePreview = (url: string, name: string) => {
    setPreview({ isOpen: true, url, name });
  };

  const handleItemClick = (reason: any) => {
    let targetStep = 1;
    if (reason.documentType === 'ข้อมูลส่วนตัว') {
      targetStep = 1;
    } else if (reason.documentType === 'บัตรประชาชน' || reason.documentType === 'รูปถ่ายคู่บัตรประชาชน') {
      targetStep = 2;
    } else if (reason.documentType === 'ใบรับรองอบรม') {
      targetStep = 3;
    }
    navigate('/kyc/resubmit', { state: { step: targetStep } });
  };

  const status = data?.kycStatus?.status;
  const submittedAt = data?.kycStatus?.submittedAt;
  const verifiedAt = data?.kycStatus?.verifiedAt;
  const rejectedReason = data?.kycStatus?.rejectedReason;
  const rejectionReasons = data?.kycStatus?.caregiver?.rejectionReasons || [];
  const rawDocuments = data?.kycStatus?.documents || [];

  const [refreshedDocs, setRefreshedDocs] = useState<KycDocument[]>([]);

  // Refresh signed URLs for all documents
  useEffect(() => {
    const refreshAll = async () => {
      const updated = await Promise.all(rawDocuments.map(async (doc: any) => {
        if (doc.fileUrl.includes('/kyc-documents/') || doc.signedUrl?.includes('/kyc-documents/')) {
          try {
            const urlToSplit = doc.signedUrl || doc.fileUrl;
            const parts = urlToSplit.split('/kyc-documents/');
            const path = parts.length > 1 ? parts[1].split('?')[0] : null;
            if (path) {
              const { data: signData } = await supabase.storage
                .from('kyc-documents')
                .createSignedUrl(decodeURIComponent(path), 3600);
              if (signData?.signedUrl) {
                return { ...doc, signedUrl: signData.signedUrl };
              }
            }
          } catch (err) {
            console.warn('Failed to refresh URL in Status Page:', err);
          }
        }
        return doc;
      }));
      setRefreshedDocs(updated);
    };

    if (rawDocuments.length > 0) {
      refreshAll();
    }
  }, [rawDocuments]);

  const documents = refreshedDocs.length > 0 ? refreshedDocs : rawDocuments;

  useEffect(() => {
    if (!loading && !data?.kycStatus) {
      // If no status at all, maybe redirect to start
      // navigate('/kyc');
    }
  }, [loading, data, navigate]);

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
      <div className="min-h-[calc(100vh-64px)] bg-[#F8F9FB] px-4 py-8" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        <div className="max-w-2xl mx-auto space-y-5">
          <Skeleton width={80} height={20} borderRadius="6px" />
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton width={64} height={64} circle />
              <div className="flex-1 space-y-2">
                <Skeleton width={140} height={20} borderRadius="6px" />
                <Skeleton width={200} height={14} borderRadius="6px" />
              </div>
              <Skeleton width={90} height={28} borderRadius="20px" />
            </div>
            <Skeleton height={1} borderRadius="0px" style={{ background: '#F1F5F9' }} />
            <Skeleton height={14} borderRadius="6px" />
            <Skeleton width="60%" height={14} borderRadius="6px" />
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <Skeleton width={120} height={18} borderRadius="6px" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton width={40} height={40} borderRadius="8px" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton height={14} borderRadius="4px" />
                  <Skeleton width="40%" height={12} borderRadius="4px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#F8F9FB] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#F1F5F9] max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <Icon name="error_outline" size="large" style={{ fontSize: '32px' }} />
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
              <Icon name="schedule" color="white" style={{ fontSize: '36px' }} />
            </div>
          </div>

          {/* Title & Desc */}
          <div className="text-center space-y-2.5">
            <h1 className="text-[30px] font-bold text-[#0F172A] leading-tight" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              กำลังตรวจสอบข้อมูล
            </h1>
            <p className="max-w-[560px] text-[16px] text-[#64748B] leading-relaxed" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              เราได้รับข้อมูลเรียบร้อย ทีมงานจะใช้เวลาประมาณ 1–2 วันทำการ <br /> เราจะแจ้งผลผ่านอีเมลทันทีที่ตรวจสอบเสร็จ
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
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  onPreview={handlePreview}
                />
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
              <Icon name="refresh" color="currentColor" style={{ fontSize: '18px' }} />
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

      {/* Image Preview Modal */}
      <ImageModal
        isOpen={preview.isOpen}
        onClose={() => setPreview(prev => ({ ...prev, isOpen: false }))}
        imageUrl={preview.url}
        title={preview.name}
      />

      {/* VERIFIED STATE */}
      {status === 'verified' && (
        <div className="w-full max-w-[520px] bg-white rounded-[24px] p-10 flex flex-col items-center shadow-[0px_20px_40px_rgba(0,0,0,0.1)] relative">

          {/* Icon Halo */}
          <div className="relative mb-8">
            <div className="w-[100px] h-[100px] bg-[#16A34A] rounded-full flex items-center justify-center relative z-10">
              <Icon name="verified_user" color="white" style={{ fontSize: '44px' }} />
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
          <div className="mb-8 flex flex-col items-center gap-2 border border-dashed border-[#16A34A] rounded-[16px] bg-white p-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-[#FFEDD5] to-[#FDBA8C] rounded-full flex items-center justify-center text-[13px] font-bold text-[#E07856]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {(data?.kycStatus?.caregiver?.fullName?.[0] || 'ส').toUpperCase()}
              </div>
              <span className="text-[12px] font-semibold text-[#111827]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                {data?.kycStatus?.caregiver?.fullName || 'สมชาย ใจดี'}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-[#FEF2F2] px-2 py-0.5 rounded-full">
              <Icon name="check" color="#16A34A" style={{ fontSize: '12px', fontWeight: 'bold' }} />
              <span className="text-[10px] font-bold text-[#16A34A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ยืนยันแล้ว</span>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="w-full bg-[#FEF2F2]/50 border border-[#CCFBF1] rounded-[14px] p-4.5 mb-6">
            <div className="flex items-center gap-1.5 mb-4 text-[#0F766E]">
              <Icon name="star" color="currentColor" style={{ fontSize: '14px' }} />
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
              <Icon name="add" color="white" style={{ fontSize: '18px' }} />
            </button>
            <div className="text-center">
              <button
                onClick={() => navigate('/caregiver/settings/account')}
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
              <Icon name="edit" color="white" style={{ fontSize: '44px' }} />
            </div>
            <div className="absolute inset-[-8px] border-2 border-[#C62828] opacity-10 rounded-[58px] z-0 animate-pulse"></div>
          </div>

          {/* Title & Desc */}
          <div className="text-center mb-8">
            <h1 className="text-[26px] font-bold text-[#0F172A] mb-3 tracking-[-0.02em]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ต้องแก้ไขข้อมูลบางส่วน
            </h1>
            <p className="max-w-[340px] text-[13.5px] text-[#64748B] leading-[22px] mx-auto" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ทีมงานตรวจสอบข้อมูลของคุณแล้ว พบ {rejectionReasons.length > 0 ? `${rejectionReasons.length} รายการ` : 'ข้อมูลบางส่วน'}ที่ต้องแก้ไข กรุณาอัปเดตและส่งใหม่ ใช้เวลาไม่เกิน 5 นาที
            </p>
          </div>

          {/* Hint Box */}
          <div className="w-full flex items-center gap-3.5 p-4 bg-[#FFF7ED] border border-[#FFEDD5] rounded-[16px] mb-8">
            <div className="w-[28px] h-[28px] bg-[#F97316] rounded-full flex items-center justify-center flex-shrink-0">
              <Icon name="info" color="white" style={{ fontSize: '16px' }} />
            </div>
            <div className="flex flex-col gap-0">
              <span className="text-[12.5px] font-bold text-[#111827]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>ข้อมูลเดิมของคุณถูกบันทึกไว้แล้ว</span>
              <span className="text-[11.5px] text-[#4B5563]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>คุณแก้ไขเฉพาะรายการที่ต้องอัปเดต ไม่ต้องกรอกทั้งหมดใหม่</span>
            </div>
          </div>

          {/* Items to fix list */}
          <KycRejectionList 
            rejectionReasons={rejectionReasons} 
            rejectedReason={rejectedReason} 
            onItemClick={handleItemClick}
          />

          {/* Actions */}
          <div className="w-full flex gap-3">
            <button
              onClick={() => window.open('_blank')}
              className="flex-1 h-[52px] bg-white border border-[#0D9488] text-[#0D9488] text-[15px] font-bold rounded-[14px] flex items-center justify-center hover:bg-[#F0FDFA] transition-all cursor-pointer"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ติดต่อซัพพอร์ต
            </button>
            <button
              onClick={() => navigate('/kyc/resubmit')}
              className="flex-1 h-[52px] bg-[#0D9488] text-white text-[15px] font-bold rounded-[14px] flex items-center justify-center gap-2 hover:bg-[#0B7A70] transition-all cursor-pointer shadow-md shadow-[#0D9488]/10"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              ไปที่หน้าแก้ไข
              <Icon name="arrow_forward" color="white" style={{ fontSize: '18px' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
