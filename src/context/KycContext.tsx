import { createContext, useContext, useState, type ReactNode } from 'react';

export interface KycStep1Data {
  fullName: string;
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

interface KycContextType {
  step: number; // 0 = intro, 1 = step1, 2 = step2, 3 = step3
  step1Data: KycStep1Data | null;
  uploadedDocs: UploadedDoc[];
  goToStep: (step: number) => void;
  saveStep1: (data: KycStep1Data) => void;
  saveDoc: (doc: UploadedDoc) => void;
  removeDoc: (docType: string) => void;
}

const KycContext = createContext<KycContextType | undefined>(undefined);

export function KycProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState(0);
  const [step1Data, setStep1Data] = useState<KycStep1Data | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);

  function saveDoc(doc: UploadedDoc) {
    setUploadedDocs((prev) => {
      const filtered = prev.filter((d) => d.docType !== doc.docType);
      return [...filtered, doc];
    });
  }

  function removeDoc(docType: string) {
    setUploadedDocs((prev) => prev.filter((d) => d.docType !== docType));
  }

  return (
    <KycContext.Provider value={{
      step,
      step1Data,
      uploadedDocs,
      goToStep: setStep,
      saveStep1: setStep1Data,
      saveDoc,
      removeDoc,
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
