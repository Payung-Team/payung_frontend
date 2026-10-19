import { useMutation } from '@apollo/client/react';
import { useAuth } from '../../context/AuthContext';
import { useKyc, type DrivingLicenseDraft, type LicenseFileUpload } from '../../context/KycContext';
import { EMPTY_DRIVING_LICENSE_DRAFT } from './drivingLicenseDraftState';
import { storagePathFromUrl } from './licenseDraft';
import { DELETE_KYC_DOCUMENT, UPLOAD_KYC_DOCUMENT } from '../../graphql/queries';
import { supabase } from '../../lib/supabase';
import { logGraphQLError } from '../../lib/logGraphQLError';
import { LICENSE_ALLOWED_TYPES, LICENSE_MAX_SIZE, isFutureBangkokDate, isValidYmd, toBangkokYmd } from '../../lib/license';
import {
  DRIVING_LICENSE_DOC_TYPE,
  drivingLicenseErrorCode,
  drivingLicenseStatus,
  isUsableDrivingLicense,
  type DrivingLicenseInfo,
} from '../../lib/drivingLicense';
import type { DrivingLicenseStrings } from '../../lib/drivingLicenseStrings';
import type { LicenseStrings } from '../../lib/licenseStrings';

const BUCKET = 'kyc-documents';

export type DrivingLicenseFieldErrors = Partial<Record<'file' | 'expiresAt', string>>;

export type DrivingLicenseUploadState =
  | { status: 'idle' }
  | { status: 'uploading'; fileName: string }
  | { status: 'error'; message: string; kind: 'type' | 'size' | 'network'; fileName: string };

/** ตรวจชนิด/ขนาดก่อนอัปโหลด — ชุดเดียวกับเอกสาร KYC อื่น (JPG, PNG, PDF · ≤ 5 MB) */
export function checkDrivingLicenseFile(file: File, ls: LicenseStrings): DrivingLicenseUploadState | null {
  if (!LICENSE_ALLOWED_TYPES.includes(file.type)) return { status: 'error', kind: 'type', fileName: file.name, message: ls.errFileType(file.name) };
  if (file.size > LICENSE_MAX_SIZE) return { status: 'error', kind: 'size', fileName: file.name, message: ls.errFileSize };
  return null;
}

/** การ์ดในหน้าสถานะ KYC: แสดงเมื่อมีใบแล้ว หรือ KYC อนุมัติแล้ว (ให้ทางเปลี่ยนเป็นขับรถรับส่งเอง) */
export function shouldShowDrivingLicenseCard(info: DrivingLicenseInfo | null | undefined, kycStatus: string | null | undefined): boolean {
  return drivingLicenseStatus(info) !== 'none' || kycStatus === 'verified';
}

/** ตรวจฝั่ง client ก่อนเรียก API — วันหมดอายุเทียบปฏิทินไทย ต้องเป็นวันหลังจากวันนี้ (E5) */
export function validateDrivingLicenseDraft(
  draft: Pick<DrivingLicenseDraft, 'expiresAt' | 'file'>,
  s: DrivingLicenseStrings,
  now = new Date(),
): DrivingLicenseFieldErrors {
  const errors: DrivingLicenseFieldErrors = {};
  if (!draft.file) errors.file = s.errFileRequired;
  if (!draft.expiresAt) errors.expiresAt = s.errExpiryRequired;
  else if (!isValidYmd(draft.expiresAt)) errors.expiresAt = s.errExpiryInvalid;
  else if (!isFutureBangkokDate(draft.expiresAt, now)) errors.expiresAt = s.errExpired;
  return errors;
}

/** error จาก API → error รายช่อง · code อื่นที่ไม่รู้จัก = ข้อความรวม */
function fieldErrorsFromError(err: unknown, s: DrivingLicenseStrings): { fieldErrors: DrivingLicenseFieldErrors; message?: string } {
  const code = drivingLicenseErrorCode(err);
  if (code === 'DRIVING_LICENSE_EXPIRY_REQUIRED' || code === 'DRIVING_LICENSE_EXPIRED') {
    return { fieldErrors: { expiresAt: s.apiError[code] } };
  }
  if (code === 'DRIVING_LICENSE_REQUIRED') return { fieldErrors: { file: s.apiError[code] } };
  return { fieldErrors: {}, message: code ? s.apiError[code] : s.errUnknown };
}

export function isDrivingLicenseRegistered(draft: DrivingLicenseDraft): boolean {
  const r = draft.registered;
  return Boolean(r && draft.file && r.fileUrl === draft.file.fileUrl && r.expiresAt === draft.expiresAt);
}

