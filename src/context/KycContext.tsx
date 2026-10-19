import { createContext, useContext, useState, type ReactNode } from 'react';
import type { LicenseStatus } from '../lib/license';
import type { Profession } from '../lib/professions';
import { EMPTY_LICENSE_DRAFT } from '../features/kyc/licenseDraftState';
import type { DrivingLicenseStatus, TransportChoice } from '../lib/drivingLicense';
import { EMPTY_DRIVING_LICENSE_DRAFT } from '../features/kyc/drivingLicenseDraftState';

export interface KycStep1Data {
  firstName: string;
  lastName: string;
  birthDate: string; // ISO format or YYYY-MM-DD
  gender: string;
  idCardNumber: string;
  phone: string;
  /** PYG-556: '' = ยังไม่เลือก (ต้องเลือกก่อนไปขั้นถัดไป) */
  profession: string;
  /** ทักษะกลาง (รหัส care_skills) — ใช้จับคู่งาน */
  skills: string[];
  /** ทักษะที่ผู้ดูแลพิมพ์เอง — แสดงในโปรไฟล์เท่านั้น */
  customSkills: string[];
  experienceYears: number;
  bio: string;
}

export interface UploadedDoc {
  docId: string;
  docType: string;
  fileName: string;
  /**
   * URL สำหรับพรีวิวในหน้า wizard — client เซ็นเองจาก Supabase storage
   * ไม่ใช่ `KycDocument.fileUrl` ของ backend (ตัวนั้นเป็นสตริงว่างเสมอตั้งแต่ PR #39)
   */
  previewUrl: string;
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

/** ไฟล์ใบประกอบฯ ที่ขึ้น storage แล้ว — ยังไม่ผูกกับเลข/วันหมดอายุจนกว่าจะ register */
export interface LicenseFileUpload {
  /** path ใน bucket kyc-documents */
  storagePath: string;
  /** ค่าที่ส่งเป็น fileUrl ของ uploadKycDocument (แบบเดียวกับเอกสารอื่นใน KycStep2) */
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewUrl: string;
}

/**
 * ใบประกอบวิชาชีพที่กำลังกรอก (PYG-588) — อยู่ใน memory เท่านั้น ห้ามเก็บลง storage ของ browser
 *
 * BE รับเลข + วันหมดอายุมากับ uploadKycDocument ในครั้งเดียว (PYG-587) จึงแยก 2 ขั้น:
 *   1) เลือกไฟล์ → ขึ้น storage (`file`)
 *   2) กด "ถัดไป" ที่ขั้น 2 → uploadKycDocument พร้อมเลข/วันหมดอายุ (`registered`)
 * แก้เลขหรือวันหมดอายุหลัง register = register ใหม่ด้วยไฟล์เดิม
 */
export interface LicenseDraft {
  licenseNumber: string;
  /** 'YYYY-MM-DD' ตามปฏิทินไทย */
  expiresAt: string;
  file: LicenseFileUpload | null;
  /** ค่าที่ register กับ API ล่าสุด — null = ยังไม่ register */
  registered: { docId: string; licenseNumber: string; expiresAt: string; fileUrl: string } | null;
  /** ใบจากการยื่นครั้งก่อน (แก้ KYC ที่ถูกปฏิเสธ) — แสดงเหตุผลถ้าใบเดิมไม่ผ่าน/หมดอายุ */
  previous?: { docId: string; status: LicenseStatus; rejectionReason: string | null } | null;
  /** E2: ล้างข้อมูลเพราะเปลี่ยนวิชาชีพ — ขั้น 2 แจ้งผู้ใช้ว่าต้องแนบใบของวิชาชีพนี้ */
  clearedForProfession?: Profession | null;
}

/**
 * ใบขับขี่ที่กำลังกรอก (PYG-598) — อยู่ใน memory เท่านั้น ห้ามเก็บลง storage ของ browser
 * ขั้นตอนเดียวกับใบประกอบฯ: เลือกไฟล์ → ขึ้น storage (`file`) · กด "ถัดไป" ที่ขั้น 2 → uploadKycDocument พร้อมวันหมดอายุ (`registered`)
 */
export interface DrivingLicenseDraft {
  /** 'YYYY-MM-DD' ตามปฏิทินไทย */
  expiresAt: string;
  file: LicenseFileUpload | null;
  registered: { docId: string; expiresAt: string; fileUrl: string } | null;
  /** ใบจากการยื่นครั้งก่อน — แสดงเหตุผลถ้าใบเดิมไม่ผ่าน/หมดอายุ (E7: ต้องแนบใบใหม่) */
  previous?: { docId: string; status: DrivingLicenseStatus; rejectionReason: string | null } | null;
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
  /** PYG-588 */
  licenseDraft: LicenseDraft;
  saveLicenseDraft: (draft: LicenseDraft) => void;
  /** PYG-598 · '' = ยังไม่ตอบ (BE ไม่บันทึกคำตอบ — ยื่นซ้ำต้องตอบใหม่) */
  transportChoice: TransportChoice;
  saveTransportChoice: (choice: TransportChoice) => void;
  drivingLicenseDraft: DrivingLicenseDraft;
  saveDrivingLicenseDraft: (draft: DrivingLicenseDraft) => void;
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
    license?: LicenseDraft | null;
    drivingLicense?: DrivingLicenseDraft | null;
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
  const [licenseDraft, setLicenseDraft] = useState<LicenseDraft>(EMPTY_LICENSE_DRAFT);
  const [transportChoice, setTransportChoice] = useState<TransportChoice>('');
  const [drivingLicenseDraft, setDrivingLicenseDraft] = useState<DrivingLicenseDraft>(EMPTY_DRIVING_LICENSE_DRAFT);

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
    license?: LicenseDraft | null;
    drivingLicense?: DrivingLicenseDraft | null;
  }) {
    setStep1Data(data.step1);
    setUploadedDocs(data.docs);
    setInitialStep1Data(data.step1);
    setInitialDocs(data.docs);
    setInitialPayoutData(data.payout ?? null);
    setPayoutData(null); // เลขบัญชีเข้ารหัสไว้ — ต้องกรอกใหม่เสมอถ้าจะแก้ (ดู key correctness note 5)
    setPendingDeleteDocs([]);
    setLicenseDraft(data.license ?? EMPTY_LICENSE_DRAFT);
    // E10 / E11: BE ไม่เก็บคำตอบการรับส่ง → ยื่นซ้ำเริ่มจาก "ยังไม่ตอบ" เสมอ ไม่เดาให้
    setTransportChoice('');
    setDrivingLicenseDraft(data.drivingLicense ?? EMPTY_DRIVING_LICENSE_DRAFT);
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
      licenseDraft,
      saveLicenseDraft: setLicenseDraft,
      transportChoice,
      saveTransportChoice: setTransportChoice,
      drivingLicenseDraft,
      saveDrivingLicenseDraft: setDrivingLicenseDraft,
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
