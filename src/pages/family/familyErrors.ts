import {
  extractGraphQLErrorCode,
  extractGraphQLErrorMessage,
} from '../../lib/apolloErrors';

/**
 * Family-group error codes (mirror of family-group.errors.ts on the API).
 * The server owns this contract; the FE only branches on it.
 */
export const FG_ERROR = {
  GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
  NOT_A_MEMBER: 'NOT_A_MEMBER',
  NOT_GROUP_OWNER: 'NOT_GROUP_OWNER',
  LAST_OWNER: 'LAST_OWNER',
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  ALREADY_OWNER: 'ALREADY_OWNER',
  GROUP_NAME_INVALID: 'GROUP_NAME_INVALID',
  RECIPIENT_NOT_IN_GROUP: 'RECIPIENT_NOT_IN_GROUP',
  JOIN_LINK_INVALID: 'JOIN_LINK_INVALID',
  JOIN_LINK_EXPIRED: 'JOIN_LINK_EXPIRED',
  JOIN_LINK_REVOKED: 'JOIN_LINK_REVOKED',
  JOIN_LINK_EXHAUSTED: 'JOIN_LINK_EXHAUSTED',
  GROUP_MEMBER_LIMIT_REACHED: 'GROUP_MEMBER_LIMIT_REACHED',
  JOIN_LINK_NOT_FOUND: 'JOIN_LINK_NOT_FOUND',
  JOIN_LINK_CONFIG_MISSING: 'JOIN_LINK_CONFIG_MISSING',
} as const;

export type FgErrorCode = (typeof FG_ERROR)[keyof typeof FG_ERROR];

export function getFgErrorCode(err: unknown): string | undefined {
  return extractGraphQLErrorCode(err);
}

// The API's messages are already Thai and meant to be shown verbatim; this map is a
// fallback for the codes we want to phrase in our own words on the FE.
const MESSAGES: Record<string, string> = {
  [FG_ERROR.NOT_GROUP_OWNER]: 'เฉพาะเจ้าของกลุ่มเท่านั้นที่ทำรายการนี้ได้',
  [FG_ERROR.LAST_OWNER]:
    'คุณเป็นเจ้าของกลุ่มคนสุดท้าย กรุณาโอนสิทธิ์ให้สมาชิกคนอื่นก่อน หรือลบกลุ่มทิ้ง',
  [FG_ERROR.MEMBER_NOT_FOUND]: 'ไม่พบสมาชิกคนนี้ในกลุ่มแล้ว',
  [FG_ERROR.GROUP_NAME_INVALID]: 'ชื่อกลุ่มต้องไม่เว้นว่าง และยาวไม่เกิน 80 ตัวอักษร',
  [FG_ERROR.JOIN_LINK_INVALID]: 'ลิงก์นี้ใช้ไม่ได้ กรุณาขอลิงก์ใหม่จากเจ้าของกลุ่ม',
  [FG_ERROR.JOIN_LINK_EXPIRED]: 'ลิงก์นี้หมดอายุแล้ว กรุณาขอลิงก์ใหม่จากเจ้าของกลุ่ม',
  [FG_ERROR.JOIN_LINK_REVOKED]: 'ลิงก์นี้ถูกยกเลิกไปแล้ว กรุณาขอลิงก์ใหม่จากเจ้าของกลุ่ม',
  [FG_ERROR.JOIN_LINK_EXHAUSTED]: 'ลิงก์นี้ถูกใช้ครบจำนวนแล้ว กรุณาขอลิงก์ใหม่จากเจ้าของกลุ่ม',
  [FG_ERROR.GROUP_MEMBER_LIMIT_REACHED]: 'กลุ่มนี้มีสมาชิกครบแล้ว',
  [FG_ERROR.JOIN_LINK_CONFIG_MISSING]:
    'ระบบยังตั้งค่าลิงก์เข้าร่วมกลุ่มไม่ครบ กรุณาแจ้งผู้ดูแลระบบ',
};

/**
 * Human-readable message for a caught GraphQL error. Prefers a known code mapping, then
 * the server-sent message (Thai, meant to be shown verbatim), then a generic line.
 */
export function fgErrorMessage(err: unknown): string {
  const code = getFgErrorCode(err);
  if (code && MESSAGES[code]) return MESSAGES[code];
  return extractGraphQLErrorMessage(err) ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';
}