/**
 * แปลงข้อมูลจาก kycStatus เป็นฟอร์มตอนแก้ KYC ที่ถูกปฏิเสธ (แบบเดียวกับ licenseDraftFromKycStatus)
 * - ใบเดิมยังใช้ได้ (รอตรวจ/อนุมัติ) → เติมให้ครบและถือว่า register แล้ว (แสดงเมื่อผู้ใช้เลือก "ขับเอง")
 * - ใบเดิมไม่ผ่าน/หมดอายุ → ฟอร์มว่าง พร้อมเหตุผลของใบเดิม (E7)
 */
export function drivingLicenseDraftFromKycStatus(kyc: {
  drivingLicense?: DrivingLicenseInfo | null;
  documents?: Array<{ id: string; mimeType?: string | null; fileSize?: number | null }>;
} | null | undefined): DrivingLicenseDraft {
  const info = kyc?.drivingLicense;
  const status = drivingLicenseStatus(info);
  if (!info || !info.documentId || status === 'none') return EMPTY_DRIVING_LICENSE_DRAFT;

  const previous = { docId: info.documentId, status, rejectionReason: info.rejectionReason };
  if (!isUsableDrivingLicense(status)) return { ...EMPTY_DRIVING_LICENSE_DRAFT, previous };

  const path = storagePathFromUrl(info.signedUrl);
  const doc = kyc?.documents?.find((d) => d.id === info.documentId);
  const expiresAt = toBangkokYmd(info.expiresAt);
  const file: LicenseFileUpload | null = path
    ? {
      storagePath: path,
      fileUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
      fileName: info.fileName ?? '',
      fileSize: doc?.fileSize ?? 0,
      mimeType: doc?.mimeType ?? '',
      previewUrl: info.signedUrl ?? '',
    }
    : null;

  return {
    expiresAt,
    file,
    registered: file ? { docId: info.documentId, expiresAt, fileUrl: file.fileUrl } : null,
    previous,
  };
}

export type DrivingLicenseRegisterResult =
  | { ok: true; docId: string }
  | { ok: false; fieldErrors: DrivingLicenseFieldErrors; message?: string };

/**
 * อัปโหลดไฟล์ + register กับ API — ไม่ผูกกับ KycContext
 * ใช้ทั้งในฟอร์ม KYC และในการ์ดสถานะ (ผู้ดูแลที่ KYC อนุมัติแล้วอัปโหลดใบใหม่ — BE จับคู่ด้วย user_id)
 */
export function useDrivingLicenseUpload() {
  const { user } = useAuth();
  const [uploadKycDocument] = useMutation(UPLOAD_KYC_DOCUMENT);
  const [deleteKycDocument] = useMutation(DELETE_KYC_DOCUMENT);

  async function removeStorage(path: string | null | undefined) {
    if (!path) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.warn('Driving license storage cleanup warning:', error.message);
  }

  async function removeRow(docId: string) {
    try {
      await deleteKycDocument({ variables: { documentId: docId } });
    } catch (err) {
      // ลบไม่สำเร็จไม่ทำให้ฟอร์มพัง — แถวที่ไม่อยู่ใน documentIds ไม่ถูกผูกกับ KYC
      logGraphQLError('DeleteKycDocument', err);
    }
  }

  /** ขึ้นไฟล์ไป storage (ยังไม่ register) */
  async function uploadFile(file: File): Promise<LicenseFileUpload> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user?.id ?? 'unknown'}/${Date.now()}-${DRIVING_LICENSE_DOC_TYPE}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (error) throw new Error(error.message);
    const fileUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
    return {
      storagePath: path,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      previewUrl: signed?.signedUrl || fileUrl,
    };
  }

  /** register กับ API (uploadKycDocument พร้อมวันหมดอายุ) */
  async function register(
    input: { file: LicenseFileUpload; expiresAt: string },
    s: DrivingLicenseStrings,
  ): Promise<DrivingLicenseRegisterResult> {
    try {
      const result = await uploadKycDocument({
        variables: {
          input: {
            docType: DRIVING_LICENSE_DOC_TYPE,
            fileUrl: input.file.fileUrl,
            fileName: input.file.fileName,
            fileSize: input.file.fileSize,
            mimeType: input.file.mimeType,
            // BE ใช้วันที่ตามปฏิทินไทยของค่านี้ แล้วเก็บเป็นสิ้นวันนั้น (PYG-597)
            expiresAt: input.expiresAt,
          },
        },
      });
      const docId = (result.data as { uploadKycDocument?: { id: string } } | undefined)?.uploadKycDocument?.id;
      return docId ? { ok: true, docId } : { ok: false, fieldErrors: {}, message: s.errUnknown };
    } catch (err) {
      logGraphQLError('UploadKycDocument(driving_license)', err);
      return { ok: false, ...fieldErrorsFromError(err, s) };
    }
  }

  return { uploadFile, register, removeStorage, removeRow };
}

