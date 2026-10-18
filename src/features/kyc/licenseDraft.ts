import { useMutation } from '@apollo/client/react';
import { useAuth } from '../../context/AuthContext';
import { useKyc, type LicenseDraft, type LicenseFileUpload } from '../../context/KycContext';
import { EMPTY_LICENSE_DRAFT } from './licenseDraftState';
import { DELETE_KYC_DOCUMENT, UPLOAD_KYC_DOCUMENT } from '../../graphql/queries';
import { supabase } from '../../lib/supabase';
import { logGraphQLError } from '../../lib/logGraphQLError';
import {
  LICENSE_DOC_TYPE,
  LICENSE_NUMBER_MAX_LENGTH,
  isFutureBangkokDate,
  isUsableLicenseStatus,
  isValidYmd,
  licenseErrorCodes,
  normalizeLicenseStatus,
  toBangkokYmd,
  type LicenseErrorCode,
  type LicenseField,
} from '../../lib/license';
import type { LicenseStrings } from '../../lib/licenseStrings';

const BUCKET = 'kyc-documents';

/** path ใน bucket จาก URL ที่เก็บ/เซ็นไว้ — แบบเดียวกับ KycStep2 / KycStep4 */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const parts = url.split(`/${BUCKET}/`);
  return parts.length > 1 ? decodeURIComponent(parts[1].split('?')[0]) : null;
}

export type LicenseFieldErrors = Partial<Record<LicenseField, string>>;

/**
 * ตรวจฝั่ง client ก่อนเรียก API (R1 / R3 / E3 / E5) — คืน error รายช่อง ({} = ผ่าน)
 * วันหมดอายุเทียบปฏิทินไทย ให้ตรงกับ BE
 */
export function validateLicenseDraft(draft: LicenseDraft, s: LicenseStrings, now = new Date()): LicenseFieldErrors {
  const errors: LicenseFieldErrors = {};
  const number = draft.licenseNumber.trim();
  if (!number) errors.licenseNumber = s.errNumberRequired;
  else if (number.length > LICENSE_NUMBER_MAX_LENGTH) errors.licenseNumber = s.errNumberTooLong(LICENSE_NUMBER_MAX_LENGTH);

  if (!draft.expiresAt) errors.expiresAt = s.errExpiryRequired;
  else if (!isValidYmd(draft.expiresAt)) errors.expiresAt = s.errExpiryInvalid;
  else if (!isFutureBangkokDate(draft.expiresAt, now)) errors.expiresAt = s.errExpiryNotFuture;

  if (!draft.file) errors.file = s.errFileRequired;
  return errors;
}

/** error code จาก API → error รายช่อง (ข้อความจากไฟล์ข้อความกลาง) */
export function fieldErrorsFromCodes(codes: LicenseErrorCode[], s: LicenseStrings): LicenseFieldErrors {
  const errors: LicenseFieldErrors = {};
  for (const code of codes) {
    if (code === 'LICENSE_NUMBER_REQUIRED' || code === 'LICENSE_NUMBER_TOO_LONG') errors.licenseNumber ??= s.apiError[code];
    else if (code === 'LICENSE_EXPIRY_REQUIRED' || code === 'LICENSE_EXPIRY_NOT_FUTURE') errors.expiresAt ??= s.apiError[code];
    else if (code === 'LICENSE_FILE_REQUIRED') errors.file ??= s.apiError[code];
  }
  return errors;
}

/** ข้อมูลที่ register แล้วตรงกับที่กรอกอยู่ — ไม่ต้องเรียก API ซ้ำ */
export function isDraftRegistered(draft: LicenseDraft): boolean {
  const r = draft.registered;
  return Boolean(
    r && draft.file &&
    r.fileUrl === draft.file.fileUrl &&
    r.licenseNumber === draft.licenseNumber.trim() &&
    r.expiresAt === draft.expiresAt,
  );
}

/**
 * แปลงข้อมูลจาก kycStatus เป็นฟอร์มตอนแก้ KYC ที่ถูกปฏิเสธ
 * - ใบเดิมยังใช้ได้ (รอตรวจ/อนุมัติ) → เติมให้ครบและถือว่า register แล้ว
 * - ใบเดิมไม่ผ่าน/หมดอายุ → ฟอร์มว่าง พร้อมเหตุผลของใบเดิม (E6: ต้องแนบใบใหม่ ใบเดิมยังอยู่เป็นประวัติ)
 */
