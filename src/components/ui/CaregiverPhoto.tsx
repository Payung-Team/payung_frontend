import type { CSSProperties } from 'react';
import { useSignedPhoto } from '../../hooks/useSignedPhoto';

// ── รูปผู้ดูแล (PYG-512) ─────────────────────────────────────────────────────
// ใช้ทุกที่ที่ผู้จองเห็นหน้าผู้ดูแล: ผลค้นหา → โปรไฟล์ → ใบจอง → หน้างาน → หน้า QR เช็คอิน
// เพื่อให้ "ไม่มีรูป" หน้าตาเหมือนกันทุกหน้า และรูปที่ URL หมดอายุไม่โชว์เป็นรูปแตก
// (กติกา signed URL ดู hooks/useSignedPhoto.ts)
//
// placeholder เป็นไอคอนคน ไม่ใช่ตัวอักษรย่อ — ผู้ใช้ต้องแยกออกว่า "ผู้ดูแลคนนี้ไม่มีรูป"
// ไม่ใช่รูปที่ยังโหลดไม่เสร็จ เพราะหน้า QR ใช้รูปนี้ยืนยันตัวตนก่อนให้เข้าบ้าน

const PLACEHOLDER_BG = '#E6F5ED';
const PLACEHOLDER_ICON = '#52B69A';
const FONT_TH = "'Bai Jamjuree', sans-serif";

interface CaregiverPhotoProps {
  /** signed URL จาก BE — null/undefined/ใช้ไม่ได้ = placeholder */
  src?: string | null;
  size: number;
  /** ว่าง = รูปตกแต่ง (มีชื่อผู้ดูแลแสดงอยู่ข้าง ๆ แล้ว) */
  alt?: string;
  /** circle = อวาตาร์ทั่วไป · rounded = รูปใหญ่สำหรับเทียบหน้า (หน้า QR) */
  shape?: 'circle' | 'rounded';
  /** รูปโหลดไม่ขึ้น → ให้หน้าโหลดข้อมูลใหม่เพื่อเอา signed URL ใบใหม่ (ใช้ useSignedUrlRefresh) */
  onExpired?: () => void;
  /** ข้อความใต้ไอคอนใน placeholder — ใช้กับรูปขนาดใหญ่เท่านั้น */
  placeholderLabel?: string;
  /** ขอบ/เงาของกรอบ ตามดีไซน์ของแต่ละหน้า */
  frameStyle?: CSSProperties;
  className?: string;
}

export default function CaregiverPhoto({
  src,
  size,
  alt = '',
  shape = 'circle',
  onExpired,
  placeholderLabel,
  frameStyle,
  className,
}: Readonly<CaregiverPhotoProps>) {
  const photo = useSignedPhoto(src, onExpired);

  const frame: CSSProperties = {
    position: 'relative',
    width: size,
    height: size,
    flexShrink: 0,
    boxSizing: 'border-box',
    borderRadius: shape === 'circle' ? '50%' : Math.round(size * 0.1),
    overflow: 'hidden',
    background: PLACEHOLDER_BG,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...frameStyle,
  };

  if (photo.src) {
    return (
      <div className={className} style={frame}>
        <img
          src={photo.src}
          alt={alt}
          onError={photo.onError}
          decoding="async"
          draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div className={className} style={frame} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
      <span
        className="material-icons"
        aria-hidden="true"
        style={{ fontSize: Math.round(size * (placeholderLabel ? 0.45 : 0.6)), color: PLACEHOLDER_ICON, lineHeight: 1 }}
      >
        person
      </span>
      {placeholderLabel && (
        <span style={{ marginTop: 6, fontFamily: FONT_TH, fontSize: 13, fontWeight: 600, color: '#3A9A7E', lineHeight: '18px', textAlign: 'center', padding: '0 8px' }}>
          {placeholderLabel}
        </span>
      )}
    </div>
  );
}
