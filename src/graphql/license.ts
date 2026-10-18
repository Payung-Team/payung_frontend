import { gql } from '@apollo/client';
import { LICENSE_KYC_ENABLED } from '../lib/license';

/**
 * ใบประกอบวิชาชีพ (PYG-588) — contract ตาม branch `feature/PYG-587` ของ payung_backend
 *
 * ⚠ field เหล่านี้ยังไม่มีใน schema ของ dev — ใส่ใน query เฉพาะเมื่อ VITE_LICENSE_KYC_ENABLED=true
 *   ไม่งั้น GraphQL ปฏิเสธทั้ง operation (หน้า KYC / หน้า review โหลดไม่ขึ้น)
 */

/**
 * LicenseInfo — kycStatus.license และ adminKycDetail.license
 * `profession` ระดับ payload มาพร้อมกันใน PYG-587 (อ่านจาก caregivers.profession) — คนละตัวกับ
 * caregiver.profession ของ PYG-575 ที่ยังไม่ deploy (PROFESSION_FIELD ใน queries.ts)
 */
export const LICENSE_INFO_FIELD = LICENSE_KYC_ENABLED
  ? `
      profession
      license {
        documentId
        licenseNumber
        fileName
        signedUrl
        expiresAt
        status
        rejectionReason
      }
    `
  : '';

/** field เพิ่มของ KycDocument — ใช้เติมฟอร์มตอนแก้ KYC ที่ถูกปฏิเสธ */
export const LICENSE_DOCUMENT_FIELDS = LICENSE_KYC_ENABLED
  ? `
        fileSize
        licenseNumber
        expiresAt
        reviewStatus
        rejectionReason
    `
  : '';

export const APPROVE_LICENSE = gql`
  mutation ApproveLicense($documentId: ID!) {
    approveLicense(documentId: $documentId) {
      documentId
      status
      reviewedAt
    }
  }
`;

export const REJECT_LICENSE = gql`
  mutation RejectLicense($documentId: ID!, $reason: String) {
    rejectLicense(input: { documentId: $documentId, reason: $reason }) {
      documentId
      status
      reviewedAt
    }
  }
`;
