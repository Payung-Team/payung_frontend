import type { DrivingLicenseInfo } from '../../../lib/drivingLicense';
import type { LicenseInfo } from '../../../lib/license';
import type { CaregiverCareLevelInfo } from '../../../graphql/careLevel';
import type { DrivingLicenseReview } from '../AdminDrivingLicensePanel';

export type KycStatus = 'pending' | 'verified' | 'rejected' | 'none' | string;

export interface RejectionReason {
  title: string;
  detail?: string | null;
  documentType?: string | null;
}

export interface CaregiverDetail {
  id: string;
  userId: string;
  caregiverNumber?: string | null;
  fullName: string;
  email?: string | null;
  idCardNumber: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  phone: string;
  skills: string[];
  profession?: string | null;
  customSkills?: string[] | null;
  experienceYears: number;
  hourlyRate: number;
  bio?: string | null;
  kycStatus: KycStatus;
  kycSubmittedAt?: string | null;
  kycVerifiedAt?: string | null;
  resubmitCount: number;
  /** เหตุผลจากการปฏิเสธครั้งล่าสุด — ใช้แสดงผลตรวจแบบอ่านอย่างเดียว */
  rejectionReasons?: RejectionReason[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface KycDocument {
  id: string;
  docType: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  /** BE PR #39: ใช้ signedUrl เท่านั้น (fileUrl เป็นสตริงว่างเสมอ) — อายุ 15 นาที */
  signedUrl?: string | null;
  uploadedAt: string;
}

export interface KycReview {
  id: string;
  action: string;
  reason?: string | null;
  reviewedBy: string;
  reviewerName?: string | null;
  reviewedAt: string;
}

export interface CaregiverEditLog {
  id: string;
  action: string;
  editorName?: string | null;
  createdAt: string;
  fieldChanges?: Array<{ field: string; oldValue?: string; newValue?: string }> | null;
}

export interface AdminPayoutAccountSummary {
  bankCode: string;
  accountName: string;
  accountNumberLast4: string;
  status: string;
  recipientStatus: string;
  hasOmiseRecipient: boolean;
}

export interface AdminKycDetail {
  caregiver: CaregiverDetail;
  documents: KycDocument[];
  resubmitCount: number;
  reviews: KycReview[];
  editHistory: CaregiverEditLog[];
  payoutAccount?: AdminPayoutAccountSummary | null;
  /** PYG-511: มีรูปโปรไฟล์รออนุมัติ → แสดงลิงก์ไปหน้าเทียบรูป */
  pendingProfilePhotoDocumentId?: string | null;
  /** PYG-588 (field จาก PYG-587 — ขอเฉพาะเมื่อเปิด VITE_LICENSE_KYC_ENABLED) */
  profession?: string | null;
  license?: LicenseInfo | null;
  /** PYG-598 (field จาก PYG-597 — ขอเฉพาะเมื่อเปิด VITE_DRIVING_LICENSE_KYC_ENABLED) */
  drivingLicense?: DrivingLicenseInfo | null;
  drivingLicenseReviews?: DrivingLicenseReview[] | null;
  /** PYG-581: ระดับปัจจุบัน + ผู้กำหนด + เวลา */
  careLevelInfo?: CaregiverCareLevelInfo | null;
}

export interface AdminKycDetailResponse {
  adminKycDetail: AdminKycDetail;
}
