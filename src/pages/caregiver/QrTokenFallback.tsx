import { useId, useRef, useState } from 'react';
import { Icon } from '../../components/ui/Icon';
import { decodeQrFromFile, type QrDecodeFailure } from '../../lib/qrTestTools';
import { TONE_STYLE, type JobQrScanController } from './useJobQrScan';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

/** ข้อความตอนอ่านรูปไม่ออก — คนละเรื่องกับการสแกนถูกปฏิเสธ จึงเขียนเอง ไม่ได้มาจาก server */
const DECODE_FAILURE_COPY: Record<QrDecodeFailure, string> = {
  not_an_image: 'ไฟล์นี้ไม่ใช่รูปภาพ กรุณาเลือกไฟล์ .png หรือ .jpg',
  unreadable: 'เปิดไฟล์รูปนี้ไม่ได้ อาจเสียหายหรือเป็นชนิดที่เบราว์เซอร์ไม่รองรับ',
  no_qr_found: 'ไม่พบ QR ในรูปนี้ ลองใช้รูปที่เห็น QR เต็มใบและไม่เบลอ',
};

/**
 * ป้อนโทเค็นแทนการส่องกล้อง — ส่วนควบคุมล้วน ๆ ไม่มีกรอบการ์ดของตัวเอง
 * ใช้ทั้งในการ์ดเช็คอิน (CaregiverQrScanPanel) และในโหมดทดสอบของกล้องสแกน (CheckOutScanModal)
 *
 * รับโทเค็นได้ 2 ทาง แต่ปลายทางเป็น mutation scanJobQr ตัวเดียวกันหมด:
 *   1. วางโทเค็นที่ผู้รับบริการคัดลอกส่งมา  ← ทางหลัก เร็วและพลาดยากที่สุด
 *   2. อัปโหลดรูป QR แล้วถอดรหัสในเบราว์เซอร์ ← ได้ทดสอบว่าภาพ QR ถอดกลับได้จริงด้วย
 *
 * ⚠️ ข้อจำกัดที่ตั้งใจ: ไม่ส่งพิกัด GPS ไปกับการสแกน — งานที่เช็คอินทางนี้จะไม่มีข้อมูลระยะทาง
 */