export function licenseDraftFromKycStatus(kyc: {
  license?: {
    documentId: string;
    licenseNumber: string | null;
    fileName: string;
    signedUrl: string | null;
    expiresAt: string | null;
    status: string;
    rejectionReason: string | null;
  } | null;
  documents?: Array<{ id: string; mimeType?: string | null; fileSize?: number | null }>;
} | null | undefined): LicenseDraft {
  const license = kyc?.license;
  if (!license) return EMPTY_LICENSE_DRAFT;

  const status = normalizeLicenseStatus(license.status);
  const previous = { docId: license.documentId, status, rejectionReason: license.rejectionReason };
  if (!isUsableLicenseStatus(status)) return { ...EMPTY_LICENSE_DRAFT, previous };

  const path = storagePathFromUrl(license.signedUrl);
  const doc = kyc?.documents?.find((d) => d.id === license.documentId);
  const expiresAt = toBangkokYmd(license.expiresAt);
  const file: LicenseFileUpload | null = path
    ? {
      storagePath: path,
      fileUrl: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
      fileName: license.fileName,
      fileSize: doc?.fileSize ?? 0,
      mimeType: doc?.mimeType ?? '',
      previewUrl: license.signedUrl ?? '',
    }
    : null;

  return {
    licenseNumber: license.licenseNumber ?? '',
    expiresAt,
    file,
    registered: file
      ? { docId: license.documentId, licenseNumber: (license.licenseNumber ?? '').trim(), expiresAt, fileUrl: file.fileUrl }
      : null,
    previous,
    clearedForProfession: null,
  };
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; fieldErrors: LicenseFieldErrors; message?: string };

/**
 * การกระทำกับใบประกอบฯ ที่ต้องใช้ API / storage — ใช้ร่วมกันในขั้น 1 (E1/E2) และขั้น 2
 */
