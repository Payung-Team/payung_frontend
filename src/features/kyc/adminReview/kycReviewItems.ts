/**
 * รายการที่แอดมินต้องตรวจในหน้า KYC review (ดีไซน์ "Payung · ตรวจเอกสาร KYC")
 *
 * ทุกรายการต้องได้ "ผ่าน" หรือ "ไม่ผ่าน" ก่อนตัดสิน — ผลตรวจรายรายการเก็บที่หน้าจอจนกดอนุมัติ/ปฏิเสธ
 * ยกเว้นใบประกอบฯ / ใบขับขี่ ที่ BE ตัดสินไปแล้ว (approved / rejected) → ล็อกตามผลของ BE
 *
 * documentType ที่ส่งไปกับ rejectKyc ต้องตรงกับที่ KycStatusPage / KycResubmitPage ใช้ map ไปหน้าแก้ไข
 */
import { DRIVING_LICENSE_DOC_TYPE, DRIVING_LICENSE_KYC_ENABLED, drivingLicenseStatus } from '../../../lib/drivingLicense';
import { LICENSE_DOC_TYPE, LICENSE_KYC_ENABLED, daysUntilBangkok, normalizeLicenseStatus, requiresLicense, toBangkokYmd } from '../../../lib/license';
import { formatFileSize, formatLicenseDate } from '../../../lib/licenseStrings';
import type { AdminKycDetail, KycDocument, KycStatus, RejectionReason } from './types';

export const REMARK_MAX = 200;
export const REJECT_CHIPS = ['รูปไม่ชัด', 'มองไม่เห็นเลข', 'ไม่ตรงกับข้อมูลที่กรอก', 'เอกสารหมดอายุ', 'ไม่ใช่เอกสารที่ขอ'];
/** ตัวคั่นระหว่างเหตุผลที่เลือกจาก chip กับข้อความที่พิมพ์ */
export const CHIP_SEPARATOR = ' · ';

export const DOC_TYPE_LABEL: Record<string, string> = {
  id_card_front: 'บัตรประชาชน (ด้านหน้า)',
  id_card_selfie: 'รูปถ่ายคู่บัตรประชาชน',
  certificate: 'ใบรับรองอบรม',
  id_card: 'บัตรประชาชน',
  photo: 'รูปถ่าย',
  license: 'ใบอนุญาต',
  [LICENSE_DOC_TYPE]: 'ใบประกอบวิชาชีพ',
  [DRIVING_LICENSE_DOC_TYPE]: 'ใบขับขี่',
};

export type ItemKind = 'id_front' | 'selfie' | 'license' | 'driving' | 'training' | 'doc' | 'info';
export type CheckValue = 'pass' | 'fail' | null;

export interface ReviewFile {
  name: string;
  url: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string | null;
}

export interface ReviewItem {
  id: string;
  kind: ItemKind;
  name: string;
  meta: string;
  /** ค่าที่ส่งไปกับ rejectKyc (ผู้ดูแลเห็น) */
  documentType: string;
  /** ไฟล์ของรายการนี้ · info = รูปบัตรประชาชนไว้เทียบ */
  file: ReviewFile | null;
  /** รายการนี้ต้องเห็นไฟล์ก่อนจึงกดผ่านได้ */
  needsFile: boolean;
  /** ใบประกอบฯ / ใบขับขี่: documentId สำหรับ mutation รายใบ */
  documentId?: string | null;
  /** ใบประกอบฯ / ใบขับขี่: BE ยังรอตรวจ → ต้องยิง mutation รายใบตอนตัดสิน */
  pendingInBe?: boolean;
  /** BE ตัดสินใบนี้ไปแล้ว → ล็อกผลตามนี้ */
  locked?: { s: 'pass' | 'fail'; remark: string } | null;
  /** เหตุผลที่กดผ่านไม่ได้ (เช่น หมดอายุ) */
  passBlockedReason?: string;
}

export interface CheckResult {
  s: CheckValue;
  remark: string;
  touched: boolean;
}

export const EMPTY_RESULT: CheckResult = { s: null, remark: '', touched: false };

const isPdf = (mimeType?: string | null, name?: string | null) =>
  mimeType === 'application/pdf' || /\.pdf$/i.test(name ?? '');

export function isPdfFile(file: ReviewFile | null) {
  return !!file && isPdf(file.mimeType, file.name);
}

