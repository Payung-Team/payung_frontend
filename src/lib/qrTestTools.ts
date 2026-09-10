/**
 * เครื่องมือทดสอบ QR ก่อน launch (การ์ดแม่ PYG-433)
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ★★★ ของชุดนี้ "ชั่วคราว" — มีไว้ทดสอบตอนที่ยังไม่มี scanner กล้อง ★★★
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ปัญหาที่แก้: backend บังคับแล้วว่างานที่มี QR ต้อง "สแกน" เท่านั้นถึงจะเริ่ม/จบงานได้
 * (assertScanned ใน monitoring.service.ts) แต่ scanner กล้องฝั่งผู้ดูแลยังไม่เสร็จ (PYG-438)
 * → ถ้าไม่มีทางป้อน token เข้าระบบเลย จะทดสอบ flow ทั้งเส้นไม่ได้จนกว่า PYG-438 จะเสร็จ
 *
 * ทางออกชั่วคราว มีสองเส้น ปลายทางเดียวกันคือ mutation scanJobQr:
 *   1. คัดลอกโทเค็น — ผู้รับบริการกดคัดลอก (จอโชว์เป็น ••••) → ส่งให้ผู้ดูแล → วางในช่องกรอก
 *      เส้นนี้ตรงที่สุด เพราะ QR เป็นแค่ "รูปของสตริง" อยู่แล้ว ตัวสตริงคือของจริง
 *   2. รูป QR — ผู้รับบริการ "บันทึกรูป" ลงเครื่อง → ผู้ดูแล "อัปโหลดรูป" → ถอดด้วย jsQR
 *      อ้อมกว่า แต่ได้ทดสอบว่าภาพ QR ที่เราวาดถอดกลับเป็นสตริงเดิมได้จริง
 *
 * ⚠️ ความเสี่ยงที่ต้องรู้ก่อนเปิดใช้บน production:
 *    ทั้งสองเส้นทำสิ่งเดียวกันคือ "เอาความลับออกจากหน้าจอ" — โทเค็นที่คัดลอกไปแปะในแชต
 *    หรือรูป QR ที่เซฟลงเครื่อง ใครได้ไปก็เช็คอิน/เช็คเอาท์งานใบนั้นได้ในช่วงที่ QR ยังใช้ได้
 *    ซึ่งขัดกับเจตนาของ QR ที่ควรอยู่แค่บนจอและถูกอ่านด้วยกล้องเท่านั้น
 *    → ค่าเริ่มต้นของ flag นี้จึงเปิดเฉพาะตอน dev เท่านั้น
 *    → เมื่อ PYG-438 (scanner กล้อง) เสร็จแล้ว ให้ลบทั้งไฟล์นี้และจุดที่เรียกใช้ทิ้ง
 */

// ──────────────────────────────────────────────────────────────────────────
// สวิตช์เปิด/ปิด
// ──────────────────────────────────────────────────────────────────────────

/**
 * เปิดเครื่องมือทดสอบไหม
 *
 *   ไม่ตั้ง VITE_QR_TEST_TOOLS  → เปิดเฉพาะตอน `npm run dev` (build จริงปิด)
 *   VITE_QR_TEST_TOOLS=true     → เปิด (ใช้ตอนอยากทดสอบบน staging ที่ build แล้ว)
 *   VITE_QR_TEST_TOOLS=false    → ปิด แม้อยู่ใน dev
 *
 * ตั้งใจให้ "ต้องพิมพ์ true ด้วยมือ" ถึงจะติดไปกับ build — กันเผลอ deploy ขึ้น production
 */
function readTestToolsFlag(): boolean {
  const raw = import.meta.env.VITE_QR_TEST_TOOLS as string | undefined;
  if (raw === undefined || raw === '') return import.meta.env.DEV;
  return raw === 'true';
}

export const QR_TEST_TOOLS_ENABLED = readTestToolsFlag();

// ──────────────────────────────────────────────────────────────────────────
// ฝั่งผู้รับบริการ: บันทึกรูป QR
// ──────────────────────────────────────────────────────────────────────────

/**
 * ขนาดรูป QR ที่บันทึกลงเครื่อง (พิกเซล)
 *
 * ใหญ่กว่าที่แสดงบนหน้าจอ (200px) เพราะรูปที่บันทึกไว้จะถูกเอาไปถอดรหัสอีกที
 * ยิ่งแต่ละช่องของ QR กินพื้นที่หลายพิกเซล ตัวถอดรหัสยิ่งอ่านพลาดยาก
 */
export const QR_DOWNLOAD_SIZE = 512;

/** เซฟ canvas เป็นไฟล์ PNG ลงเครื่องผู้ใช้ */
export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): void {
  const url = canvas.toDataURL('image/png');

  // สร้าง <a download> ชั่วคราวแล้วสั่งคลิก — วิธีมาตรฐานของการดาวน์โหลดฝั่ง client
  // (ไม่ได้เพิ่มลิงก์นี้ค้างไว้ใน DOM จึงไม่กระทบ layout อะไร)
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ──────────────────────────────────────────────────────────────────────────
// ฝั่งผู้ดูแล: อ่าน QR จากไฟล์รูป
// ──────────────────────────────────────────────────────────────────────────

/**
 * ด้านที่ยาวที่สุดของรูปที่ยอมให้ถอดรหัส (พิกเซล)
 *
 * รูปจากกล้องมือถือทุกวันนี้กว้าง 4000px ขึ้นไป การถอดรหัสภาพขนาดนั้นกิน RAM
 * และช้าโดยไม่ได้ความแม่นเพิ่ม — ย่อลงเหลือ 2000px ยังเหลือรายละเอียดพอสำหรับ QR
 */
const MAX_DECODE_EDGE_PX = 2000;

/** สาเหตุที่อ่าน QR จากรูปไม่สำเร็จ — ให้ UI เลือกข้อความเองได้ */
export type QrDecodeFailure = 'not_an_image' | 'unreadable' | 'no_qr_found';

export type QrDecodeResult =
  | { ok: true; token: string }
  | { ok: false; reason: QrDecodeFailure };

/** โหลดไฟล์เป็น <img> ที่พร้อมวาดลง canvas */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    // คืน object URL ทุกทางออก ไม่งั้น blob ค้างใน memory จนกว่าจะปิดแท็บ
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('decode failed'));
    };

    img.src = url;
  });
}

