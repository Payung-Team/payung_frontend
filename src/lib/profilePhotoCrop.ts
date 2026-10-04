/**
 * Crop รูปโปรไฟล์เป็นสี่เหลี่ยมจัตุรัสฝั่ง client — PYG-488
 *
 * ทำไมต้อง normalize เป็น canvas ก่อนแสดง crop UI: ต้องอ่าน EXIF orientation ให้ถูก
 * (เหมือน jobEvidence.ts) ไม่งั้นรูปแนวตั้งจากมือถือจะตะแคงตอน crop แล้วพิกัดเพี้ยน
 *
 * Export ผลลัพธ์เป็น JPEG เสมอ (canvas → image/jpeg) — แก้ปัญหารูป HEIC จาก iPhone
 * เพราะ browser decode ให้เราแล้วผ่าน <canvas>, ไม่ว่าไฟล์ต้นทางจะเป็นชนิดไหน
 * ผลลัพธ์ที่ส่งไป backend จะเป็น JPEG เสมอ ให้ util ตัด EXIF เดิมทำงานได้ปกติ
 */

import { decodeImage } from './jobEvidence';

export class PhotoCropError extends Error {}

/** เพดานไฟล์ต้นฉบับก่อน crop — กว้างกว่าปกติเพราะยังไม่ได้ย่อ (กันไม่ให้ decode ไฟล์ใหญ่เกินเหตุ) */
export const MAX_CROP_SOURCE_BYTES = 20 * 1024 * 1024;

/** ตรวจไฟล์ต้นฉบับก่อนเปิดหน้าจอ crop — คืนข้อความไทยถ้าไม่ผ่าน
 *  ยอมรับไฟล์ image/* กว้าง ๆ (รวม HEIC/HEIF จาก iPhone) เพราะขั้นตอน crop
 *  จะแปลงเป็น JPEG ให้เองเสมอ ไม่ต้องเข้มงวดเรื่องชนิดไฟล์ตั้งแต่จุดนี้ */
export function validatePhotoSourceFile(file: File): string | null {
  const isImage = file.type === '' || file.type.startsWith('image/');
  if (!isImage) {
    return 'ไม่ใช่ไฟล์รูปภาพ กรุณาเลือกไฟล์รูปภาพ';
  }
  if (file.size > MAX_CROP_SOURCE_BYTES) {
    return 'ไฟล์ใหญ่เกิน 20MB กรุณาเลือกรูปภาพอื่น';
  }
  return null;
}

/** decode ไฟล์ต้นฉบับ (พร้อมแก้ EXIF orientation) แล้ววาดลง canvas ขนาดเท่าต้นฉบับ
 *  ใช้ canvas นี้ทั้งแสดงพรีวิวตอน crop และเป็นต้นทางตอน export ผลลัพธ์ */
export async function decodeToCanvas(file: File): Promise<HTMLCanvasElement> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await decodeImage(file);
  } catch {
    throw new PhotoCropError('เปิดไฟล์รูปนี้ไม่ได้ กรุณาเลือกรูปอื่น');
  }

  const width = source.width;
  const height = source.height;
  if (!width || !height) {
    if ('close' in source) source.close();
    throw new PhotoCropError('ไฟล์รูปไม่ถูกต้อง');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if ('close' in source) source.close();
    throw new PhotoCropError('เบราว์เซอร์นี้ไม่รองรับการ crop รูป');
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source as CanvasImageSource, 0, 0, width, height);

  if ('close' in source) source.close();
  return canvas;
}

export interface SquareCropRect {
  /** พิกัด/ขนาดเป็น pixel จริงบน canvas ต้นฉบับ (ไม่ใช่ pixel ที่แสดงผลบนจอ) */
  x: number;
  y: number;
  size: number;
}

/** เพดานด้านของรูปหลัง crop — พอสำหรับ avatar ไม่เปลืองพื้นที่เกินจำเป็น */
const OUTPUT_SIZE = 640;

/** JPEG quality เดียว (รูปสี่เหลี่ยมจัตุรัสขนาดคงที่ ไม่มีเคสไฟล์ใหญ่เกินคาดเหมือนรูปหลักฐานเต็มจอ) */
const OUTPUT_QUALITY = 0.9;

/** ตัดรูปตาม rect ที่เลือกแล้ว export เป็น JPEG สี่เหลี่ยมจัตุรัส */
export function cropToSquareJpeg(source: HTMLCanvasElement, rect: SquareCropRect): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new PhotoCropError('เบราว์เซอร์นี้ไม่รองรับการ crop รูป');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.drawImage(source, rect.x, rect.y, rect.size, rect.size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new PhotoCropError('สร้างรูปที่ crop แล้วไม่สำเร็จ กรุณาลองใหม่'));
      },
      'image/jpeg',
      OUTPUT_QUALITY,
    );
  });
}
