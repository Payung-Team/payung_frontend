import { useRef, useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { useAuth } from '../../../context/AuthContext';
import { useKyc } from '../../../context/KycContext';
import { UPLOAD_KYC_DOCUMENT, DELETE_KYC_DOCUMENT } from '../../../graphql/queries';
import { supabase } from '../../../lib/supabase';
import AlertModal from '../../../components/ui/AlertModal';
import ImageModal from '../../../components/ui/ImageModal';
import Icon from '../../../components/ui/Icon';

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
                  <Icon name="check" color="white" style={{ fontSize: '18px' }} />
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

// ── Document type config ──────────────────────────────────────────────────
const DOC_TYPES = [
  {
    type: 'id_card_front',
    title: 'รูปบัตรประชาชน (ด้านหน้า)',
    desc: 'แตะเพื่อเลือกไฟล์หรือถ่ายรูป',
    required: true,
    icon: (
      <Icon name="credit_card" color="#2D6A58" style={{ fontSize: '22px' }} />
    ),
  },
  {
    type: 'id_card_selfie',
    title: 'รูปถ่ายคู่บัตรประชาชน',
    desc: 'แตะเพื่อเลือกไฟล์หรือถ่ายรูป',
    required: true,
    icon: (
      <Icon name="account_circle" color="#2D6A58" style={{ fontSize: '22px' }} />
    ),
  },
  {
    type: 'certificate',
    title: 'ใบประกอบวิชาชีพ (ถ้ามี)',
    desc: 'ไม่บังคับ · ถ้ามีจะช่วยให้ตรวจสอบเร็วขึ้น',
    required: false,
    icon: (
      <Icon name="description" color="#2D6A58" style={{ fontSize: '22px' }} />
    ),
  },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface DocState {
  status: UploadStatus;
  fileName?: string;
  error?: string;
}

// ── Upload Icon ───────────────────────────────────────────────────────────
function UploadIcon() {
  return <Icon name="file_upload" color="#717182" style={{ fontSize: '18px' }} />;
}

// ── Main Component ────────────────────────────────────────────────────────
export default function KycStep2({ mode = 'create' }: { mode?: 'create' | 'resubmit' }) {
  const { goToStep, saveDoc, removeDoc, uploadedDocs, initialDocs } = useKyc();
  const { user } = useAuth();
  
  const [docStates, setDocStates] = useState<Record<string, DocState>>(() => {
    const initial: Record<string, DocState> = {};
    DOC_TYPES.forEach((d) => {
      const existing = uploadedDocs.find((u) => u.docType === d.type);
      if (existing) {
        initial[d.type] = { status: 'success', fileName: existing.fileName };
      } else {
        initial[d.type] = { status: 'idle' };
      }
    });
    return initial;
  });

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadKycDocument] = useMutation(UPLOAD_KYC_DOCUMENT);
  const [deleteDocMutation] = useMutation(DELETE_KYC_DOCUMENT);

  // Alert/Confirmation Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'danger' | 'warning' | 'info' | 'success';
    confirmText?: string;
    showCancel?: boolean;
    docType?: string | null;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
    docType: null,
  });

  // Preview State
  const [preview, setPreview] = useState<{ isOpen: boolean; url: string; name: string }>({
    isOpen: false,
    url: '',
    name: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);

  // Sync internal docStates with context uploadedDocs (important for pre-fill)
  useEffect(() => {
    const newStates: Record<string, DocState> = {};
    DOC_TYPES.forEach((d) => {
      const existing = uploadedDocs.find((u) => u.docType === d.type);
      if (existing) {
        newStates[d.type] = { status: 'success', fileName: existing.fileName };
      } else {
        newStates[d.type] = { status: 'idle' };
      }
    });
    setDocStates(newStates);
  }, [uploadedDocs]);

  function setDocState(type: string, state: Partial<DocState>) {
    setDocStates((prev) => ({ ...prev, [type]: { ...prev[type], ...state } }));
  }

  async function handleFileChange(docType: string, file: File) {
    // Validate
    if (!ALLOWED_TYPES.includes(file.type)) {
      setDocState(docType, { status: 'error', error: 'รองรับเฉพาะ JPG, PNG, PDF' });
      return;
    }
    if (file.size > MAX_SIZE) {
      setDocState(docType, { status: 'error', error: 'ไฟล์ใหญ่เกิน 5 MB · ลองย่อขนาดแล้วอัปโหลดอีกครั้ง' });
      return;
    }

    setDocState(docType, { status: 'uploading', fileName: file.name, error: undefined });

    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user?.id ?? 'unknown'}/${Date.now()}-${docType}.${ext}`;

      const { error: storageError } = await supabase.storage
        .from('kyc-documents')
        .upload(path, file, { upsert: true });

      if (storageError) throw new Error(storageError.message);

      // Get clean public URL for storage in DB
      const { data: publicData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(path);
      const cleanUrl = publicData.publicUrl;

      // Get signed URL for immediate preview (expires in 1 hour)
      const { data: signedData } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(path, 3600);
      
      const previewUrl = signedData?.signedUrl || cleanUrl;

      const result = await uploadKycDocument({
        variables: {
          input: {
            docType,
            fileUrl: cleanUrl, // Save clean URL to DB
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          },
        },
      });

      const docId: string = result.data?.uploadKycDocument?.id;
      saveDoc({ docId, docType, fileName: file.name, fileUrl: previewUrl });
      setDocState(docType, { status: 'success', fileName: file.name });
    } catch (err: any) {
      setDocState(docType, {
        status: 'error',
        error: err?.message ?? 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่',
      });
    }
  }

  const handlePreview = async (docType: string, docTitle: string) => {
    const existing = uploadedDocs.find((u) => u.docType === docType);
    if (!existing) return;

    let url = existing.fileUrl;

    // Refresh signed URL for private bucket files
    if (url.includes('/kyc-documents/')) {
      try {
        const parts = url.split('/kyc-documents/');
        const path = parts.length > 1 ? parts[1].split('?')[0] : null;

        if (path) {
          const { data, error } = await supabase.storage
            .from('kyc-documents')
            .createSignedUrl(decodeURIComponent(path), 3600); // 1 hour
          
          if (data?.signedUrl) {
            url = data.signedUrl;
          }
        }
      } catch (err) {
        console.warn('Failed to refresh signed URL for preview:', err);
      }
    }

    setPreview({ isOpen: true, url, name: docTitle });
  };

  const handleDelete = (docType: string) => {
    const existing = uploadedDocs.find((u) => u.docType === docType);
    if (!existing) {
      setDocState(docType, { status: 'idle', fileName: undefined, error: undefined });
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'ยืนยันการลบเอกสาร?',
      message: 'การกระทำนี้ไม่สามารถย้อนกลับได้ เอกสารจะถูกลบออกจากระบบถาวร',
      variant: 'danger',
      confirmText: 'ยืนยันการลบ',
      showCancel: true,
      docType,
    });
  };

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false, docType: null }));
  };

  const handleConfirm = async () => {
    if (modalConfig.docType) {
      await confirmDelete(modalConfig.docType);
    } else {
      closeModal();
    }
  };

  const confirmDelete = async (docType: string) => {
    const existing = uploadedDocs.find((u) => u.docType === docType);
    if (!existing) return;

    setIsProcessing(true);
    try {
      // 1. Delete from Supabase Storage first if path exists
      // The path starts after the bucket name 'kyc-documents/'
      const parts = existing.fileUrl.split('/kyc-documents/');
      const path = parts.length > 1 ? parts[1].split('?')[0] : null;

      if (path) {
        const { error: storageError } = await supabase.storage
          .from('kyc-documents')
          .remove([decodeURIComponent(path)]); // decode in case of special chars
        if (storageError) console.warn('Storage delete warning:', storageError.message);
      }

      // 2. Delete from Database via GraphQL
      await deleteDocMutation({ variables: { documentId: existing.docId } });

      removeDoc(docType);
      setDocState(docType, { status: 'idle', fileName: undefined, error: undefined });
      closeModal();
    } catch (err) {
      console.error('Delete doc error:', err);
      setModalConfig({
        isOpen: true,
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถลบเอกสารได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
        variant: 'danger',
        confirmText: 'ตกลง',
        showCancel: false,
        docType: null,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Filter DOC_TYPES for resubmit mode: hide certificate if it wasn't uploaded initially
  const displayedDocTypes = mode === 'resubmit' 
    ? DOC_TYPES.filter(d => {
        if (d.type === 'certificate') {
          return uploadedDocs.some(u => u.docType === 'certificate');
        }
        return true;
      })
    : DOC_TYPES;

  const canProceed = displayedDocTypes.every((t) => {
    const state = docStates[t.type];
    return t.required ? state.status === 'success' : true;
  });

  return (
    <div className={mode === 'resubmit' ? '' : 'min-h-[calc(100vh-64px)] bg-[#F2F4F6] flex items-center justify-center px-4 py-10'}>
      <div
        className={mode === 'resubmit' ? 'w-full flex flex-col gap-[28px]' : 'w-[720px] bg-white rounded-[20px] border border-[#F1F5F9] px-14 py-12 flex flex-col gap-[28px]'}
        style={mode === 'resubmit' ? {} : {
          boxShadow: '0px 12px 28px -6px rgba(15, 23, 43, 0.06), 0px 1px 2px rgba(15, 23, 43, 0.04)',
        }}
      >
        <KycStepper current={2} />

        {mode !== 'resubmit' && (
          <div className="flex flex-col gap-1.5">
            <h2
              className="text-2xl font-bold text-[#0F172A] leading-[30px]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              อัปโหลดเอกสาร
            </h2>
            <p
              className="text-sm text-[#64748B] leading-[20px]"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              รองรับไฟล์ JPG, PNG, PDF ขนาดไม่เกิน 5 MB ต่อไฟล์
            </p>
          </div>
        )}

        {/* Document Upload Zones */}
        <div className={mode === 'resubmit' ? 'flex flex-col gap-[12px] w-full mb-8' : 'flex flex-col gap-3 mb-8'}>
          {displayedDocTypes.map((doc) => {
            const state = docStates[doc.type];
            const isSuccess = state.status === 'success';
            const isUploading = state.status === 'uploading';
            const isError = state.status === 'error';

            const isEdited = mode === 'resubmit' && (() => {
              const initial = initialDocs?.find(d => d.docType === doc.type);
              const current = uploadedDocs.find(d => d.docType === doc.type);
              return initial?.docId !== current?.docId;
            })();

            const containerClass = mode === 'resubmit'
              ? isEdited
                ? 'border border-[#10B981] bg-white'
                : 'border border-transparent bg-gray-200'
              : isSuccess
                ? 'border-2 border-[#0F766E] bg-[#E8F0EB]'
                : isError
                  ? 'border border-[#951E1E] bg-[#F9EAEA]'
                  : isUploading
                    ? 'border border-[#F1F5F9] bg-white'
                    : 'border border-dashed border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#2D6A58]';

            const iconBoxClass = mode === 'resubmit'
              ? isEdited
                ? 'bg-[#F0FDF4] border-[#10B981]'
                : 'bg-[#F3F4F6] border-transparent'
              : isSuccess 
                ? 'bg-[#E0F6F1] border-[#0F766E]' 
                : 'bg-white border-[#CBD5E1]';
            
            const checkIconColor = mode === 'resubmit' && isEdited
              ? '#10B981'
              : '#2D6A58';

            return (
              <div key={doc.type}>
                <div
                  className={`flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all ${containerClass}`}
                  style={{ height: '72px' }}
                >
                  {/* Doc Icon Box */}
                  <div 
                    className={`w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-[10px] border transition-colors ${iconBoxClass}`}
                  >
                    {isSuccess ? (
                      <Icon name="check_circle" color={checkIconColor} style={{ fontSize: '20px' }} />
                    ) : (
                      doc.icon
                    )}
                  </div>

                  {/* Text Information */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-[15px] font-semibold leading-[19px] ${
                        mode === 'resubmit' && !isEdited
                          ? 'text-[#4B5563]'
                          : isError ? 'text-[#C62828]' : 'text-[#0F172A]'
                      }`}
                      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                    >
                      {doc.title}
                    </p>
                    <p
                      className={`text-[13px] leading-[16px] truncate ${
                        mode === 'resubmit' && !isEdited
                          ? 'text-[#6B7280]'
                          : isError ? 'text-[#DC2626]' : 'text-[#64748B]'
                      }`}
                      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                    >
                      {isSuccess
                        ? state.fileName
                        : isUploading
                        ? 'กำลังอัปโหลด...'
                        : isError
                        ? state.error
                        : doc.desc}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* Upload/Retry Button */}
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileRefs.current[doc.type]?.click()}
                      className={`flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                        isError
                          ? 'w-[61px] h-9 bg-white border border-[#951E1E] rounded-lg'
                          : isUploading
                          ? 'w-9 h-9 opacity-40 cursor-not-allowed'
                          : isSuccess
                          ? 'hidden' // Button Hidden on success in some designs, or used as replace
                          : 'w-9 h-9 bg-white border border-[#E2E8F0] rounded-lg hover:border-[#2D6A58]'
                      }`}
                    >
                      {isUploading ? (
                        <Icon name="refresh" className="animate-spin" color="#2D6A58" style={{ fontSize: '16px' }} />
                      ) : isError ? (
                        /* icon-upload-danger */
                        <Icon name="file_upload" color="#C62828" style={{ fontSize: '18px' }} />
                      ) : (
                        <UploadIcon />
                      )}
                    </button>

                    {/* Delete/Trash Button */}
                    {(isSuccess || isError) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(doc.type)}
                        className="w-9 h-9 bg-white border border-[#E2E8F0] rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors cursor-pointer"
                      >
                         <Icon name="delete" color="#DC2626" style={{ fontSize: '18px' }} />
                      </button>
                    )}
                  </div>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    ref={(el) => { fileRefs.current[doc.type] = el; }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileChange(doc.type, file);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

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

        {/* Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-[#F1F5F9]">
          <button
            type="button"
            onClick={() => goToStep(1)}
            className="px-6 py-2.5 rounded-lg border border-[#E2E8F0] text-[#717182] text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ← ย้อนกลับ
          </button>
          <button
            type="button"
            disabled={!canProceed}
            onClick={() => goToStep(3)}
            className={`px-8 py-2.5 rounded-lg text-sm font-bold transition-all duration-150 ${
              canProceed
                ? 'bg-[#2D6A58] text-white hover:bg-[#255a4a] active:scale-[0.98] cursor-pointer'
                : 'bg-[#CBD5E1] text-white cursor-not-allowed shadow-none'
            }`}
            style={{ 
              fontFamily: "'Bai Jamjuree', sans-serif",
              boxShadow: canProceed ? '0px 4px 10px -2px rgba(15, 118, 110, 0.24)' : 'none'
            }}
          >
            ถัดไป →
          </button>
        </div>

        <AlertModal
          isOpen={modalConfig.isOpen}
          onClose={closeModal}
          onConfirm={handleConfirm}
          isLoading={isProcessing}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          variant={modalConfig.variant}
          showCancel={modalConfig.showCancel}
        />

        <ImageModal
          isOpen={preview.isOpen}
          onClose={() => setPreview(prev => ({ ...prev, isOpen: false }))}
          imageUrl={preview.url}
          title={preview.name}
        />
      </div>
    </div>
  );
}
