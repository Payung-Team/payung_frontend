import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useAuth } from '../../../context/AuthContext';
import { useKyc } from '../../../context/KycContext';
import { UPLOAD_KYC_DOCUMENT } from '../../../graphql/queries';
import { supabase } from '../../../lib/supabase';

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

// ── Document type config ──────────────────────────────────────────────────
const DOC_TYPES = [
  {
    type: 'id_card_front',
    title: 'รูปบัตรประชาชน (ด้านหน้า)',
    desc: 'แตะเพื่อเลือกไฟล์หรือถ่ายรูป',
    required: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="1" y="4" width="20" height="14" rx="2" stroke="#2D6A58" strokeWidth="1.5" />
        <circle cx="7" cy="10" r="2" stroke="#2D6A58" strokeWidth="1.5" />
        <path d="M12 9h5M12 12h3" stroke="#2D6A58" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'id_card_selfie',
    title: 'รูปถ่ายคู่บัตรประชาชน',
    desc: 'แตะเพื่อเลือกไฟล์หรือถ่ายรูป',
    required: true,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="9" cy="8" r="3" stroke="#2D6A58" strokeWidth="1.5" />
        <path d="M3 18c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#2D6A58" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="14" y="12" width="6" height="6" rx="1" stroke="#2D6A58" strokeWidth="1.5" />
        <path d="M16 14h2M16 16h1" stroke="#2D6A58" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    type: 'certificate',
    title: 'ใบประกอบวิชาชีพ (ถ้ามี)',
    desc: 'ไม่บังคับ · ถ้ามีจะช่วยให้ตรวจสอบเร็วขึ้น',
    required: false,
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3" y="2" width="14" height="18" rx="2" stroke="#2D6A58" strokeWidth="1.5" />
        <path d="M7 7h8M7 11h8M7 15h5" stroke="#2D6A58" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
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
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 13v1.5A1.5 1.5 0 004.5 16h9a1.5 1.5 0 001.5-1.5V13" stroke="#717182" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 11V3m0 0L6 6m3-3l3 3" stroke="#717182" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function KycStep2() {
  const { goToStep, saveDoc, uploadedDocs } = useKyc();
  const { user } = useAuth();
  const [docStates, setDocStates] = useState<Record<string, DocState>>(() => {
    const initial: Record<string, DocState> = {};
    DOC_TYPES.forEach((d) => {
      const existing = uploadedDocs.find((u) => u.docType === d.type);
      initial[d.type] = existing
        ? { status: 'success', fileName: existing.fileName }
        : { status: 'idle' };
    });
    return initial;
  });

  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [uploadKycDocument] = useMutation(UPLOAD_KYC_DOCUMENT);

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
      setDocState(docType, { status: 'error', error: 'ไฟล์ต้องไม่เกิน 5 MB' });
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

      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(path);

      const result = await uploadKycDocument({
        variables: {
          input: {
            docType,
            fileUrl: urlData.publicUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
          },
        },
      });

      const docId: string = result.data?.uploadKycDocument?.id;
      saveDoc({ docId, docType, fileName: file.name });
      setDocState(docType, { status: 'success', fileName: file.name });
    } catch (err: any) {
      setDocState(docType, {
        status: 'error',
        error: err?.message ?? 'อัปโหลดไม่สำเร็จ กรุณาลองใหม่',
      });
    }
  }

  const requiredTypes = DOC_TYPES.filter((d) => d.required).map((d) => d.type);
  const canProceed = requiredTypes.every((t) => docStates[t]?.status === 'success');

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#F2F4F6] flex items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-[780px] bg-white rounded-3xl border border-[#F1F5F9] px-12 py-10"
        style={{
          boxShadow: '0 12px 28px -6px rgba(15,23,43,0.06), 0 1px 2px 0 rgba(15,23,43,0.04)',
        }}
      >
        <KycStepper current={2} />

        <h2
          className="text-2xl font-bold text-[#0A0A0A] mb-1"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          อัปโหลดเอกสาร
        </h2>
        <p
          className="text-sm text-[#717182] mb-8"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          รองรับไฟล์ JPG, PNG, PDF ขนาดไม่เกิน 5 MB ต่อไฟล์
        </p>

        {/* Document Upload Zones */}
        <div className="flex flex-col gap-3 mb-8">
          {DOC_TYPES.map((doc) => {
            const state = docStates[doc.type];
            const isSuccess = state.status === 'success';
            const isUploading = state.status === 'uploading';

            return (
              <div key={doc.type}>
                <div
                  className={`flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-dashed transition-colors ${
                    isSuccess
                      ? 'border-[#2D6A58] bg-[#F0FAF6]'
                      : state.status === 'error'
                      ? 'border-red-400 bg-red-50'
                      : 'border-[#CBD5E1] bg-white hover:border-[#2D6A58]'
                  }`}
                >
                  {/* Doc Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#F0FAF6] border border-[#E2E8F0] flex items-center justify-center flex-shrink-0">
                    {isSuccess ? (
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <circle cx="10" cy="10" r="9" fill="#2D6A58" />
                        <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      doc.icon
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold ${isSuccess ? 'text-[#2D6A58]' : 'text-[#0A0A0A]'}`}
                      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                    >
                      {doc.title}
                    </p>
                    <p
                      className="text-xs text-[#717182] truncate"
                      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                    >
                      {isSuccess
                        ? state.fileName
                        : isUploading
                        ? 'กำลังอัปโหลด...'
                        : doc.desc}
                    </p>
                  </div>

                  {/* Upload Button */}
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileRefs.current[doc.type]?.click()}
                    className={`w-9 h-9 rounded-lg border border-[#E2E8F0] flex items-center justify-center flex-shrink-0 transition-colors ${
                      isUploading
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:border-[#2D6A58] hover:bg-[#F0FAF6] cursor-pointer'
                    }`}
                  >
                    {isUploading ? (
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="#CBD5E1" strokeWidth="2" />
                        <path d="M8 2a6 6 0 016 6" stroke="#2D6A58" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <UploadIcon />
                    )}
                  </button>

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

                {/* Error message */}
                {state.status === 'error' && state.error && (
                  <p
                    className="mt-1 text-xs text-red-500 pl-1"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                  >
                    {state.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center">
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
                : 'bg-[#CBD5E1] text-white cursor-not-allowed'
            }`}
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ถัดไป →
          </button>
        </div>
      </div>
    </div>
  );
}
