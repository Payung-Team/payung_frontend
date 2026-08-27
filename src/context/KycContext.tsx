import { createContext, useContext, useState, type ReactNode } from 'react';

export interface KycStep1Data {
  firstName: string;
  lastName: string;
  birthDate: string; // ISO format or YYYY-MM-DD
  gender: string;
  idCardNumber: string;
  phone: string;
  skills: string[];
  experienceYears: number;
  hourlyRate: number;
  bio: string;
}

export interface UploadedDoc {
  docId: string;
  docType: string;
  fileName: string;
  fileUrl: string;
}

/** PYG-266: บัญชีธนาคารรับเงิน — เลขบัญชีเข้ารหัสฝั่ง backend ไม่มีทาง prefill ค่าจริงกลับมาได้ */
export interface PayoutData {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

/** ข้อมูลบัญชีเดิม (masked) ที่ backend ส่งกลับมาตอนโหลดหน้า resubmit/status — ไม่มีเลขบัญชีเต็ม */
export interface InitialPayoutSummary {
  bankCode: string;
  accountName: string;
  accountNumberLast4: string;
}

interface KycContextType {
  step: number; // 0 = intro, 1 = step1, 2 = step2 (docs), 3 = step3 (payout), 4 = step4 (review)
  step1Data: KycStep1Data | null;
  uploadedDocs: UploadedDoc[];
  payoutData: PayoutData | null;
  initialStep1Data: KycStep1Data | null;
  initialDocs: UploadedDoc[];
  initialPayoutData: InitialPayoutSummary | null;
  pendingDeleteDocs: UploadedDoc[];
  goToStep: (step: number) => void;
  saveStep1: (data: KycStep1Data) => void;
  savePayout: (data: PayoutData | null) => void;
  saveDoc: (doc: UploadedDoc) => void;
  removeDoc: (docType: string) => void;
  addPendingDeleteDoc: (doc: UploadedDoc) => void;
  clearPendingDeleteDocs: () => void;
  setInitialData: (data: {
    step1: KycStep1Data;
    docs: UploadedDoc[];
    payout?: InitialPayoutSummary | null;
  }) => void;
}

const KycContext = createContext<KycContextType | undefined>(undefined);

export function KycProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<KycStep1Data | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [payoutData, setPayoutData] = useState<PayoutData | null>(null);
  const [initialStep1Data, setInitialStep1Data] = useState<KycStep1Data | null>(null);
  const [initialDocs, setInitialDocs] = useState<UploadedDoc[]>([]);
  const [initialPayoutData, setInitialPayoutData] = useState<InitialPayoutSummary | null>(null);
  const [pendingDeleteDocs, setPendingDeleteDocs] = useState<UploadedDoc[]>([]);

  function saveDoc(doc: UploadedDoc) {
    setUploadedDocs((prev) => {
      const filtered = prev.filter((d) => d.docType !== doc.docType);
      return [...filtered, doc];
    });
  }

  function removeDoc(docType: string) {
    setUploadedDocs((prev) => prev.filter((d) => d.docType !== docType));
  }

  function addPendingDeleteDoc(doc: UploadedDoc) {
    setPendingDeleteDocs((prev) => [...prev, doc]);
  }

  function clearPendingDeleteDocs() {
    setPendingDeleteDocs([]);
  }

  function setInitialData(data: {
    step1: KycStep1Data;
    docs: UploadedDoc[];
    payout?: InitialPayoutSummary | null;
  }) {
    setStep1Data(data.step1);
    setUploadedDocs(data.docs);
    setInitialStep1Data(data.step1);
    setInitialDocs(data.docs);
    setInitialPayoutData(data.payout ?? null);
    setPayoutData(null); // เลขบัญชีเข้ารหัสไว้ — ต้องกรอกใหม่เสมอถ้าจะแก้ (ดู key correctness note 5)
    setPendingDeleteDocs([]);
  }

  return (
    <KycContext.Provider value={{
      step,
      step1Data,
      uploadedDocs,
      payoutData,
      initialStep1Data,
      initialDocs,
      initialPayoutData,
      pendingDeleteDocs,
      goToStep: setStep,
      saveStep1: setStep1Data,
      savePayout: setPayoutData,
      saveDoc,
      removeDoc,
      addPendingDeleteDoc,
      clearPendingDeleteDocs,
      setInitialData,
    }}>
      {children}
    </KycContext.Provider>
  );
}

export function useKyc() {
  const ctx = useContext(KycContext);
  if (!ctx) throw new Error('useKyc must be used within KycProvider');
  return ctx;
}
