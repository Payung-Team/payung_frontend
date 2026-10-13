import { gql } from "@apollo/client";

/**
 * PYG-556 · S01-AC6 — ขอเปลี่ยนวิชาชีพหลัง KYC อนุมัติแล้ว (ต้องรอแอดมินตรวจ)
 *
 * ⚠ ข้อเสนอ contract ฝั่ง FE — BE ยังไม่มี operation เหล่านี้ (PYG-573 / PYG-575)
 *   ยังไม่ถูกเรียกใช้ ตอนนี้ useProfessionChange เป็น mock · ถ้า BE ตั้งชื่อต่างจากนี้ แก้ที่ไฟล์นี้ที่เดียว
 *
 * status: pending | approved | rejected | cancelled
 * วิชาชีพที่ต้องมีใบประกอบฯ (nurse / physiotherapist) ต้องส่ง licenseDocumentId + licenseNumber + licenseExpiresAt
 * licenseExpiresAt = 'YYYY-MM-DD' — BE แปลงเป็นสิ้นวันเวลาไทยก่อนเก็บลง kyc_documents.expires_at (ตาม PYG-586)
 * เอกสารอัปโหลดผ่าน uploadKycDocument ด้วย docType = professional_license (S03 · PYG-558)
 */
const REQUEST_FIELDS = `
  id
  fromProfession
  toProfession
  status
  licenseNumber
  licenseExpiresAt
  licenseDocument {
    id
    fileName
    signedUrl
  }
  rejectionReason
  requestedAt
  reviewedAt
`;

/** คำขอล่าสุดของผู้ดูแลที่ล็อกอินอยู่ · null = ไม่เคยขอ */
export const MY_PROFESSION_CHANGE_REQUEST = gql`
  query MyProfessionChangeRequest {
    myProfessionChangeRequest {
      ${REQUEST_FIELDS}
    }
  }
`;

export const REQUEST_PROFESSION_CHANGE = gql`
  mutation RequestProfessionChange($input: ProfessionChangeInput!) {
    requestProfessionChange(input: $input) {
      ${REQUEST_FIELDS}
    }
  }
`;

export const CANCEL_PROFESSION_CHANGE_REQUEST = gql`
  mutation CancelProfessionChangeRequest($id: ID!) {
    cancelProfessionChangeRequest(id: $id) {
      id
      status
    }
  }
`;

export interface ProfessionChangeRequest {
  id: string;
  fromProfession: string;
  toProfession: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  licenseNumber: string | null;
  licenseExpiresAt: string | null;
  licenseDocument: { id: string; fileName: string; signedUrl: string | null } | null;
  rejectionReason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
}
