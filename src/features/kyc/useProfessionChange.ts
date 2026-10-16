import { useState } from 'react';
import type { ProfessionChangeRequest } from '../../graphql/professionChange';
import {
  getMockRequest,
  mockDelay,
  reviewMockRequest,
  saveMockRequest,
  useMockState,
} from '../../mocks/caregiverExtrasMock';

/**
 * ข้อมูลของ flow ขอเปลี่ยนวิชาชีพ (PYG-556 · S01-AC6)
 *
 * ตอนนี้เป็น MOCK — เก็บใน localStorage (mocks/caregiverExtrasMock.ts) และไม่อัปโหลดไฟล์จริง
 * TODO(PYG-575): เชื่อมแต่ละจุดกับ operation ใน graphql/professionChange.ts ตามที่ระบุไว้ข้างล่าง
 *   หน้าจอ (ProfessionChangeCard) ใช้ผ่าน interface นี้เท่านั้น เชื่อมแล้วไม่ต้องแก้หน้าจอ
 */

export interface LicenseFile {
  docId: string;
  fileName: string;
  previewUrl: string | null;
  /** มีเฉพาะไฟล์ที่อัปโหลดรอบนี้ — ใช้ลบทิ้งเมื่อผู้ใช้เปลี่ยนไฟล์ (ของจริง = path ใน bucket kyc-documents) */
  storagePath?: string;
}

export interface ProfessionChangeSubmit {
  profession: string;
  licenseNumber?: string;
  /** YYYY-MM-DD */
  licenseExpiresAt?: string;
  licenseFile?: LicenseFile | null;
}

export interface ProfessionChangeData {
  request: ProfessionChangeRequest | null;
  loading: boolean;
  submitting: boolean;
  cancelling: boolean;
  submit: (input: ProfessionChangeSubmit) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  uploadLicense: (file: File) => Promise<LicenseFile>;
  /** ลบไฟล์ที่อัปโหลดรอบนี้ (ไฟล์จากคำขอเดิมไม่ถูกลบ) */
  discardLicense: (file: LicenseFile | null) => Promise<void>;
  /** MOCK เท่านั้น — จำลองแอดมินตรวจ · ของจริงไม่มี (แอดมินตรวจจากหน้าแอดมิน) */
  simulateReview?: (action: 'approved' | 'rejected') => void;
}

// object URL ของไฟล์ที่เลือก — อยู่ในหน่วยความจำเท่านั้น reload แล้วดูไฟล์ไม่ได้ (แต่ชื่อไฟล์ยังอยู่)
const mockFileUrls = new Map<string, string>();

export function useProfessionChange(caregiverId: string, currentProfession: string | null | undefined): ProfessionChangeData {
  useMockState(); // re-render เมื่อข้อมูล mock เปลี่ยน
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // TODO(PYG-575): useQuery(MY_PROFESSION_CHANGE_REQUEST, { fetchPolicy: 'network-only' })
  const stored = caregiverId ? getMockRequest(caregiverId) : null;
  const request = stored?.licenseDocument
    ? { ...stored, licenseDocument: { ...stored.licenseDocument, signedUrl: mockFileUrls.get(stored.licenseDocument.id) ?? null } }
    : stored;

  return {
    request,
    loading: false,
    submitting,
    cancelling,

    // TODO(PYG-575): REQUEST_PROFESSION_CHANGE
    //   input = { profession, ...(licenseFile ? { licenseNumber, licenseExpiresAt, licenseDocumentId: licenseFile.docId } : {}) }
    //   แล้ว refetch MY_PROFESSION_CHANGE_REQUEST
    async submit({ profession, licenseNumber, licenseExpiresAt, licenseFile }) {
      setSubmitting(true);
      try {
        await mockDelay();
        saveMockRequest(caregiverId, {
          id: `mock-${Date.now()}`,
          fromProfession: currentProfession ?? 'general_caregiver',
          toProfession: profession,
          status: 'pending',
          licenseNumber: licenseFile ? licenseNumber ?? null : null,
          licenseExpiresAt: licenseFile ? licenseExpiresAt ?? null : null,
          licenseDocument: licenseFile ? { id: licenseFile.docId, fileName: licenseFile.fileName, signedUrl: null } : null,
          rejectionReason: null,
          requestedAt: new Date().toISOString(),
          reviewedAt: null,
        });
      } finally {
        setSubmitting(false);
      }
    },

    // TODO(PYG-575): CANCEL_PROFESSION_CHANGE_REQUEST { id } แล้ว refetch
    async cancel() {
      setCancelling(true);
      try {
        await mockDelay();
        if (stored) saveMockRequest(caregiverId, { ...stored, status: 'cancelled' });
      } finally {
        setCancelling(false);
      }
    },

    // TODO(PYG-558 · S03): อัปโหลดแบบเดียวกับ KycStep2.handleFileChange
    //   supabase.storage.from('kyc-documents').upload(`${userId}/${Date.now()}-professional_license.${ext}`)
    //   แล้ว UPLOAD_KYC_DOCUMENT { docType: 'professional_license', fileUrl, fileName, fileSize, mimeType }
    //   (BE ตอนนี้รับแค่ id_card_front | id_card_selfie | certificate)
    async uploadLicense(file) {
      await mockDelay(700);
      const docId = `mock-doc-${Date.now()}`;
      mockFileUrls.set(docId, URL.createObjectURL(file));
      return { docId, fileName: file.name, previewUrl: mockFileUrls.get(docId) ?? null, storagePath: `mock:${docId}` };
    },

    // TODO(PYG-558 · S03): supabase.storage.remove([storagePath]) + DELETE_KYC_DOCUMENT { documentId: docId }
    async discardLicense(file) {
      if (!file?.storagePath) return;
      const url = mockFileUrls.get(file.docId);
      if (url) URL.revokeObjectURL(url);
      mockFileUrls.delete(file.docId);
    },

    simulateReview(action) {
      reviewMockRequest(caregiverId, action);
    },
  };
}
