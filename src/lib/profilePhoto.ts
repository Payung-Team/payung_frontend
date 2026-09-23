/**
 * อัปรูปโปรไฟล์ผ่าน backend — PYG-507
 *
 * ใช้ร่วมกันระหว่างหน้า Onboarding กับ modal แก้ไขโปรไฟล์
 *
 * ทำไมต้องย่อเป็น JPEG ก่อนส่ง: BE รับเฉพาะ JPEG (ตรวจจาก byte จริง) และไม่เกิน 5 MB
 * ถ้าส่ง PNG/WebP หรือรูปดิบจากกล้องมือถือไปตรง ๆ ผู้ใช้จะโดนปฏิเสธทั้งที่เลือกรูปถูกแล้ว
 * ย่อฝั่ง client ยังช่วยหมุนรูปตาม EXIF ให้ด้วย — BE ตัด EXIF ทิ้ง รูปแนวตั้งจะได้ไม่ตะแคง
 */
import { supabase } from './supabase';
import { resizeToJpeg } from './jobEvidence';

const API_BASE = ((import.meta.env.VITE_GRAPHQL_URL as string) || 'http://localhost:3000/graphql')
  .replace('/graphql', '');

export const ALLOWED_PROFILE_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** เพดานไฟล์ต้นฉบับ — หลังย่อจะเหลือไม่เกิน 4 MB อยู่แล้ว แต่ไม่ decode ไฟล์ใหญ่เกินเหตุในเบราว์เซอร์ */
export const MAX_PROFILE_PHOTO_SOURCE_BYTES = 15 * 1024 * 1024;

export interface ProfilePhotoResult {
  /** 'approved' = แสดงแล้ว, 'pending' = ผู้ดูแล รอแอดมินอนุมัติก่อนผู้อื่นจะเห็น */
  reviewStatus: string;
  /** signed URL ของรูปที่เพิ่งอัป (หมดอายุ 1 ชม.) — null ถ้า BE sign ไม่สำเร็จ */
  photoUrl: string | null;
}

/** ตรวจไฟล์ก่อนแสดงพรีวิว — คืนข้อความไทยถ้าไม่ผ่าน */
export function validateProfilePhoto(file: File): string | null {
  if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(file.type)) {
    return 'รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP';
  }
  if (file.size > MAX_PROFILE_PHOTO_SOURCE_BYTES) {
    return 'ไฟล์ใหญ่เกิน 15MB กรุณาเลือกรูปภาพอื่น';
  }
  return null;
}

export async function uploadProfilePhoto(file: File): Promise<ProfilePhotoResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('กรุณาเข้าสู่ระบบใหม่อีกครั้ง');

  const jpeg = await resizeToJpeg(file);

  const body = new FormData();
  body.append('photo', jpeg, 'profile.jpg');

  const res = await fetch(`${API_BASE}/api/v1/profile/photo`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  });

  if (!res.ok) {
    // BE ตอบข้อความไทยที่โชว์ได้เลย (เช่น "รองรับเฉพาะรูป JPEG") — ใช้ของ BE ก่อนเสมอ
    const detail = await res
      .json()
      .then((b: { message?: string }) => b.message)
      .catch(() => undefined);
    throw new Error(detail ?? 'อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
  }

  return (await res.json()) as ProfilePhotoResult;
}
