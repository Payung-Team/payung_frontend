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

// ── ฝั่งแอดมิน (PYG-665 · BE PYG-575 / PYG-663) ────────────────────────────

export type ProfessionChangeStatus = ProfessionChangeRequest['status'];

export interface AdminProfessionChangeRequest extends ProfessionChangeRequest {
  caregiverId: string;
  caregiverName: string;
  caregiverNumber: string | null;
  reviewerName: string | null;
  licenseDocument: (ProfessionChangeRequest['licenseDocument'] & { reviewStatus: string | null }) | null;
}

/** คิวตรวจ: pending เรียงยื่นเก่าสุดก่อน · สถานะอื่นเรียงตัดสินล่าสุดก่อน */
export const ADMIN_PROFESSION_CHANGE_REQUESTS = gql`
  query AdminProfessionChangeRequests($input: AdminProfessionChangeRequestsInput) {
    adminProfessionChangeRequests(input: $input) {
      items {
        id
        caregiverId
        caregiverName
        caregiverNumber
        fromProfession
        toProfession
        status
        licenseNumber
        licenseExpiresAt
        licenseDocument {
          id
          fileName
          signedUrl
          reviewStatus
        }
        rejectionReason
        requestedAt
        reviewedAt
        reviewerName
      }
      total
      page
      totalPages
    }
  }
`;

/** จำนวนคำขอรอตรวจ — badge ในเมนูแอดมิน */
export const ADMIN_PROFESSION_CHANGE_PENDING_COUNT = gql`
  query AdminProfessionChangePendingCount {
    adminProfessionChangeRequests(input: { status: pending, limit: 1 }) {
      total
    }
  }
`;

/** อนุมัติ = เปลี่ยนวิชาชีพ + อนุมัติใบประกอบฯ ที่แนบ ในทรานแซคชันเดียว (PYG-663) */
export const APPROVE_PROFESSION_CHANGE_REQUEST = gql`
  mutation ApproveProfessionChangeRequest($id: ID!) {
    approveProfessionChangeRequest(id: $id) {
      id
      status
      reviewedAt
    }
  }
`;

/** ปฏิเสธ = วิชาชีพคงเดิม + ใบที่ยังรอตรวจถูกปฏิเสธด้วยเหตุผลเดียวกัน */
export const REJECT_PROFESSION_CHANGE_REQUEST = gql`
  mutation RejectProfessionChangeRequest($id: ID!, $reason: String!) {
    rejectProfessionChangeRequest(input: { id: $id, reason: $reason }) {
      id
      status
      rejectionReason
      reviewedAt
    }
  }
`;
