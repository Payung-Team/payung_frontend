import { useMutation, useQuery } from '@apollo/client/react';
import { useAuth } from '../../context/AuthContext';
import {
  CANCEL_PROFESSION_CHANGE_REQUEST,
  MY_PROFESSION_CHANGE_REQUEST,
  REQUEST_PROFESSION_CHANGE,
  type ProfessionChangeRequest,
} from '../../graphql/professionChange';
import { DELETE_KYC_DOCUMENT, UPLOAD_KYC_DOCUMENT } from '../../graphql/queries';
import { supabase } from '../../lib/supabase';
import { logGraphQLError } from '../../lib/logGraphQLError';
import { LICENSE_DOC_TYPE } from '../../lib/license';

/**
 * ข้อมูลของ flow ขอเปลี่ยนวิชาชีพ (PYG-556 · S01-AC6) — API ตาม contract PYG-573 §4 (BE: PYG-575)
 * หน้าจอ (ProfessionChangeCard) ใช้ผ่าน interface นี้เท่านั้น
 *
 * PYG-664: เปลี่ยนเป็นพยาบาล / นักกายภาพฯ ต้องแนบใบประกอบฯ (BE PYG-663)
 *   ไฟล์ขึ้น storage ตอนเลือก → ตอนส่งคำขอ register ด้วย uploadKycDocument (เลข + วันหมดอายุ)
 *   แล้วส่ง licenseDocumentId ไปกับ requestProfessionChange · คำขอไม่สำเร็จ = ลบแถวที่เพิ่ง register ทิ้ง
 */

const BUCKET = 'kyc-documents';

export interface LicenseFile {
  /** id ใน kyc_documents — มีเฉพาะใบที่ผูกกับคำขอแล้ว (ไฟล์ที่เพิ่งเลือกยังไม่มี) */
  docId?: string;
  fileName: string;
  previewUrl: string | null;
  /** มีเฉพาะไฟล์ที่อัปโหลดรอบนี้ — ใช้ register และลบทิ้งเมื่อผู้ใช้เปลี่ยนไฟล์ (path ใน bucket kyc-documents) */
  storagePath?: string;
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
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
  /** ลบไฟล์ที่อัปโหลดรอบนี้ (ไฟล์ที่ผูกกับคำขอแล้วไม่ถูกลบ) */
  discardLicense: (file: LicenseFile | null) => Promise<void>;
}

export function useProfessionChange(caregiverId: string): ProfessionChangeData {
  const { user } = useAuth();
  const { data, loading, refetch } = useQuery<{ myProfessionChangeRequest: ProfessionChangeRequest | null }>(
    MY_PROFESSION_CHANGE_REQUEST,
    { fetchPolicy: 'network-only', skip: !caregiverId },
  );
  const refetchMine = { refetchQueries: [{ query: MY_PROFESSION_CHANGE_REQUEST }], awaitRefetchQueries: true };
  const [requestChange, { loading: requesting }] = useMutation(REQUEST_PROFESSION_CHANGE, refetchMine);
  const [cancelRequest, { loading: cancelling }] = useMutation(CANCEL_PROFESSION_CHANGE_REQUEST, refetchMine);
  const [uploadKycDocument, { loading: registering }] = useMutation(UPLOAD_KYC_DOCUMENT);
  const [deleteKycDocument] = useMutation(DELETE_KYC_DOCUMENT);

  // error เช่น ALREADY_PENDING / NOT_PENDING = ข้อมูลบนจอเก่า (แท็บอื่น/แอดมินเปลี่ยนไปแล้ว) → ดึงใหม่ก่อนโยน error ต่อ
  async function syncAfterError(err: unknown): Promise<never> {
    await refetch().catch(() => undefined);
    throw err;
  }

  /** register ใบที่อัปโหลดรอบนี้ → id ใน kyc_documents · error ของใบ (LICENSE_*) โยนต่อให้หน้าจอ map เป็นช่อง */
  async function registerLicense(file: LicenseFile, licenseNumber: string, expiresAt: string): Promise<string> {
    const result = await uploadKycDocument({
      variables: {
        input: {
          docType: LICENSE_DOC_TYPE,
          fileUrl: file.fileUrl,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          licenseNumber,
          // BE ใช้วันที่ตามปฏิทินไทยของค่านี้ แล้วเก็บเป็นสิ้นวันนั้น (เหมือนฟอร์ม KYC · licenseDraft.ts)
          expiresAt,
        },
      },
    });
    const docId = (result.data as { uploadKycDocument?: { id: string } } | undefined)?.uploadKycDocument?.id;
    if (!docId) throw new Error('uploadKycDocument returned no id');
    return docId;
  }

  async function removeStorage(path: string | undefined) {
    if (!path) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.warn('License storage cleanup warning:', error.message);
  }

  return {
    request: data?.myProfessionChangeRequest ?? null,
    loading,
    submitting: requesting || registering,
    cancelling,

    async submit({ profession, licenseNumber, licenseExpiresAt, licenseFile }) {
      if (!licenseFile) {
        await requestChange({ variables: { input: { profession } } }).catch(syncAfterError);
        return;
      }

      // ใบที่ผูกกับคำขอเดิมแล้ว (docId) ใช้ซ้ำได้ · ไฟล์ที่เพิ่งเลือกต้อง register ก่อน
      const docId = licenseFile.docId ?? (await registerLicense(licenseFile, licenseNumber ?? '', licenseExpiresAt ?? ''));
      try {
        await requestChange({ variables: { input: { profession, licenseDocumentId: docId } } });
      } catch (err) {
        // คำขอไม่เกิด → แถวที่เพิ่ง register ไม่ถูกผูกกับใคร ลบทิ้ง (ไฟล์ใน storage เก็บไว้ให้กดส่งใหม่ได้)
        if (!licenseFile.docId) {
          await deleteKycDocument({ variables: { documentId: docId } }).catch((e) =>
            logGraphQLError('DeleteKycDocument(profession change)', e),
          );
        }
        return syncAfterError(err);
      }
    },

    async cancel(id) {
      await cancelRequest({ variables: { id } }).catch(syncAfterError);
    },

    // แบบเดียวกับฟอร์มใบประกอบฯ ใน KYC (licenseDraft.uploadFile) — ขึ้น storage อย่างเดียว ยังไม่ register
    async uploadLicense(file) {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user?.id ?? 'unknown'}/${Date.now()}-${LICENSE_DOC_TYPE}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
      if (error) throw new Error(error.message);
      const fileUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
      return {
        fileName: file.name,
        previewUrl: signed?.signedUrl ?? null,
        storagePath: path,
        fileUrl,
        fileSize: file.size,
        mimeType: file.type,
      };
    },

    async discardLicense(file) {
      // ใบที่ผูกกับคำขอแล้ว (docId) เป็นหลักฐานที่แอดมินตรวจ ห้ามลบ
      if (!file || file.docId) return;
      await removeStorage(file.storagePath);
    },
  };
}