export function useLicenseDraftActions() {
  const { user } = useAuth();
  const { licenseDraft, saveLicenseDraft, saveDoc, removeDoc, initialDocs } = useKyc();
  const [uploadKycDocument] = useMutation(UPLOAD_KYC_DOCUMENT);
  const [deleteKycDocument] = useMutation(DELETE_KYC_DOCUMENT);

  /** เอกสารที่สร้างในรอบนี้ (ไม่ใช่ของการยื่นครั้งก่อน) — ลบได้ ของเดิมต้องเก็บไว้เป็นประวัติ (E6) */
  const createdThisSession = (docId: string) => !initialDocs.some((d) => d.docId === docId);

  async function removeStorage(path: string | null | undefined) {
    if (!path) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) console.warn('License storage cleanup warning:', error.message);
  }

  async function removeRegisteredRow(docId: string) {
    try {
      await deleteKycDocument({ variables: { documentId: docId } });
    } catch (err) {
      // ลบไม่สำเร็จไม่ทำให้ฟอร์มพัง — แถวที่ไม่ได้อยู่ใน documentIds ไม่ถูกผูกกับ KYC
      logGraphQLError('DeleteKycDocument', err);
    }
  }

  /** ขึ้นไฟล์ไป storage (ยังไม่ register) */
  async function uploadFile(file: File): Promise<LicenseFileUpload> {
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user?.id ?? 'unknown'}/${Date.now()}-${LICENSE_DOC_TYPE}.${ext}`;
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

  /**
   * เปลี่ยนไฟล์ — ไฟล์เดิมที่ยังไม่ได้ register ในรอบนี้ทิ้งจาก storage
   * ไฟล์ที่ register แล้วเก็บไว้จนกว่า register ใหม่สำเร็จ
   */
  async function replaceFile(next: LicenseFileUpload) {
    const old = licenseDraft.file;
    saveLicenseDraft({ ...licenseDraft, file: next, clearedForProfession: null });
    const oldIsRegistered = old && licenseDraft.registered?.fileUrl === old.fileUrl;
    if (old && !oldIsRegistered && old.storagePath !== next.storagePath) await removeStorage(old.storagePath);
  }

  /**
   * register กับ API (uploadKycDocument พร้อมเลข + วันหมดอายุ)
   * register ซ้ำ (แก้เลข/วัน/ไฟล์) → แถวเก่าของรอบนี้ถูกลบ ไฟล์เดิมเก็บไว้ถ้ายังใช้ไฟล์เดียวกัน
   */
  async function register(draft: LicenseDraft, s: LicenseStrings): Promise<RegisterResult> {
    if (isDraftRegistered(draft)) return { ok: true };
    if (!draft.file) return { ok: false, fieldErrors: { file: s.errFileRequired } };

    const licenseNumber = draft.licenseNumber.trim(); // E5
    let docId: string | undefined;
    try {
      const result = await uploadKycDocument({
        variables: {
          input: {
            docType: LICENSE_DOC_TYPE,
            fileUrl: draft.file.fileUrl,
            fileName: draft.file.fileName,
            fileSize: draft.file.fileSize,
            mimeType: draft.file.mimeType,
            licenseNumber,
            // BE ใช้วันที่ตามปฏิทินไทยของค่านี้ แล้วเก็บเป็นสิ้นวันนั้น (PYG-587 license-date.ts)
            expiresAt: draft.expiresAt,
          },
        },
      });
      docId = (result.data as { uploadKycDocument?: { id: string } } | undefined)?.uploadKycDocument?.id;
    } catch (err) {
      logGraphQLError('UploadKycDocument(license)', err);
      const codes = licenseErrorCodes(err);
      if (codes.length > 0) return { ok: false, fieldErrors: fieldErrorsFromCodes(codes, s) };
      return { ok: false, fieldErrors: {}, message: s.errUnknown };
    }
    if (!docId) return { ok: false, fieldErrors: {}, message: s.errUnknown };

    const old = draft.registered;
    saveDoc({ docId, docType: LICENSE_DOC_TYPE, fileName: draft.file.fileName, previewUrl: draft.file.previewUrl });
    saveLicenseDraft({
      ...draft,
      registered: { docId, licenseNumber, expiresAt: draft.expiresAt, fileUrl: draft.file.fileUrl },
    });
    if (old && createdThisSession(old.docId)) {
      await removeRegisteredRow(old.docId);
      if (old.fileUrl !== draft.file.fileUrl) await removeStorage(storagePathFromUrl(old.fileUrl));
    }
    return { ok: true };
  }

  /**
   * ทิ้งใบประกอบฯ ทั้งหมดในฟอร์ม (E1 / E2 หรือกดลบไฟล์)
   * ไม่ส่งข้อมูลที่ค้างไปกับ KYC: เอาออกจากรายการเอกสาร · ของรอบนี้ลบทั้งแถวและไฟล์ · ของการยื่นครั้งก่อนเก็บไว้ (E6)
   */
  async function discard(options: { clearedForProfession?: LicenseDraft['clearedForProfession']; keepPrevious?: boolean } = {}) {
    const draft = licenseDraft;
    removeDoc(LICENSE_DOC_TYPE);
    saveLicenseDraft({
      ...EMPTY_LICENSE_DRAFT,
      previous: options.keepPrevious ? draft.previous : null,
      clearedForProfession: options.clearedForProfession ?? null,
    });
    const reg = draft.registered;
    if (reg && createdThisSession(reg.docId)) {
      await removeRegisteredRow(reg.docId);
      await removeStorage(storagePathFromUrl(reg.fileUrl));
    }
    if (draft.file && draft.file.fileUrl !== reg?.fileUrl) await removeStorage(draft.file.storagePath);
  }

  /**
   * ลบเฉพาะไฟล์ (ปุ่มลบในกรอบไฟล์) — เลขที่และวันหมดอายุที่กรอกไว้ยังอยู่
   * ไฟล์ที่ register ในรอบนี้ลบทั้งแถว · ของการยื่นครั้งก่อนแค่เอาออกจากรายการที่จะส่ง (E6)
   */
  async function removeFile() {
    const draft = licenseDraft;
    removeDoc(LICENSE_DOC_TYPE);
    saveLicenseDraft({ ...draft, file: null, registered: null });
    const reg = draft.registered;
    if (reg && createdThisSession(reg.docId)) {
      await removeRegisteredRow(reg.docId);
      await removeStorage(storagePathFromUrl(reg.fileUrl));
    }
    if (draft.file && draft.file.fileUrl !== reg?.fileUrl) await removeStorage(draft.file.storagePath);
  }

  return { uploadFile, replaceFile, register, discard, removeFile };
}