export function isImageFile(file: ReviewFile | null) {
  if (!file) return false;
  if (file.mimeType) return file.mimeType.startsWith('image/');
  return /\.(jpe?g|png|webp|gif|heic)$/i.test(file.name);
}

function fileType(mimeType?: string | null, name?: string | null) {
  if (isPdf(mimeType, name)) return 'PDF';
  const sub = mimeType?.split('/')[1];
  if (sub) return sub.toUpperCase();
  return name?.split('.').pop()?.toUpperCase() ?? 'ไฟล์';
}

function docMeta(doc: KycDocument | undefined, suffix?: string) {
  if (!doc) return 'ยังไม่มีไฟล์';
  const size = formatFileSize(doc.fileSize);
  return [fileType(doc.mimeType, doc.fileName), size, suffix].filter(Boolean).join(' · ');
}

function toFile(doc: KycDocument | undefined): ReviewFile | null {
  if (!doc) return null;
  return { name: doc.fileName, url: doc.signedUrl || null, mimeType: doc.mimeType, size: doc.fileSize, uploadedAt: doc.uploadedAt };
}

/** เอกสารล่าสุดของแต่ละประเภท (หลังส่งใหม่อาจมีหลายฉบับ) */
function latestByType(documents: KycDocument[]) {
  const map = new Map<string, KycDocument>();
  for (const doc of documents) {
    const prev = map.get(doc.docType);
    if (!prev || new Date(doc.uploadedAt).getTime() > new Date(prev.uploadedAt).getTime()) map.set(doc.docType, doc);
  }
  return map;
}

