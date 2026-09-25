import { useCallback, useRef, useState } from 'react';

// ── รูปผู้ดูแลแบบ signed URL (PYG-512 · การ์ดแม่ PYG-488) ─────────────────────
//
// รูปโปรไฟล์อยู่ใน bucket private — BE คืน avatarUrl เป็น signed URL อายุ 1 ชม.
// (AvatarUrlService ฝั่ง BE) หมดอายุแล้ว <img> จะโหลดไม่ขึ้นและโชว์รูปแตก
//
// กติกาฝั่ง FE:
//   1. รูปโหลดไม่ขึ้น → ตกเป็น placeholder ทันที ห้ามโชว์รูปแตก
//   2. แล้วขอข้อมูลชุดนั้นใหม่ (refetch) เพื่อให้ได้ signed URL ใบใหม่ — ไม่ต่ออายุ URL เอง
//   3. ไม่เก็บ URL ลง localStorage / sessionStorage — เก็บข้ามวันเมื่อไหร่ก็เป็นรูปแตกแน่นอน
//      ที่มาของ URL ต้องเป็น query ที่เพิ่งโหลด (Apollo cache อยู่ในหน่วยความจำ หายเมื่อปิดแท็บ)

/**
 * refetch ซ้ำได้ไม่เกิน 1 ครั้งต่อช่วงนี้
 * หน้าผลค้นหามีรูปหลายใบที่หมดอายุพร้อมกัน — รวมให้เหลือ request เดียว
 * และถ้า URL ใหม่ยังโหลดไม่ได้ (เช่น เน็ตหลุด) จะไม่วนยิงซ้ำไม่รู้จบ
 */
const REFRESH_COOLDOWN_MS = 30_000;

/**
 * รับเฉพาะ URL เต็มที่ <img> โหลดได้
 * ค่าอื่น (เช่น storage path ดิบ ก่อน BE PYG-509 จะ sign ให้ครบทุก resolver) = ไม่มีรูป
 * ถ้าปล่อยผ่าน เบราว์เซอร์จะยิง path นั้นเข้าโดเมนของ FE เอง แล้วได้รูปแตกกลับมา
 */
function isDisplayablePhotoUrl(url: string | null | undefined): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

export interface SignedPhoto {
  /** URL ที่ควรวาด — null = ใช้ placeholder (ไม่มีรูป / URL ใช้ไม่ได้ / โหลดพังไปแล้ว) */
  src: string | null;
  /** ผูกกับ onError ของ <img> */
  onError: () => void;
}

/**
 * ตัดสินว่าจะวาดรูปจาก URL นี้หรือใช้ placeholder
 *
 * จำ URL ที่โหลดพังไว้ — URL เดิมจะไม่ถูกลองซ้ำ พอ refetch ได้ URL ใบใหม่มา
 * (signed URL ทุกใบไม่ซ้ำกัน) ก็จะลองโหลดใบใหม่ให้เอง
 */
export function useSignedPhoto(
  url: string | null | undefined,
  onExpired?: () => void,
): SignedPhoto {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = isDisplayablePhotoUrl(url) && url !== failedSrc ? url : null;

  const onError = useCallback(() => {
    if (!src) return;
    setFailedSrc(src);
    onExpired?.();
  }, [src, onExpired]);

  return { src, onError };
}

/**
 * ห่อ refetch ของหน้าให้ใช้เป็น onExpired ของรูปได้ปลอดภัย
 * (ยิงไม่เกิน 1 ครั้งต่อ REFRESH_COOLDOWN_MS และกลืน error — รูปเป็นแค่ของประกอบ
 * refetch ล้มก็แค่ค้าง placeholder ไว้ ไม่ควรทำให้หน้าพัง)
 */
export function useSignedUrlRefresh(refetch: (() => unknown) | undefined): () => void {
  const lastAtRef = useRef(0);

  return useCallback(() => {
    if (!refetch) return;
    const now = Date.now();
    if (now - lastAtRef.current < REFRESH_COOLDOWN_MS) return;
    lastAtRef.current = now;
    try {
      Promise.resolve(refetch()).catch(() => undefined);
    } catch {
      // refetch โยน error แบบ sync (เช่น query ถูก skip) — ปล่อย placeholder ไว้ตามเดิม
    }
  }, [refetch]);
}