/**
 * การกระทำกับใบขับขี่ในฟอร์ม KYC (ขั้น 2) — ผูกกับ KycContext
 */
export function useDrivingLicenseDraftActions() {
  const { drivingLicenseDraft, saveDrivingLicenseDraft, saveDoc, removeDoc, initialDocs } = useKyc();
  const { uploadFile, register: registerApi, removeStorage, removeRow } = useDrivingLicenseUpload();

  /** เอกสารที่สร้างในรอบนี้ — ลบได้ · ของการยื่นครั้งก่อนเก็บไว้เป็นประวัติ */
  const createdThisSession = (docId: string) => !initialDocs.some((d) => d.docId === docId);

  /** เปลี่ยนไฟล์ — ไฟล์เดิมที่ยังไม่ได้ register ทิ้งจาก storage */
  async function replaceFile(next: LicenseFileUpload) {
    const draft = drivingLicenseDraft;
    const old = draft.file;
    saveDrivingLicenseDraft({ ...draft, file: next });
    const oldIsRegistered = old && draft.registered?.fileUrl === old.fileUrl;
    if (old && !oldIsRegistered && old.storagePath !== next.storagePath) await removeStorage(old.storagePath);
  }

  /** register ที่ "ถัดไป" ของขั้น 2 · register ซ้ำ (แก้วัน/ไฟล์) → แถวเก่าของรอบนี้ถูกลบ */
  async function register(draft: DrivingLicenseDraft, s: DrivingLicenseStrings): Promise<DrivingLicenseRegisterResult> {
    if (isDrivingLicenseRegistered(draft) && draft.registered) return { ok: true, docId: draft.registered.docId };
    if (!draft.file) return { ok: false, fieldErrors: { file: s.errFileRequired } };

    const result = await registerApi({ file: draft.file, expiresAt: draft.expiresAt }, s);
    if (!result.ok) return result;

    const old = draft.registered;
    saveDoc({ docId: result.docId, docType: DRIVING_LICENSE_DOC_TYPE, fileName: draft.file.fileName, previewUrl: draft.file.previewUrl });
    saveDrivingLicenseDraft({
      ...draft,
      registered: { docId: result.docId, expiresAt: draft.expiresAt, fileUrl: draft.file.fileUrl },
    });
    if (old && createdThisSession(old.docId)) {
      await removeRow(old.docId);
      if (old.fileUrl !== draft.file.fileUrl) await removeStorage(storagePathFromUrl(old.fileUrl));
    }
    return result;
  }

  /**
   * ทิ้งใบขับขี่ทั้งหมดในฟอร์ม — เปลี่ยนจาก "ขับเอง" เป็นอย่างอื่น (ยืนยันแล้ว)
   * ไม่ส่งไปกับ KYC: เอาออกจากรายการเอกสาร · ของรอบนี้ลบทั้งแถวและไฟล์ · ของการยื่นครั้งก่อนเก็บไว้
   */
  async function discard() {
    const draft = drivingLicenseDraft;
    removeDoc(DRIVING_LICENSE_DOC_TYPE);
    saveDrivingLicenseDraft({ ...EMPTY_DRIVING_LICENSE_DRAFT, previous: draft.previous ?? null });
    const reg = draft.registered;
    if (reg && createdThisSession(reg.docId)) {
      await removeRow(reg.docId);
      await removeStorage(storagePathFromUrl(reg.fileUrl));
    }
    if (draft.file && draft.file.fileUrl !== reg?.fileUrl) await removeStorage(draft.file.storagePath);
  }

  /** ลบเฉพาะไฟล์ (ปุ่มลบในกรอบไฟล์) — วันหมดอายุที่กรอกไว้ยังอยู่ */
  async function removeFile() {
    const draft = drivingLicenseDraft;
    removeDoc(DRIVING_LICENSE_DOC_TYPE);
    saveDrivingLicenseDraft({ ...draft, file: null, registered: null });
    const reg = draft.registered;
    if (reg && createdThisSession(reg.docId)) {
      await removeRow(reg.docId);
      await removeStorage(storagePathFromUrl(reg.fileUrl));
    }
    if (draft.file && draft.file.fileUrl !== reg?.fileUrl) await removeStorage(draft.file.storagePath);
  }

  return { uploadFile, replaceFile, register, discard, removeFile };
}