export function buildReviewItems(detail: AdminKycDetail): ReviewItem[] {
  const { caregiver, documents } = detail;
  const profession = caregiver.profession ?? detail.profession ?? null;
  const latest = latestByType(documents);
  const used = new Set<string>(['id_card_front', 'id_card', 'id_card_selfie', 'certificate', LICENSE_DOC_TYPE, DRIVING_LICENSE_DOC_TYPE]);
  const items: ReviewItem[] = [];

  const idFront = latest.get('id_card_front') ?? latest.get('id_card');
  items.push({
    id: 'id_front',
    kind: 'id_front',
    name: DOC_TYPE_LABEL.id_card_front,
    meta: docMeta(idFront),
    documentType: 'บัตรประชาชน',
    file: toFile(idFront),
    needsFile: true,
  });

  const selfie = latest.get('id_card_selfie');
  items.push({
    id: 'selfie',
    kind: 'selfie',
    name: DOC_TYPE_LABEL.id_card_selfie,
    meta: docMeta(selfie),
    documentType: 'รูปถ่ายคู่บัตรประชาชน',
    file: toFile(selfie),
    needsFile: true,
  });

  const license = detail.license ?? null;
  if (LICENSE_KYC_ENABLED && (license || requiresLicense(profession))) {
    const status = license ? normalizeLicenseStatus(license.status) : null;
    const expiryYmd = toBangkokYmd(license?.expiresAt);
    const days = expiryYmd ? daysUntilBangkok(expiryYmd) : NaN;
    // E7: หมดอายุแล้ว (ตามปฏิทินไทย) แม้สถานะยังเป็นรอตรวจ — ตรงกับ AdminLicensePanel
    const expired = status === 'expired' || (Number.isFinite(days) && days < 0);
    const licenseDoc = documents.find((d) => d.id === license?.documentId);
    items.push({
      id: 'license',
      kind: 'license',
      name: 'ใบประกอบวิชาชีพ',
      meta: license
        ? [license.licenseNumber ? `เลขที่ ${license.licenseNumber}` : null, expiryYmd ? `หมดอายุ ${formatLicenseDate(expiryYmd)}` : null].filter(Boolean).join(' · ') || docMeta(licenseDoc)
        : 'ผู้ดูแลยังไม่ได้แนบใบประกอบวิชาชีพ',
      documentType: 'ใบประกอบวิชาชีพ',
      file: license
        ? { name: license.fileName, url: license.signedUrl, mimeType: licenseDoc?.mimeType ?? null, size: licenseDoc?.fileSize ?? null, uploadedAt: licenseDoc?.uploadedAt ?? null }
        : null,
      needsFile: true,
      documentId: license?.documentId ?? null,
      pendingInBe: status === 'pending',
      locked:
        status === 'approved'
          ? { s: 'pass', remark: '' }
          : status === 'rejected'
            ? { s: 'fail', remark: license?.rejectionReason ?? '' }
            : null,
      passBlockedReason: expired ? `หมดอายุแล้ว${expiryYmd ? ` (${formatLicenseDate(expiryYmd)})` : ''} — อนุมัติไม่ได้` : undefined,
    });
  }

  const driving = detail.drivingLicense ?? null;
  if (DRIVING_LICENSE_KYC_ENABLED && drivingLicenseStatus(driving) !== 'none' && driving) {
    const expiryYmd = toBangkokYmd(driving.expiresAt);
    const drivingDoc = documents.find((d) => d.id === driving.documentId);
    items.push({
      id: 'driving',
      kind: 'driving',
      name: 'ใบขับขี่',
      meta: [driving.fileName ? fileType(drivingDoc?.mimeType, driving.fileName) : null, expiryYmd ? `หมดอายุ ${formatLicenseDate(expiryYmd)}` : null]
        .filter(Boolean)
        .join(' · ') || 'ยังไม่มีไฟล์',
      documentType: 'ใบขับขี่',
      file: driving.fileName
        ? { name: driving.fileName, url: driving.signedUrl, mimeType: drivingDoc?.mimeType ?? null, size: drivingDoc?.fileSize ?? null, uploadedAt: drivingDoc?.uploadedAt ?? null }
        : null,
      needsFile: true,
      documentId: driving.documentId,
      pendingInBe: driving.status === 'pending',
      locked:
        driving.status === 'approved'
          ? { s: 'pass', remark: '' }
          : driving.status === 'rejected'
            ? { s: 'fail', remark: driving.rejectionReason ?? '' }
            : null,
      // หมดอายุอ่านจาก isExpired ของ BE เท่านั้น (ไม่ใช้นาฬิกาเครื่อง)
      passBlockedReason: driving.isExpired ? `หมดอายุแล้ว${expiryYmd ? ` (${formatLicenseDate(expiryYmd)})` : ''} — อนุมัติไม่ได้` : undefined,
    });
  }

  const certificate = latest.get('certificate');
  if (certificate) {
    items.push({
      id: 'training',
      kind: 'training',
      name: 'ใบรับรองอบรม',
      meta: docMeta(certificate, 'ไม่บังคับ'),
      documentType: 'ใบรับรองอบรม',
      file: toFile(certificate),
      needsFile: true,
    });
  }

  for (const [docType, doc] of latest) {
    if (used.has(docType)) continue;
    const label = DOC_TYPE_LABEL[docType] ?? docType;
    items.push({
      id: `doc:${docType}`,
      kind: 'doc',
      name: label,
      meta: docMeta(doc),
      documentType: label,
      file: toFile(doc),
      needsFile: true,
    });
  }

  items.push({
    id: 'info',
    kind: 'info',
    name: 'ข้อมูลส่วนตัว',
    meta: 'ตรวจชื่อ / เลขบัตร / วันเกิด ให้ตรงบัตร',
    documentType: 'ข้อมูลส่วนตัว',
    file: toFile(idFront),
    needsFile: false,
  });

  return items;
}

/**
 * ผลตรวจเริ่มต้น
 * - รอตรวจ: ว่างทั้งหมด (ยกเว้นใบที่ BE ล็อกไว้ — ใช้ item.locked แทนเสมอ)
 * - อนุมัติแล้ว: ผ่านทั้งหมด
 * - ปฏิเสธแล้ว: รายการที่อยู่ใน rejectionReasons = ไม่ผ่าน พร้อมเหตุผล · ที่เหลือ = ไม่ได้ตรวจ
 */
export function initialResults(
  items: ReviewItem[],
  kycStatus: KycStatus,
  rejectionReasons: RejectionReason[] | null | undefined,
): Record<string, CheckResult> {
  const results: Record<string, CheckResult> = {};
  for (const item of items) {
    if (kycStatus === 'verified') {
      results[item.id] = { s: 'pass', remark: '', touched: false };
      continue;
    }
    if (kycStatus === 'rejected') {
      const matched = (rejectionReasons ?? []).filter((r) => r.documentType === item.documentType);
      results[item.id] = matched.length
        ? {
            s: 'fail',
            remark: matched.map((r) => [r.title, r.detail].filter(Boolean).join(' — ')).join(CHIP_SEPARATOR),
            touched: false,
          }
        : { ...EMPTY_RESULT };
      continue;
    }
    results[item.id] = { ...EMPTY_RESULT };
  }
  return results;
}
