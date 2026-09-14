// PYG-466 — REST client สำหรับ "บันทึกจากผู้ดูแล" พร้อมรูป (endpoint เป็น multipart ไม่ใช่ GraphQL)
// รูปอัปโหลดผ่าน backend เข้า bucket care-log-images — client ไม่แตะ storage เอง

import { supabase } from './supabase';

// REST base = ตัด /graphql ออกจาก VITE_GRAPHQL_URL (pattern เดียวกับ adminDisputeApi)
const API_BASE = ((import.meta.env.VITE_GRAPHQL_URL as string) || 'http://localhost:3000/graphql').replace(
  '/graphql',
  '',
);

export interface CreatedCareLog {
  id: string;
  bookingId: string;
  category: string;
  body: string;
  photoUrl?: string | null;
  serverTs: string;
  deviceTs?: string | null;
}

export interface CreateCareLogPayload {
  category: string;
  body: string;
  deviceTs: string;
  /** JPEG ที่ย่อแล้ว (≤ 5 MB) — backend รับเฉพาะ image/jpeg */
  photo?: Blob | null;
}

/**
 * POST /api/v1/monitoring/bookings/:bookingId/care-logs
 * ★ ห้ามเพิ่ม field อื่นใน FormData — backend จำกัด fields: 3 (category, body, deviceTs) + files: 1
 */
export async function createCareLog(bookingId: string, payload: CreateCareLogPayload): Promise<CreatedCareLog> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  const form = new FormData();
  form.append('category', payload.category);
  form.append('body', payload.body);
  form.append('deviceTs', payload.deviceTs);
  if (payload.photo) {
    form.append('photo', payload.photo, 'photo.jpg');
  }

  // ไม่ตั้ง Content-Type เอง — เบราว์เซอร์ต้องใส่ boundary ของ multipart ให้
  const res = await fetch(`${API_BASE}/api/v1/monitoring/bookings/${encodeURIComponent(bookingId)}/care-logs`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  if (!res.ok) {
    // NestJS error body: { message: string | string[], statusCode, error }
    let message = res.status === 413 ? 'ไฟล์รูปใหญ่เกินไป กรุณาเลือกรูปอื่น' : 'บันทึกการดูแลไม่สำเร็จ กรุณาลองใหม่';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (body?.message && res.status !== 413) {
        message = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      }
    } catch {
      // ไม่มี body JSON — ใช้ข้อความ default
    }
    throw new Error(message);
  }

  return res.json() as Promise<CreatedCareLog>;
}
