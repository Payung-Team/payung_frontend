import { gql } from '@apollo/client';
import { DRIVING_LICENSE_KYC_ENABLED } from '../lib/drivingLicense';

/**
 * ใบขับขี่ (PYG-598) — contract ตาม src/schema.gql ของ payung_backend `dev` (PYG-597 · PYG-596 ยังไม่เคาะ)
 *
 * ⚠ ใส่ใน query เฉพาะเมื่อ VITE_DRIVING_LICENSE_KYC_ENABLED=true — BE ที่ยังไม่มี field เหล่านี้
 *   จะปฏิเสธทั้ง operation (หน้า KYC / หน้า review โหลดไม่ขึ้น)
 */

const DRIVING_LICENSE_FIELDS = `
      documentId
      fileName
      signedUrl
      expiresAt
      status
      rejectionReason
      isExpired
      verified
`;

/** kycStatus.drivingLicense — สถานะของผู้ดูแลเอง */
export const DRIVING_LICENSE_STATUS_FIELD = DRIVING_LICENSE_KYC_ENABLED
  ? `drivingLicense {${DRIVING_LICENSE_FIELDS}}`
  : '';

/** adminKycDetail.drivingLicense + ประวัติการตรวจ */
export const ADMIN_DRIVING_LICENSE_FIELD = DRIVING_LICENSE_KYC_ENABLED
  ? `
      drivingLicense {${DRIVING_LICENSE_FIELDS}}
      drivingLicenseReviews {
        id
        action
        reason
        reviewerName
        reviewedAt
      }
    `
  : '';

export const APPROVE_DRIVING_LICENSE = gql`
  mutation ApproveDrivingLicense($documentId: ID!) {
    approveDrivingLicense(documentId: $documentId) {
      documentId
      status
      reviewedAt
    }
  }
`;

export const REJECT_DRIVING_LICENSE = gql`
  mutation RejectDrivingLicense($documentId: ID!, $reason: String) {
    rejectDrivingLicense(input: { documentId: $documentId, reason: $reason }) {
      documentId
      status
      reviewedAt
    }
  }
`;
