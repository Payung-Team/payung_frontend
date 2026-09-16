import { type ReactNode } from 'react';
import { Icon } from '../../components/ui/Icon';
import QrTokenFallback, { ScanResultBox } from './QrTokenFallback';
import { useJobQrScan, type JobScanResult } from './useJobQrScan';

// ── ป้อนโทเค็นแทนการส่องกล้อง — เครื่องมือทดสอบชั่วคราว (การ์ดแม่ PYG-433) ────
//
// ทำไมถึงต้องมี: backend บังคับแล้วว่างานที่มี QR ต้องผ่านการสแกนเท่านั้นจึงจะเริ่ม/จบงานได้
// ปุ่ม "เช็คอินเริ่มงาน" เดิมที่เรียก checkInBooking ตรง ๆ จะโดนปฏิเสธด้วยข้อความ
// "งานนี้ต้องสแกน QR ของผู้รับบริการก่อน..." → ถ้าไม่มีทางป้อนโทเค็นเข้าระบบเลย
// จะทดสอบ flow ทั้งเส้นไม่ได้จนกว่า scanner กล้อง (PYG-438) จะเสร็จ
//
// ★ scanJobQr คือ mutation ตัวเดียวกับที่ scanner กล้องเรียก ต่างกันแค่ "วิธีได้สตริงมา"
//   ตรรกะร่วมอยู่ใน useJobQrScan ส่วนช่องกรอก/อัปโหลดอยู่ใน QrTokenFallback

export type { JobScanResult };

export default function CaregiverQrScanPanel({
  bookingId,
  onScanned,
  children,
  title = 'สแกน QR ของผู้รับบริการ',
  description = 'ให้ผู้รับบริการกด "คัดลอกโทเค็น" จากหน้ารายละเอียดการจองของเขา แล้วส่งมาให้คุณวางในช่องนี้',
}: Readonly<{
  /** งานที่กำลังเปิดอยู่ — ใช้เทียบว่าโทเค็นที่ได้มาเป็นของงานใบนี้จริงไหม */
  bookingId: string;
  /** เรียกเมื่อการสแกนทำให้งานขยับจริง (ok = true) เพื่อให้หน้าแม่ refetch/สลับหน้า */
  onScanned: (result: JobScanResult) => void;
  /** เนื้อหาเพิ่มท้ายการ์ด คั่นด้วยเส้น — เช่น เวลาเช็คอิน/เช็คเอาท์ในหน้าความคืบหน้า */
  children?: ReactNode;
  /** หัวข้อ/คำอธิบายของการ์ด — เปลี่ยนตามบริบท (เริ่มงาน vs ปิดงาน) ได้ ตัวสแกนเหมือนกันทุกกรณี */
  title?: string;
  description?: string;
}>) {
  const scan = useJobQrScan(bookingId, onScanned);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]" style={{ border: '0.8px dashed #C7CACD' }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          {title}
        </h2>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: '#F0F1F3', border: '0.8px solid #E0E2E5', color: '#575859', fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <Icon name="science" size="small" color="#575859" />
          โหมดทดสอบ
        </span>
      </div>

      <p className="mb-3 mt-3 text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {description}
      </p>

      <QrTokenFallback scan={scan} />

      {scan.state && (
        <div className="mt-4">
          <ScanResultBox scan={scan} />
        </div>
      )}

      {/* -mx-5 -mb-5 ให้ส่วนล่างชิดขอบการ์ดเต็มความกว้าง เหมือนตอนเป็นการ์ดแยก */}
      {children && <div className="-mx-5 -mb-5 mt-5 border-t border-[#F0F1F3]">{children}</div>}
    </div>
  );
}
