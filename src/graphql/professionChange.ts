import { gql } from "@apollo/client";

/**
 * PYG-556 · S01-AC6 — ขอเปลี่ยนวิชาชีพหลัง KYC อนุมัติแล้ว (ต้องรอแอดมินตรวจ)
 *
 * ตาม contract PYG-573 §4 (BE: PYG-575) — ใช้ใน useProfessionChange
 *
 * status: pending | approved | rejected | cancelled
 * ProfessionChangeInput = { profession, licenseDocumentId? } — licenseDocumentId บังคับเมื่อเป็นพยาบาล/นักกายภาพฯ (BE PYG-663)
 *   licenseNumber / licenseExpiresAt ('YYYY-MM-DD') / licenseDocument มาจากใบที่แนบ · licenseDocument.signedUrl เป็น null เสมอ
 *   (ไฟล์ดูที่หน้าสถานะ KYC)
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
