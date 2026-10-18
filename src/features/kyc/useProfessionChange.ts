import { useMutation, useQuery } from '@apollo/client/react';
import {
  CANCEL_PROFESSION_CHANGE_REQUEST,
  MY_PROFESSION_CHANGE_REQUEST,
  REQUEST_PROFESSION_CHANGE,
  type ProfessionChangeRequest,
} from '../../graphql/professionChange';

/**
 * ข้อมูลของ flow ขอเปลี่ยนวิชาชีพ (PYG-556 · S01-AC6) — API ตาม contract PYG-573 §4 (BE: PYG-575)
 * หน้าจอ (ProfessionChangeCard) ใช้ผ่าน interface นี้เท่านั้น
 * แอดมินอนุมัติ/ปฏิเสธผ่าน API (ยังไม่มีหน้าแอดมิน · contract §9 ข้อ 4) — ผลเห็นจาก myProfessionChangeRequest
 */

/**
 * แนบใบประกอบฯ ไปกับคำขอ — ปิดไว้จนกว่า S03 (PYG-558) จะเพิ่ม field ใบประกอบฯ ใน ProfessionChangeInput
 * ระหว่างนี้เปลี่ยนเป็นพยาบาล / นักกายภาพฯ ได้โดยไม่แนบ (contract §1 · E5)
 */
export const PROFESSION_CHANGE_LICENSE_ENABLED = false;

export interface LicenseFile {
  docId: string;
  fileName: string;
  previewUrl: string | null;
  /** มีเฉพาะไฟล์ที่อัปโหลดรอบนี้ — ใช้ลบทิ้งเมื่อผู้ใช้เปลี่ยนไฟล์ (path ใน bucket kyc-documents) */
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
}

export function useProfessionChange(caregiverId: string): ProfessionChangeData {
  const { data, loading, refetch } = useQuery<{ myProfessionChangeRequest: ProfessionChangeRequest | null }>(
    MY_PROFESSION_CHANGE_REQUEST,
    { fetchPolicy: 'network-only', skip: !caregiverId },
  );
  const refetchMine = { refetchQueries: [{ query: MY_PROFESSION_CHANGE_REQUEST }], awaitRefetchQueries: true };
  const [requestChange, { loading: submitting }] = useMutation(REQUEST_PROFESSION_CHANGE, refetchMine);
  const [cancelRequest, { loading: cancelling }] = useMutation(CANCEL_PROFESSION_CHANGE_REQUEST, refetchMine);

  // error เช่น ALREADY_PENDING / NOT_PENDING = ข้อมูลบนจอเก่า (แท็บอื่น/แอดมินเปลี่ยนไปแล้ว) → ดึงใหม่ก่อนโยน error ต่อ
  async function syncAfterError(err: unknown): Promise<never> {
    await refetch().catch(() => undefined);
    throw err;
  }

  return {
    request: data?.myProfessionChangeRequest ?? null,
    loading,
    submitting,
    cancelling,

    // TODO(PYG-558 · S03): เพิ่ม licenseNumber, licenseExpiresAt, licenseDocumentId: licenseFile.docId ใน input
    async submit({ profession }) {
      await requestChange({ variables: { input: { profession } } }).catch(syncAfterError);
    },

    async cancel(id) {
      await cancelRequest({ variables: { id } }).catch(syncAfterError);
    },

    // TODO(PYG-558 · S03): อัปโหลดแบบเดียวกับ KycStep2.handleFileChange
    //   supabase.storage.from('kyc-documents').upload(`${userId}/${Date.now()}-professional_license.${ext}`)
    //   แล้ว UPLOAD_KYC_DOCUMENT { docType: 'professional_license', fileUrl, fileName, fileSize, mimeType }
    //   ไม่ถูกเรียกระหว่างที่ PROFESSION_CHANGE_LICENSE_ENABLED = false
    async uploadLicense() {
      throw new Error('Professional license upload for profession change is not available yet (PYG-558)');
    },

    // TODO(PYG-558 · S03): supabase.storage.remove([storagePath]) + DELETE_KYC_DOCUMENT { documentId: docId }
    async discardLicense() {},
  };
}
