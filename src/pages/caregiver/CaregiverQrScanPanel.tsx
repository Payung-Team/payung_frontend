import { useId, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { SCAN_JOB_QR } from '../../graphql/queries';
import { Icon } from '../../components/ui/Icon';
import { extractGraphQLErrorMessage } from '../../lib/apolloErrors';
import { decodeQrFromFile, type QrDecodeFailure } from '../../lib/qrTestTools';

// ── ป้อนโทเค็นแทนการส่องกล้อง — เครื่องมือทดสอบชั่วคราว (การ์ดแม่ PYG-433) ────
//
// ทำไมถึงต้องมี: backend บังคับแล้วว่างานที่มี QR ต้องผ่านการสแกนเท่านั้นจึงจะเริ่ม/จบงานได้
// ปุ่ม "เช็คอินเริ่มงาน" เดิมที่เรียก checkInBooking ตรง ๆ จะโดนปฏิเสธด้วยข้อความ
// "งานนี้ต้องสแกน QR ของผู้รับบริการก่อน..." → ถ้าไม่มีทางป้อนโทเค็นเข้าระบบเลย
// จะทดสอบ flow ทั้งเส้นไม่ได้จนกว่า scanner กล้อง (PYG-438) จะเสร็จ
//
// หน้านี้รับโทเค็นได้ 2 ทาง แต่ปลายทางเป็น mutation scanJobQr ตัวเดียวกันหมด:
//   1. วางโทเค็นที่ผู้รับบริการคัดลอกส่งมา  ← ทางหลัก เร็วและพลาดยากที่สุด
//   2. อัปโหลดรูป QR แล้วถอดรหัสในเบราว์เซอร์ ← ได้ทดสอบว่าภาพ QR ถอดกลับได้จริงด้วย
//
// ★ scanJobQr คือ mutation ตัวเดียวกับที่ scanner กล้องจะเรียกในอนาคต ต่างกันแค่
//   "วิธีได้สตริงมา" ผลการทดสอบด้วยหน้านี้จึงเชื่อถือได้ ยกเว้นเรื่องเดียวคือ
//   ยังไม่ได้พิสูจน์ว่ากล้องจริงอ่านรูปได้
//
// ⚠️ ข้อจำกัดที่ตั้งใจ: หน้านี้ "ไม่ส่งพิกัด GPS" ไปกับการสแกน
//    งานที่เช็คอินผ่านหน้านี้จึงไม่มีระยะทาง/ไม่มีธงเรื่องตำแหน่ง — ตั้งใจให้เป็นแบบนั้น
//    เพราะเป็นเครื่องมือทดสอบ ไม่ใช่ทางเข้างานจริง (ของจริงรอ PYG-438)

/** ผลการสแกนที่ backend คืนมา — ชื่อฟิลด์ตรงกับ type JobScanResult ใน schema.gql */
export interface JobScanResult {
  ok: boolean;
  result: string;
  action: 'CHECK_IN' | 'CHECK_OUT' | 'NONE';
  bookingId: string | null;
  sessionStatus: 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | null;
  message: string;
  scannedAt: string;
  jobEvent: { serverTs: string; distanceM: number | null; reviewReasons: string[] } | null;
}

/** ข้อความตอนอ่านรูปไม่ออก — คนละเรื่องกับการสแกนถูกปฏิเสธ จึงเขียนเอง ไม่ได้มาจาก server */
const DECODE_FAILURE_COPY: Record<QrDecodeFailure, string> = {
  not_an_image: 'ไฟล์นี้ไม่ใช่รูปภาพ กรุณาเลือกไฟล์ .png หรือ .jpg',
  unreadable: 'เปิดไฟล์รูปนี้ไม่ได้ อาจเสียหายหรือเป็นชนิดที่เบราว์เซอร์ไม่รองรับ',
  no_qr_found: 'ไม่พบ QR ในรูปนี้ ลองใช้รูปที่เห็น QR เต็มใบและไม่เบลอ',
};

/** สีของกล่องผลลัพธ์ — เขียว = งานขยับจริง, ส้ม = ถูกปฏิเสธแต่เข้าใจได้, แดง = อ่านรูป/ระบบพัง */
type ResultTone = 'success' | 'rejected' | 'error';

const TONE_STYLE: Record<ResultTone, { bg: string; border: string; text: string; icon: string; iconColor: string }> = {
  success: { bg: '#ECFDF5', border: 'rgba(16,185,129,.3)', text: '#047857', icon: 'check_circle', iconColor: '#047857' },
  rejected: { bg: '#FFFBEB', border: 'rgba(245,158,11,.35)', text: '#B45309', icon: 'error_outline', iconColor: '#B45309' },
  error: { bg: '#FEF2F2', border: 'rgba(220,38,38,.25)', text: '#B91C1C', icon: 'report', iconColor: '#DC2626' },
};

const ACTION_LABEL: Record<JobScanResult['action'], string> = {
  CHECK_IN: 'เช็คอิน (เริ่มงาน)',
  CHECK_OUT: 'เช็คเอาท์ (ปิดงาน)',
  NONE: 'ไม่มีการเปลี่ยนแปลง',
};

interface PanelState {
  tone: ResultTone;
  title: string;
  detail: string;
  /** true = โทเค็นที่ได้มาเป็นของงานใบอื่น (backend ทำ action ให้งานใบนั้นไปแล้ว) */
  wrongBooking?: boolean;
}

export default function CaregiverQrScanPanel({
  bookingId,
  onScanned,
}: Readonly<{
  /** งานที่กำลังเปิดอยู่ — ใช้เทียบว่าโทเค็นที่ได้มาเป็นของงานใบนี้จริงไหม */
  bookingId: string;
  /** เรียกเมื่อการสแกนทำให้งานขยับจริง (ok = true) เพื่อให้หน้าแม่ refetch/สลับหน้า */
  onScanned: (result: JobScanResult) => void;
}>) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tokenText, setTokenText] = useState('');
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<PanelState | null>(null);
  const [scanJobQr] = useMutation<{ scanJobQr: JobScanResult }>(SCAN_JOB_QR);

  /**
   * ส่งโทเค็นให้ backend ตัดสิน — จุดรวมของทั้งสองเส้นทาง
   *
   * ★ ส่ง `token` ตามที่ได้มาเป๊ะ ๆ ไม่แปลงตัวพิมพ์ ไม่ตัดอะไรตรงกลาง
   *   เพราะ backend จะ hash ทั้งสตริงแล้วเทียบกับดีบี
   */
  async function runScan(token: string) {
    setBusy(true);
    setState(null);

    try {
      const { data } = await scanJobQr({
        variables: { input: { token, deviceTs: new Date().toISOString() } },
      });

      const result = data?.scanJobQr;
      if (!result) {
        setState({ tone: 'error', title: 'ไม่ได้รับผลลัพธ์จากระบบ', detail: 'กรุณาลองใหม่อีกครั้ง' });
        return;
      }

      // ★ ถูกปฏิเสธไม่ใช่ error — backend ตั้งใจคืน ok=false พร้อมเหตุผล
      //   ข้อความไทยใน message เจาะจงกว่าที่เราจะเขียนเองมาก จึงแสดงตรง ๆ
      if (!result.ok) {
        setState({ tone: 'rejected', title: `สแกนไม่ผ่าน · ${result.result}`, detail: result.message });
        return;
      }

      const wrongBooking = result.bookingId !== null && result.bookingId !== bookingId;

      setState({
        tone: 'success',
        title: `${ACTION_LABEL[result.action]} สำเร็จ`,
        detail: result.message,
        wrongBooking,
      });
      setTokenText('');

      // แจ้งหน้าแม่เฉพาะตอนที่โทเค็นเป็นของงานใบนี้จริง — ถ้าเป็นงานใบอื่น
      // การสลับหน้าใบนี้ตามจะยิ่งทำให้เข้าใจผิดว่างานใบนี้เริ่มแล้ว
      if (!wrongBooking) onScanned(result);
    } catch (err) {
      setState({
        tone: 'error',
        title: 'ส่งผลการสแกนไม่สำเร็จ',
        detail: extractGraphQLErrorMessage(err) ?? 'เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่',
      });
    } finally {
      setBusy(false);
    }
  }

  /** เส้นทางที่ 1 — วางโทเค็นที่ผู้รับบริการคัดลอกส่งมา */
  function handleSubmitToken() {
    // ★ trim ตรงนี้ "ปลอดภัยและจำเป็น" ต่างจากเส้นทางรูปที่ห้ามแตะ
    //   โทเค็นเป็น base64url ซึ่งไม่มีวรรค/ขึ้นบรรทัดใหม่อยู่ในตัวอักษรที่ใช้ได้เลย
    //   การ trim จึงตัดได้แต่ขยะจากการคัดลอก-วาง (เช่น เว้นวรรคท้ายจากแอปแชต)
    //   ถ้าไม่ trim ผู้ใช้จะเจอ TOKEN_NOT_FOUND โดยไม่มีทางเดาว่าเพราะช่องว่างตัวเดียว
    const token = tokenText.trim();
    if (!token) return;
    void runScan(token);
  }

  /** เส้นทางที่ 2 — อ่านโทเค็นจากรูป QR */
  async function handleFile(file: File) {
    setBusy(true);
    setState(null);

    // ถอดรหัสในเบราว์เซอร์ ไม่ได้อัปโหลดไฟล์ไปไหน
    const decoded = await decodeQrFromFile(file);

    // ล้างค่าใน input เพื่อให้เลือก "ไฟล์เดิมซ้ำ" แล้ว onChange ยิงอีกรอบได้
    // (เบราว์เซอร์ไม่ยิง change ถ้าค่าเดิมไม่เปลี่ยน ซึ่งกวนมากตอนไล่เทส)
    if (fileInputRef.current) fileInputRef.current.value = '';
    setBusy(false);

    if (!decoded.ok) {
      setState({ tone: 'error', title: 'อ่าน QR จากรูปไม่ได้', detail: DECODE_FAILURE_COPY[decoded.reason] });
      return;
    }

    // ★ ส่งค่าที่ถอดได้ "ดิบ ๆ" ไม่ trim — ต่างจากช่องกรอกมือ เพราะค่านี้มาจากตัวถอดรหัส
    //   ไม่ได้ผ่านมือคน จึงไม่มีขยะให้ตัด และการแตะมันคือการเปลี่ยนของที่ QR บรรจุไว้จริง
    await runScan(decoded.token);
  }

  const tone = state ? TONE_STYLE[state.tone] : null;
  const canSubmitToken = tokenText.trim().length > 0 && !busy;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]" style={{ border: '0.8px dashed #C7CACD' }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          สแกน QR ของผู้รับบริการ
        </h2>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: '#F0F1F3', border: '0.8px solid #E0E2E5', color: '#575859', fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <Icon name="science" size="small" color="#575859" />
          โหมดทดสอบ
        </span>
      </div>

      <p className="mt-3 text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        ให้ผู้รับบริการกด "คัดลอกโทเค็น" จากหน้ารายละเอียดการจองของเขา แล้วส่งมาให้คุณวางในช่องนี้
      </p>

      {/* ── ทางหลัก: วางโทเค็น ─────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={tokenText}
          onChange={(e) => setTokenText(e.target.value)}
          // กด Enter ในช่องเดียว = ส่ง เป็นสิ่งที่ทุกคนคาดหวังอยู่แล้ว
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitToken();
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
          onClick={handleSubmitToken}
          disabled={!canSubmitToken}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#52B69A] px-6 text-sm font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition hover:bg-[#489e86] disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF] disabled:shadow-none"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <Icon name={busy ? 'hourglass_top' : 'login'} color={canSubmitToken ? '#FFFFFF' : '#9CA3AF'} size="small" />
          {busy ? 'กำลังส่ง...' : 'ยืนยันโทเค็น'}
        </button>
      </div>

      {/* ── ทางสำรอง: อัปโหลดรูป QR ────────────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#E0E2E5]" />
        <span className="text-[11px] text-[#B0B3B8]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
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
        style={{ fontFamily: "'Bai Jamjuree', sans-serif", opacity: busy ? 0.6 : 1, cursor: busy ? 'wait' : 'pointer' }}
      >
        <Icon name="upload_file" color="currentColor" size="small" />
        อัปโหลดรูป QR แทน
      </label>

      {state && tone && (
        <div
          className="mt-4 flex items-start gap-2.5 rounded-xl p-3.5"
          style={{ backgroundColor: tone.bg, border: `0.8px solid ${tone.border}` }}
          role="status"
        >
          <Icon name={tone.icon} color={tone.iconColor} />
          <div>
            <p className="text-sm font-semibold" style={{ color: tone.text, fontFamily: "'Bai Jamjuree', sans-serif" }}>
              {state.title}
            </p>
            <p className="mt-1 text-xs text-[#575859]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              {state.detail}
            </p>
            {state.wrongBooking && (
              <p className="mt-1.5 text-xs font-semibold text-[#B91C1C]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                ⚠ โทเค็นนี้เป็นของงานอื่น ไม่ใช่งานที่เปิดอยู่ — ระบบได้บันทึกให้งานใบนั้นไปแล้ว
              </p>
            )}
          </div>
        </div>
      )}

      <p className="mt-2.5 text-[11px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        หน้านี้ไม่ส่งพิกัดตำแหน่งไปกับการสแกน — งานที่เช็คอินผ่านหน้านี้จะไม่มีข้อมูลระยะทาง
      </p>
    </div>
  );
}