/**
 * อ่านสตริงที่ซ่อนอยู่ในรูป QR
 *
 * ★ คืนค่าที่อ่านได้ "ดิบ ๆ" ไม่ trim ไม่แปลงตัวพิมพ์ ไม่ตัดอะไรทั้งนั้น
 *   เพราะ backend จะ hash ทั้งสตริงแล้วเทียบกับดีบี แตะอะไรเข้าไปแม้แต่ตัวเดียว
 *   hash จะไม่ตรงและสแกนไม่ผ่านทุกครั้ง (กติกาเดียวกับตอนวาด QR)
 */
export async function decodeQrFromFile(file: File): Promise<QrDecodeResult> {
  if (!file.type.startsWith('image/')) {
    return { ok: false, reason: 'not_an_image' };
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(file);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  // ย่อรูปตามสัดส่วนเดิมถ้าใหญ่เกินเพดาน (scale ≤ 1 เสมอ — ไม่เคยขยายรูปเล็กให้ใหญ่ขึ้น
  // เพราะการขยายไม่ได้เพิ่มรายละเอียด มีแต่ทำให้ขอบเบลอจนอ่านยากกว่าเดิม)
  const longestEdge = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longestEdge > MAX_DECODE_EDGE_PX ? MAX_DECODE_EDGE_PX / longestEdge : 1;
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // willReadFrequently: บอก browser ว่าเราจะอ่าน pixel กลับ ไม่ได้จะวาดใส่หน้าจอ
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { ok: false, reason: 'unreadable' };

  ctx.drawImage(img, 0, 0, width, height);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return { ok: false, reason: 'unreadable' };
  }

  // ★ โหลด jsQR ตอนใช้จริงเท่านั้น (dynamic import) ไม่ใช่ตอนเปิดแอป
  //   ตัวถอดรหัสหนักราว 140 KB ถ้า import ไว้ข้างบนไฟล์ ผู้ใช้ทุกคนต้องโหลดติดไปด้วย
  //   ทั้งที่ 99% ไม่เคยกดปุ่มนี้ — และ build จริงที่ปิด flag ไว้ก็จะไม่โหลดเลย
  const { default: jsQR } = await import('jsqr');

  // attemptBoth = ลองทั้งภาพปกติและภาพกลับสี เผื่อผู้ใช้ถ่ายจากจอโหมดมืด
  // หรือแคปหน้าจอมาแล้วสีกลับด้าน — ราคาที่จ่ายคือช้าขึ้นเล็กน้อย คุ้มกว่าอ่านไม่ออก
  const decoded = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' });

  if (!decoded?.data) return { ok: false, reason: 'no_qr_found' };

  return { ok: true, token: decoded.data };
}

// ──────────────────────────────────────────────────────────────────────────
// คัดลอกโทเค็นไปยังคลิปบอร์ด
// ──────────────────────────────────────────────────────────────────────────

/**
 * คัดลอกข้อความลงคลิปบอร์ด — คืน true เมื่อสำเร็จ
 *
 * ทำไมต้องมีทางสำรอง: `navigator.clipboard` ใช้ได้เฉพาะใน "secure context"
 * คือ https หรือ localhost เท่านั้น ตอนทดสอบกันในทีมมักเปิดผ่าน IP ในวง LAN
 * (เช่น http://192.168.1.20:5173) ซึ่งไม่ใช่ secure context → API ตัวใหม่หายไปเฉย ๆ
 * ถ้าไม่มีทางสำรอง ปุ่มจะกดแล้วเงียบโดยไม่มีใครรู้ว่าทำไม
 *
 * ทางสำรองใช้ execCommand('copy') ซึ่งถูกประกาศ deprecated แล้วก็จริง
 * แต่ยังทำงานได้ในทุกเบราว์เซอร์ปัจจุบัน และนี่คือเครื่องมือทดสอบชั่วคราวอยู่แล้ว
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  // ทางหลัก — ใช้ได้เมื่อเปิดผ่าน https หรือ localhost
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // ผู้ใช้ไม่อนุญาต หรือเบราว์เซอร์ปฏิเสธ → ตกไปใช้ทางสำรองข้างล่าง
    }
  }

  // ทางสำรอง — วาง textarea ที่มองไม่เห็นแล้วสั่งคัดลอกจากตรงนั้น
  const textarea = document.createElement('textarea');
  textarea.value = text;
  // ต้องอยู่ในหน้าจริงถึงจะ select ได้ แต่ไม่ให้เห็นและไม่ให้ดันหน้าเลื่อน
  textarea.style.position = 'fixed';
  textarea.style.top = '-1000px';
  textarea.setAttribute('readonly', '');
  document.body.appendChild(textarea);

  try {
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    // ต้องลบทิ้งเสมอ ไม่งั้น textarea ที่มี token อยู่ข้างในจะค้างใน DOM
    document.body.removeChild(textarea);
  }
}