export default function QrTokenFallback({ scan }: Readonly<{ scan: JobQrScanController }>) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tokenText, setTokenText] = useState('');
  const { busy } = scan;

  /** เส้นทางที่ 1 — วางโทเค็นที่ผู้รับบริการคัดลอกส่งมา */
  async function handleSubmitToken() {
    // ★ trim ตรงนี้ "ปลอดภัยและจำเป็น" ต่างจากเส้นทางรูปที่ห้ามแตะ
    //   โทเค็นเป็น base64url ซึ่งไม่มีวรรค/ขึ้นบรรทัดใหม่อยู่ในตัวอักษรที่ใช้ได้เลย
    //   การ trim จึงตัดได้แต่ขยะจากการคัดลอก-วาง (เช่น เว้นวรรคท้ายจากแอปแชต)
    //   ถ้าไม่ trim ผู้ใช้จะเจอ TOKEN_NOT_FOUND โดยไม่มีทางเดาว่าเพราะช่องว่างตัวเดียว
    const token = tokenText.trim();
    if (!token) return;
    const feedback = await scan.runScan(token);
    if (feedback.tone === 'success') setTokenText('');
  }

  /** เส้นทางที่ 2 — อ่านโทเค็นจากรูป QR */
  async function handleFile(file: File) {
    scan.setBusy(true);
    scan.setState(null);

    // ถอดรหัสในเบราว์เซอร์ ไม่ได้อัปโหลดไฟล์ไปไหน
    const decoded = await decodeQrFromFile(file);

    // ล้างค่าใน input เพื่อให้เลือก "ไฟล์เดิมซ้ำ" แล้ว onChange ยิงอีกรอบได้
    // (เบราว์เซอร์ไม่ยิง change ถ้าค่าเดิมไม่เปลี่ยน ซึ่งกวนมากตอนไล่เทส)
    if (fileInputRef.current) fileInputRef.current.value = '';
    scan.setBusy(false);

    if (!decoded.ok) {
      scan.setState({ tone: 'error', title: 'อ่าน QR จากรูปไม่ได้', detail: DECODE_FAILURE_COPY[decoded.reason] });
      return;
    }

    // ★ ส่งค่าที่ถอดได้ "ดิบ ๆ" ไม่ trim — ต่างจากช่องกรอกมือ เพราะค่านี้มาจากตัวถอดรหัส
    //   ไม่ได้ผ่านมือคน จึงไม่มีขยะให้ตัด และการแตะมันคือการเปลี่ยนของที่ QR บรรจุไว้จริง
    await scan.runScan(decoded.token);
  }

  const canSubmitToken = tokenText.trim().length > 0 && !busy;

  return (
    <div>
      {/* ── ทางหลัก: วางโทเค็น ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={tokenText}
          onChange={(e) => setTokenText(e.target.value)}
          // กด Enter ในช่องเดียว = ส่ง เป็นสิ่งที่ทุกคนคาดหวังอยู่แล้ว
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmitToken();
          }}
          placeholder="วางโทเค็นที่ได้รับมาที่นี่"
          disabled={busy}
          // ปิดตัวช่วยของเบราว์เซอร์ทั้งหมด — โทเค็นไม่ใช่คำในภาษาคน
          // ถ้าปล่อยไว้ autocorrect บนมือถือจะแก้ตัวอักษรให้เองจนสแกนไม่ผ่าน
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-11 flex-1 rounded-xl border border-[#E0E2E5] bg-white px-3.5 text-sm text-[#1A1A1A] outline-none focus:border-[#52B69A] focus:ring-2 focus:ring-[#52B69A]/20 disabled:bg-[#F6F7F8]"
          style={{ fontFamily: "'Inter', monospace" }}
        />
        <button
          type="button"
          onClick={() => void handleSubmitToken()}
          disabled={!canSubmitToken}
          className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#52B69A] px-6 text-sm font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition hover:bg-[#489e86] disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] disabled:shadow-none"
          style={FONT}
        >
          <Icon name={busy ? 'hourglass_top' : 'login'} color={canSubmitToken ? '#FFFFFF' : '#9CA3AF'} size="small" />
          {busy ? 'กำลังส่ง...' : 'ยืนยันโทเค็น'}
        </button>
      </div>

      {/* ── ทางสำรอง: อัปโหลดรูป QR ────────────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#E0E2E5]" />
        <span className="text-[11px] text-[#B0B3B8]" style={FONT}>
          หรือใช้รูป QR
        </span>
        <span className="h-px flex-1 bg-[#E0E2E5]" />
      </div>

      {/* ปุ่มจริงคือ <input type="file"> ที่ซ่อนไว้ ส่วน <label> ทำหน้าที่เป็นปุ่มที่คนเห็น
          วิธีนี้ยังเข้าถึงด้วยคีย์บอร์ด/screen reader ได้ครบ ต่างจากการเอา div มาทำปุ่มเอง */}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <label
        htmlFor={inputId}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#E0E2E5] bg-white text-sm font-semibold text-[#575859] transition hover:border-[#52B69A] hover:text-[#3A9A7E] sm:w-auto sm:px-6"
        style={{ ...FONT, opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
      >
        <Icon name="upload_file" color="currentColor" size="small" />
        อัปโหลดรูป QR แทน
      </label>

      <p className="mt-2.5 text-[11px] text-[#8A8C8E]" style={FONT}>
        การป้อนโทเค็นไม่ส่งพิกัดตำแหน่ง — งานที่สแกนด้วยวิธีนี้จะไม่มีข้อมูลระยะทาง
      </p>
    </div>
  );
}

/** กล่องแสดงผลการสแกน — รูปแบบเดียวกันทั้งในการ์ดและในโมดัลกล้อง */
export function ScanResultBox({ scan }: Readonly<{ scan: JobQrScanController }>) {
  const { state } = scan;
  if (!state) return null;
  const tone = TONE_STYLE[state.tone];

  return (
    <div
      className="flex items-start gap-2.5 rounded-xl p-3.5"
      style={{ backgroundColor: tone.bg, border: `0.8px solid ${tone.border}` }}
      role="status"
    >
      <Icon name={tone.icon} color={tone.iconColor} />
      <div>
        <p className="text-sm font-semibold" style={{ color: tone.text, ...FONT }}>
          {state.title}
        </p>
        <p className="mt-1 text-xs text-[#575859]" style={FONT}>
          {state.detail}
        </p>
        {state.wrongBooking && (
          <p className="mt-1.5 text-xs font-semibold text-[#B91C1C]" style={FONT}>
            ⚠ โทเค็นนี้เป็นของงานอื่น ไม่ใช่งานที่เปิดอยู่ — ระบบได้บันทึกให้งานใบนั้นไปแล้ว
          </p>
        )}
      </div>
    </div>
  );
}
