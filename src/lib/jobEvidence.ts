/**
 * รูปหลักฐานประกอบการปิดงาน — ย่อขนาดฝั่ง client แล้วอัปโหลดเข้า bucket (PYG-358 STEP 2.3)
 *
 * ทำไมต้องย่อก่อนเสมอ: รูปจากกล้องมือถือปกติ 4–8 MB ส่วน bucket รับไม่เกิน 5 MB
 * ถ้าอัปโหลดดิบ ๆ ผู้ดูแลจะเจอ error ทั้งที่ทำถูกทุกอย่าง
 *
 * ★ รูปเป็น "หลักฐานประกอบ" เท่านั้น ไม่มีน้ำหนักต่อคำตัดสิน
 *   บนเดสก์ท็อป <input type="file"> เปิด file picker ผู้ใช้แนบรูปอะไรก็ได้จากดิสก์
 *   จึงห้ามผูกรูปเข้ากับการปล่อยเงินโดยเด็ดขาด
 */
import { supabase } from './supabase';
import { MAX_EVIDENCE_BYTES } from './monitoring';

/** ชื่อ bucket — ต้องตรงกับ JOB_EVIDENCE_BUCKET ฝั่ง backend */
export const JOB_EVIDENCE_BUCKET = 'job-evidence';

/** รับเฉพาะ jpeg/png ตามการ์ด (ผลลัพธ์หลังย่อเป็น jpeg เสมอ) */
export const ACCEPTED_EVIDENCE_TYPES = ['image/jpeg', 'image/png'];

/** ด้านยาวสุดหลังย่อ — พอให้แอดมินดูออกว่าเกิดอะไรขึ้น โดยไม่เปลืองแบนด์วิดท์ */
const MAX_EDGE_PX = 1600;

/** เผื่อขอบไว้จาก 5 MB — กัน overhead ของ multipart แล้วโดนปฏิเสธที่ปลายทาง */
const TARGET_BYTES = 4 * 1024 * 1024;

/** ไล่ลดคุณภาพทีละขั้นจนกว่าไฟล์จะเล็กพอ */
const QUALITY_STEPS = [0.85, 0.72, 0.6, 0.48];

export class EvidenceError extends Error {}

/** ตรวจชนิดไฟล์ก่อนทำอะไรทั้งสิ้น — คืนข้อความไทยถ้าไม่ผ่าน */
export function validateEvidenceFile(file: File): string | null {
  if (!ACCEPTED_EVIDENCE_TYPES.includes(file.type)) {
    return 'รองรับเฉพาะไฟล์ JPG หรือ PNG';
  }
  return null;
}

/**
 * โหลดไฟล์เป็นบิตแมป
 *
 * ใช้ createImageBitmap เพราะมันอ่าน EXIF orientation ให้ด้วย
 * (รูปถ่ายแนวตั้งจากมือถือจะได้ไม่ตะแคงหลังย่อ)
 * เบราว์เซอร์เก่าที่ยังไม่รองรับ option นี้ → fallback ไปทาง <img>
 */
async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // ตกไปใช้ fallback ข้างล่าง
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new EvidenceError('เปิดไฟล์รูปไม่สำเร็จ'));
      img.src = url;
    });
  } finally {
    // ปล่อย URL หลัง decode เสร็จ ไม่งั้น blob ค้างใน memory ทั้ง session
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

/**
 * ย่อรูปให้เป็น JPEG ที่เล็กกว่าเพดานของ bucket
 *
 * กลยุทธ์: ย่อด้านยาวสุดให้ไม่เกิน MAX_EDGE_PX ก่อน แล้วค่อยไล่ลดคุณภาพ
 * ถ้ายังใหญ่อยู่ก็หดขนาดลงอีกครึ่งแล้ววนใหม่ (รูปพาโนรามาความละเอียดสูงมาก)
 */
export async function resizeToJpeg(file: File): Promise<Blob> {
  const source = await decodeImage(file);
  const srcWidth = source.width;
  const srcHeight = source.height;

  if (!srcWidth || !srcHeight) {
    throw new EvidenceError('ไฟล์รูปไม่ถูกต้อง');
  }

  let maxEdge = MAX_EDGE_PX;

  // อย่างมาก 3 รอบ: 1600 → 800 → 400 px ยังไงก็ต้องลงต่ำกว่าเพดาน
  for (let attempt = 0; attempt < 3; attempt++) {
    const scale = Math.min(1, maxEdge / Math.max(srcWidth, srcHeight));
    const width = Math.max(1, Math.round(srcWidth * scale));
    const height = Math.max(1, Math.round(srcHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new EvidenceError('เบราว์เซอร์นี้ย่อรูปไม่ได้');

    // JPEG ไม่มี alpha — เททับพื้นขาวไว้ก่อน ไม่งั้น PNG โปร่งใสจะกลายเป็นพื้นดำ
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= TARGET_BYTES) {
        if ('close' in source) source.close();
        return blob;
      }
    }

    maxEdge = Math.round(maxEdge / 2);
  }

  if ('close' in source) source.close();
  throw new EvidenceError('ย่อรูปให้เล็กพอไม่ได้ กรุณาเลือกรูปอื่น');
}

/** path ที่ backend คาดหวัง: {bookingId}/check-out-{timestamp}.jpg */
export function evidenceObjectPath(bookingId: string, eventType: 'check-in' | 'check-out'): string {
  return `${bookingId}/${eventType}-${Date.now()}.jpg`;
}

/**
 * อัปโหลดรูปหลักฐาน แล้วคืน "path" ที่จะส่งไปกับ mutation
 *
 * ★ ส่ง path ไม่ใช่ public URL — backend ตรวจว่า path ขึ้นต้นด้วย {bookingId}/ จริง
 *   (bucket นี้เป็น private อยู่แล้ว public URL เปิดดูไม่ได้)
 */
export async function uploadJobEvidence(
  bookingId: string,
  file: File,
  eventType: 'check-in' | 'check-out' = 'check-out',
): Promise<string> {
  const typeError = validateEvidenceFile(file);
  if (typeError) throw new EvidenceError(typeError);

  const resized = await resizeToJpeg(file);

  // กันพลาดชั้นสุดท้าย — ถ้ายังเกินเพดาน อย่าเพิ่งยิงขึ้น network
  if (resized.size > MAX_EVIDENCE_BYTES) {
    throw new EvidenceError('ไฟล์ใหญ่เกินไป กรุณาเลือกรูปอื่น');
  }

  const path = evidenceObjectPath(bookingId, eventType);

  const { error } = await supabase.storage
    .from(JOB_EVIDENCE_BUCKET)
    .upload(path, resized, { contentType: 'image/jpeg', upsert: false });

  if (error) {
    throw new EvidenceError('อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่');
  }

  return path;
}
