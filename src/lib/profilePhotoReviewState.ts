/**
 * สถานะ "รออนุมัติ/ถูกปฏิเสธ" ของรูปโปรไฟล์ผู้ดูแล — PYG-488
 *
 * เก็บไว้ฝั่ง client ชั่วคราว (localStorage) เพราะตอนนี้ backend ยังไม่มี field
 * สำหรับ query สถานะนี้ย้อนหลัง (มีแค่ endpoint อัปโหลดที่ตอบ reviewStatus ตอนอัปสำเร็จ
 * — ดู src/lib/profilePhoto.ts) และยังไม่มี mutation ฝั่งแอดมินสำหรับอนุมัติ/ปฏิเสธรูปนี้โดยเฉพาะ
 *
 * เมื่อ backend เพิ่ม field เหล่านี้ใน GraphQL แล้ว (เช่นบน myCaregiverProfile)
 * ให้เปลี่ยนมาอ่านจาก query แทน แล้วลบไฟล์นี้ได้เลย — โครงสร้าง PhotoReviewState
 * ตั้งชื่อให้ตรงกับ field ที่คาดว่า backend จะเพิ่มไว้แล้ว
 */

export type PhotoReviewStatus = 'pending' | 'rejected';

export interface PhotoReviewState {
  status: PhotoReviewStatus;
  /** signed URL ของรูปที่รออนุมัติ (หมดอายุตามที่ backend sign ไว้ ~1 ชม.) */
  photoUrl: string | null;
  /** เหตุผลจากแอดมิน — มีเฉพาะตอน status เป็น rejected */
  rejectionReason?: string;
  updatedAt: string;
}

const STORAGE_PREFIX = 'caregiver-photo-review-';

function storageKey(caregiverId: string): string {
  return `${STORAGE_PREFIX}${caregiverId}`;
}

export function getPhotoReviewState(caregiverId: string): PhotoReviewState | null {
  try {
    const raw = localStorage.getItem(storageKey(caregiverId));
    if (!raw) return null;
    return JSON.parse(raw) as PhotoReviewState;
  } catch {
    return null;
  }
}

export function savePendingPhotoReview(caregiverId: string, photoUrl: string | null): void {
  const state: PhotoReviewState = {
    status: 'pending',
    photoUrl,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(storageKey(caregiverId), JSON.stringify(state));
  } catch {
    // localStorage เต็ม/ถูกบล็อก — ปล่อยผ่าน แค่ผู้ใช้จะไม่เห็น badge รออนุมัติหลัง refresh
  }
}

export function clearPhotoReviewState(caregiverId: string): void {
  try {
    localStorage.removeItem(storageKey(caregiverId));
  } catch {
    // ไม่มีอะไรต้องทำ
  }
}
