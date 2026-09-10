import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { useJobQr } from '../../hooks/useJobQr';
import { formatWhen, shouldShowJobQr, type JobQr, type ScanAction } from '../../lib/jobQr';
import {
  copyTextToClipboard,
  downloadCanvasPng,
  QR_DOWNLOAD_SIZE,
  QR_TEST_TOOLS_ENABLED,
} from '../../lib/qrTestTools';
import type { BookingStatus } from '../../utils/bookingStatus';

// ── การ์ด QR ฝั่งผู้รับบริการ (PYG-437 · การ์ดแม่ PYG-433) ────────────────────
//
// เรื่องราวของหน้าจอนี้: ผู้รับบริการเปิดจอให้ผู้ดูแล "สแกน" ตอนมาถึงและตอนกลับ
//   สแกนครั้งแรก   = เช็คอิน   (PENDING    → CHECKED_IN)
//   สแกนครั้งที่สอง = เช็คเอาท์ (CHECKED_IN → CHECKED_OUT)
// QR ใบเดียวใช้ทั้งสองครั้ง — เซิร์ฟเวอร์ดูจาก "สถานะปัจจุบัน" ว่าครั้งต่อไปคือ action ไหน
// การ์ดใบนี้จึงไม่ต้องคิดแทน แค่เอา nextAction ที่ backend ส่งมาไปเขียนหัวข้อ
//
// ★ กติกาความปลอดภัยที่ห้ามแก้:
//   1. วาด QR จาก token "ทั้งสตริงตรง ๆ" ห้ามเติม prefix / URL / ช่องว่าง
//      (backend hash ทั้งสตริงแล้วเทียบ — เติมอะไรเข้าไป = สแกนไม่ผ่านทุกครั้ง)
//   2. ไม่วาด QR เลยเมื่อ isActive = false — QR ที่ค้างอยู่บนจอนอกช่วงเวลา
//      คือของที่ถ่ายรูปเก็บไปใช้ทีหลังได้ ไม่มีเหตุผลให้มันอยู่ตรงนั้น
//   3. ห้าม log token · ห้ามใส่ token ลง URL · ห้ามเก็บลง localStorage

// ── หน้าตาของแต่ละสถานะ ───────────────────────────────────────────────────────

/** สีและไอคอนของการ์ดในแต่ละสถานะ — รวมไว้ที่เดียว เพื่อไม่ให้ JSX เต็มไปด้วยเงื่อนไขสี */
interface QrTheme {
  icon: string;
  iconColor: string;
  iconBg: string;
  /** สีขอบการ์ด — undefined = การ์ดขาวธรรมดาเหมือนการ์ดอื่นในหน้านี้ */
  border?: string;
}

const THEME = {
  checkIn: { icon: 'qr_code_2', iconColor: '#3A9A7E', iconBg: '#ECFDF5', border: 'rgba(82,182,154,0.4)' },
  checkOut: { icon: 'qr_code_2', iconColor: '#1D4ED8', iconBg: '#EFF6FF', border: 'rgba(29,78,216,0.35)' },
  early: { icon: 'schedule', iconColor: '#D97706', iconBg: '#FFFBEB', border: 'rgba(245,158,11,0.4)' },
  expired: { icon: 'timer_off', iconColor: '#6B7280', iconBg: '#F3F4F6' },
  done: { icon: 'task_alt', iconColor: '#059669', iconBg: '#ECFDF5' },
  notice: { icon: 'info', iconColor: '#6B7280', iconBg: '#F3F4F6' },
} satisfies Record<string, QrTheme>;

/** ป้ายสถานะมุมขวาบน — สะท้อน status ของใบ QR ตรง ๆ (AC: "สถานะสะท้อน check-in/out") */
const STATUS_CHIP: Record<JobQr['status'], { label: string; bg: string; dot: string; text: string }> = {
  PENDING: { label: 'รอผู้ดูแลเช็คอิน', bg: '#FFFBEB', dot: '#F59E0B', text: '#B45309' },
  CHECKED_IN: { label: 'ผู้ดูแลเช็คอินแล้ว', bg: '#EFF6FF', dot: '#3B82F6', text: '#1D4ED8' },
  CHECKED_OUT: { label: 'จบงานแล้ว', bg: '#ECFDF5', dot: '#10B981', text: '#047857' },
};

/** หัวข้อ + คำอธิบายของช่อง QR ตอนที่สแกนได้จริง */
const ACTION_COPY: Record<ScanAction, { title: string; subtitle: string }> = {
  CHECK_IN: {
    title: 'ให้ผู้ดูแลสแกนเพื่อเช็คอิน',
    subtitle: 'เมื่อผู้ดูแลมาถึง เปิดหน้านี้ให้สแกน ระบบจะบันทึกเวลาเริ่มงานให้อัตโนมัติ',
  },
  CHECK_OUT: {
    title: 'ให้ผู้ดูแลสแกนเพื่อเช็คเอาท์',
    // ★ PYG-437: เดิมเขียนว่า "สแกนอีกครั้ง" เฉย ๆ ซึ่งชวนให้เข้าใจว่าเป็น QR ใบเดิม
    //   ตอนนี้เป็นคนละใบแล้ว ต้องบอกให้ชัด ไม่งั้นผู้ใช้ที่แคปหน้าจอไว้ตอนเช็คอิน
    //   จะเอารูปเก่าไปให้สแกนแล้วงงว่าทำไมไม่ผ่าน
    subtitle:
      'เมื่อดูแลเสร็จ เปิดหน้านี้ให้สแกนอีกครั้ง — เป็น QR คนละใบกับตอนเริ่มงาน ระบบจะบันทึกเวลาเลิกงานให้อัตโนมัติ',
  },
};

// ── ชิ้นส่วนย่อย ──────────────────────────────────────────────────────────────

const CARD_BASE: React.CSSProperties = {
  boxSizing: 'border-box',
  background: '#FFFFFF',
  boxShadow: '0px 1px 4px rgba(0,0,0,0.03)',
  borderRadius: 18,
  padding: 20,
};

function CardShell({
  theme,
  title,
  subtitle,
  chip,
  children,
}: Readonly<{
  theme: QrTheme;
  title: string;
  subtitle: string;
  chip?: JobQr['status'];
  children?: React.ReactNode;
}>) {
  const chipStyle = chip ? STATUS_CHIP[chip] : null;

  return (
    <section style={{ ...CARD_BASE, border: theme.border ? `0.8px solid ${theme.border}` : undefined }}>
      {/* หัวการ์ด: ไอคอน + หัวข้อ + ป้ายสถานะ */}
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: theme.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-icons" style={{ fontSize: 24, color: theme.iconColor }}>{theme.icon}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 17, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '26px' }}>
              {title}
            </p>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#575859', margin: 0, lineHeight: '18px' }}>
              {subtitle}
            </p>
          </div>
        </div>

        {chipStyle && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: chipStyle.bg, borderRadius: 9999, flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: chipStyle.dot }} />
            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: chipStyle.text, lineHeight: '18px' }}>
              {chipStyle.label}
            </span>
          </span>
        )}
      </div>

      {children}
    </section>
  );
}

/** กรอบเทาใต้หัวการ์ด — ใช้ตอนที่ "ยังไม่มี QR ให้ดู" (ยังไม่ถึงเวลา / หมดเวลา / จบงาน) */
function PlaceholderBox({ icon, lines }: Readonly<{ icon: string; lines: string[] }>) {
  return (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px', background: '#F9FAFB', border: '0.8px dashed #E0E2E5', borderRadius: 14 }}>
      <span className="material-icons" style={{ fontSize: 32, color: '#9CA3AF' }}>{icon}</span>
      {lines.map((line) => (
        <p key={line} style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#575859', margin: 0, lineHeight: '20px', textAlign: 'center' }}>
          {line}
        </p>
      ))}
    </div>
  );
}

/**
 * ช่องโทเค็นแบบปิดบัง + ปุ่มคัดลอก (เครื่องมือทดสอบชั่วคราว — ดู lib/qrTestTools.ts)
 *
 * ★ ทำไมโชว์เป็นจุดแทนตัวอักษรจริง:
 *   โทเค็นคือกุญแจที่ใช้เปิด/ปิดงานได้จริง ถ้าโชว์เต็มบนจอ ใครที่ยืนอยู่ข้างหลัง
 *   หรือถ่ายจอไว้ก็ได้กุญแจไปด้วย ทั้งที่ผู้ใช้แค่อยากกดคัดลอกส่งให้ผู้ดูแล
 *   จำนวนจุดตั้งไว้คงที่ ไม่ได้ผูกกับความยาวจริง — เพื่อไม่ให้เดาความยาวโทเค็นได้ด้วยซ้ำ
 *
 * แยกเป็น component ของตัวเองเพราะต้องมี state ("คัดลอกแล้ว") เป็นของตัวเอง
 * ถ้าเอา state ไปไว้ในการ์ดใหญ่ จะติดเรื่องลำดับ hooks กับ early return ที่มีอยู่หลายทาง
 */
function TokenCopyField({ token }: Readonly<{ token: string }>) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  // คืนปุ่มกลับเป็นปกติหลังขึ้น "คัดลอกแล้ว" 2 วินาที
  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = setTimeout(() => setCopyState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  const copied = copyState === 'copied';
  const failed = copyState === 'failed';

  return (
    <div style={{ width: '100%', marginTop: 4 }}>
      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', margin: '0 0 6px', lineHeight: '16px' }}>
        โทเค็นสำหรับกรอกด้วยมือ (โหมดทดสอบ)
      </p>

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
        {/* ช่องนี้เป็นแค่ "ภาพแทน" ของโทเค็น — ค่าจริงไม่เคยถูกวาดลง DOM ตรงนี้เลย
            (ต่อให้เปิด DevTools ดู element นี้ก็เห็นแต่จุด) */}
        <div
          style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', height: 38, padding: '0 12px', background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 10, overflow: 'hidden' }}
        >
          <span
            aria-label="โทเค็นถูกซ่อนไว้"
            style={{ fontFamily: "'Inter', monospace", fontSize: 13, letterSpacing: 2, color: '#8A8C8E', whiteSpace: 'nowrap' }}
          >
            {'•'.repeat(24)}
          </span>
        </div>

        <button
          type="button"
          onClick={async () => {
            const ok = await copyTextToClipboard(token);
            setCopyState(ok ? 'copied' : 'failed');
          }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 14px',
            background: copied ? '#ECFDF5' : '#FFFFFF',
            border: `0.8px solid ${copied ? 'rgba(16,185,129,.4)' : '#E0E2E5'}`,
            borderRadius: 10, cursor: 'pointer', flexShrink: 0,
          }}
        >
          <span className="material-icons" style={{ fontSize: 16, color: copied ? '#047857' : '#575859' }}>
            {copied ? 'check' : 'content_copy'}
          </span>
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: copied ? '#047857' : '#575859' }}>
            {copied ? 'คัดลอกแล้ว' : 'คัดลอกโทเค็น'}
          </span>
        </button>
      </div>

      {failed && (
        <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#DC2626', margin: '6px 0 0', lineHeight: '16px' }}>
          คัดลอกไม่สำเร็จ — เบราว์เซอร์ไม่อนุญาต ลองเปิดหน้านี้ผ่าน https หรือ localhost
        </p>
      )}
    </div>
  );
}

/** โครงร่างตอนกำลังโหลดรอบแรก — ขนาดใกล้เคียงการ์ดจริง เพื่อไม่ให้หน้ากระตุกตอนข้อมูลมาถึง */
function LoadingCard() {
  return (
    <section style={CARD_BASE} aria-busy="true">
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 22, background: '#F0F1F3' }} />
        <div style={{ flex: 1 }}>
          <div style={{ width: '55%', height: 14, background: '#F0F1F3', borderRadius: 7 }} />
          <div style={{ width: '75%', height: 10, background: '#F0F1F3', borderRadius: 5, marginTop: 8 }} />
        </div>
      </div>
      <div style={{ marginTop: 16, height: 208, background: '#F9FAFB', border: '0.8px dashed #E0E2E5', borderRadius: 14 }} />
    </section>
  );
}

// ── นาฬิกาของการ์ด ────────────────────────────────────────────────────────────

/** อัปเดตเวลาที่ถืออยู่ทุก ๆ กี่มิลลิวินาที (เท่ากับรอบ poll ของ useJobQr) */
const CLOCK_TICK_MS = 30_000;

/**
 * เวลาปัจจุบันในรูป state
 *
 * ทำไมต้องเก็บเป็น state แทนที่จะเรียก Date.now() ตอน render:
 *   React ถือว่า render ต้อง "ให้ผลเหมือนเดิมทุกครั้ง" การอ่านนาฬิกาสด ๆ ผิดกติกาข้อนั้น
 *   (eslint react-hooks/purity จะฟ้อง) — เก็บเป็น state แล้ว tick เอาจึงถูกต้องกว่า
 *
 * ★ เวลานี้ใช้แค่ "เลือกข้อความ" (ยังไม่ถึงเวลา vs เลยเวลา) เท่านั้น
 *   ไม่ได้ใช้ตัดสินว่า QR โผล่ได้ไหม — อันนั้น backend ตัดสินผ่าน isActive
 */
function useClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  return now;
}

// ── การ์ดหลัก ─────────────────────────────────────────────────────────────────

export function JobQrCard({
  bookingId,
  bookingStatus,
}: Readonly<{
  bookingId: string;
  /** สถานะของ booking — ใช้ตัดสินว่าจะยิง query ไหม (งานที่ยังไม่จ่ายเงินไม่ต้องถาม) */
  bookingStatus: BookingStatus;
}>) {
  const eligible = shouldShowJobQr(bookingStatus);
  // hooks ต้องถูกเรียกครบทุกรอบ render เสมอ จึงเรียกก่อน return ทุกทาง
  // แล้วค่อยใช้ `skip` บอก Apollo ว่ารอบนี้ไม่ต้องยิงจริง
  const {
    qr,
    loading,
    errorMessage,
    refetch,
    rotate,
    rotating,
    rotateErrorMessage,
  } = useJobQr(bookingId, { skip: !eligible });
  const now = useClock();

  // canvas ซ่อนไว้สำหรับปุ่ม "บันทึกรูป QR" (เครื่องมือทดสอบชั่วคราว — ดู lib/qrTestTools.ts)
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null);

  // งานสถานะนี้ไม่เกี่ยวกับ QR → ไม่ต้องมีการ์ดอยู่บนหน้าเลย
  if (!eligible) return null;

  // ── กำลังโหลดรอบแรก ───────────────────────────────────────────────────────
  // เช็ค !qr ด้วย เพราะ fetchPolicy 'cache-and-network' ทำให้ loading = true ทุกครั้ง
  // ที่ refetch — ถ้าไม่เช็ค การ์ดจะกระพริบเป็นโครงร่างทุก 30 วินาที
  if (loading && !qr) return <LoadingCard />;

  // ── ขอ QR ไม่ได้ ──────────────────────────────────────────────────────────
  // เคสที่เกิดจริง: งานที่จองก่อนระบบ QR เปิดใช้ (ไม่มีแถวใน job_sessions) และ
  // สมาชิกครอบครัวที่ไม่ได้เป็นคนกดจอง (backend เปิดให้เฉพาะเจ้าของ booking)
  // ทั้งคู่ "ไม่ใช่หน้าพัง" จึงแสดงเป็นการ์ดข้อความเงียบ ๆ ไม่ใช่สีแดงเตือนภัย
  if (errorMessage || !qr) {
    return (
      <CardShell
        theme={THEME.notice}
        title="ยังแสดง QR ไม่ได้"
        subtitle="ผู้ดูแลยังเช็คอิน/เช็คเอาท์ด้วยวิธีเดิมได้ตามปกติ"
      >
        <PlaceholderBox icon="qr_code_2" lines={[errorMessage ?? 'โหลด QR ไม่สำเร็จ']} />
        <button
          type="button"
          onClick={refetch}
          style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 16px', background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 10, cursor: 'pointer' }}
        >
          <span className="material-icons" style={{ fontSize: 16, color: '#575859' }}>refresh</span>
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#575859' }}>ลองอีกครั้ง</span>
        </button>
      </CardShell>
    );
  }

  // ── จบงานแล้ว → ซ่อน QR (ข้อกำหนดตรงจากการ์ด PYG-437) ─────────────────────
  if (qr.status === 'CHECKED_OUT') {
    return (
      <CardShell
        theme={THEME.done}
        title="ปิดงานเรียบร้อยแล้ว"
        subtitle="ผู้ดูแลเช็คเอาท์แล้ว QR ใบนี้ใช้ไม่ได้อีก"
        chip={qr.status}
      >
        <PlaceholderBox
          icon="task_alt"
          lines={['งานนี้ปิดแล้ว ไม่ต้องแสดง QR อีก', 'ดูเวลาเข้า–ออกจริงได้ที่ไทม์ไลน์ด้านล่าง']}
        />
      </CardShell>
    );
  }

  // ── ยังสแกนไม่ได้ (นอกช่วงเวลา) ────────────────────────────────────────────
  // ★ ใครตัดสินว่า "สแกนได้ไหม": เซิร์ฟเวอร์ ผ่าน isActive เท่านั้น
  //   นาฬิกาเครื่องถูกใช้แค่เลือกว่าจะพูดว่า "ยังไม่ถึง" หรือ "เลยไปแล้ว"
  //   ความผิดพลาดที่แย่ที่สุดจากตรงนี้คือข้อความคลาดเคลื่อน ไม่ใช่ QR โผล่ผิดเวลา
  if (!qr.isActive) {
    const nowMs = now.getTime();
    const fromMs = new Date(qr.validFrom).getTime();
    const untilMs = new Date(qr.validUntil).getTime();

    if (nowMs < fromMs) {
      return (
        <CardShell
          theme={THEME.early}
          title="ยังไม่ถึงเวลาใช้ QR"
          subtitle="ระบบจะเปิด QR ให้อัตโนมัติเมื่อใกล้ถึงเวลานัด"
          chip={qr.status}
        >
          <PlaceholderBox
            icon="lock_clock"
            lines={[
              `ใช้ได้เวลา ${formatWhen(qr.validFrom, now)}`,
              `ถึง ${formatWhen(qr.validUntil, now)}`,
            ]}
          />
        </CardShell>
      );
    }

    if (nowMs > untilMs) {
      return (
        <CardShell
          theme={THEME.expired}
          title="QR หมดเวลาแล้ว"
          subtitle="เลยช่วงเวลาที่สแกนได้ของงานนี้ไปแล้ว"
          chip={qr.status}
        >
          <PlaceholderBox
            icon="timer_off"
            lines={[
              `ใช้ได้ถึง ${formatWhen(qr.validUntil, now)}`,
              'หากผู้ดูแลยังเช็คอิน/เช็คเอาท์ไม่สำเร็จ โปรดกด "แจ้งปัญหา"',
            ]}
          />
        </CardShell>
      );
    }

    // เหลือทางเดียว: นาฬิกาเครื่องบอกว่าอยู่ในช่วง แต่เซิร์ฟเวอร์บอกว่ายังใช้ไม่ได้
    // (เครื่องผู้ใช้ตั้งเวลาเพี้ยน) — บอกช่วงเวลาจริงไปตรง ๆ ดีกว่าเดาแล้วทำให้สับสน
    return (
      <CardShell
        theme={THEME.expired}
        title="ตอนนี้ยังใช้ QR ไม่ได้"
        subtitle="ตรวจสอบว่านาฬิกาของเครื่องตั้งเวลาถูกต้อง"
        chip={qr.status}
      >
        <PlaceholderBox
          icon="schedule"
          lines={[`ช่วงเวลาที่ใช้ได้ ${formatWhen(qr.validFrom, now)} – ${formatWhen(qr.validUntil, now)}`]}
        />
      </CardShell>
    );
  }

  // ── สแกนได้จริง → วาด QR ──────────────────────────────────────────────────
  // nextAction ไม่มีทางเป็น null ตรงนี้ (isActive = true บังคับให้ยังมี action เหลือ)
  // แต่ TypeScript ไม่รู้ จึง fallback เป็น CHECK_IN ซึ่งเป็นค่าที่ปลอดภัยที่สุด
  const action = qr.nextAction ?? 'CHECK_IN';
  const copy = ACTION_COPY[action];
  const theme = action === 'CHECK_IN' ? THEME.checkIn : THEME.checkOut;

  return (
    <CardShell theme={theme} title={copy.title} subtitle={copy.subtitle} chip={qr.status}>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 16px', background: '#F9FAFB', border: '0.8px solid #E0E2E5', borderRadius: 14 }}>
        {/* พื้นขาวรอบ QR — กล้องอ่าน QR ที่มีขอบขาว (quiet zone) ได้ไวกว่ามาก */}
        <div style={{ padding: 12, background: '#FFFFFF', borderRadius: 12, boxShadow: '0px 1px 4px rgba(0,0,0,0.06)', lineHeight: 0 }}>
          <QRCodeSVG
            // ★ ค่าดิบล้วน ๆ ห้ามเติมอะไรทั้งสิ้น (ดูหมายเหตุความปลอดภัยหัวไฟล์)
            value={qr.token}
            size={200}
            // ระดับ M = ทนรอยเปื้อน/แสงสะท้อนได้ราว 15% โดยที่ลายยังไม่ทึบเกินไป
            level="M"
            marginSize={0}
            bgColor="#FFFFFF"
            fgColor="#1A1A1A"
            title="QR สำหรับให้ผู้ดูแลสแกน"
          />
        </div>

        <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#575859', margin: 0, lineHeight: '18px', textAlign: 'center' }}>
          ใช้ได้ถึง {formatWhen(qr.validUntil, now)}
        </p>

        {/* ── PYG-437: ออก QR ใบใหม่ ──────────────────────────────────────
            ★ นี่เป็นฟีเจอร์จริง ไม่ใช่เครื่องมือทดสอบ จึง "ไม่" อยู่ใต้ QR_TEST_TOOLS_ENABLED

            ทำไมต้องโชว์เวลาที่ออกคู่กับปุ่มเสมอ: QR สองใบมองด้วยตาเปล่าแยกไม่ออกเลย
            ถ้ากดแล้วหน้าจอไม่มีอะไรเปลี่ยนให้เห็น ผู้ใช้จะกดซ้ำเพราะคิดว่าปุ่มเสีย
            เวลาที่ขยับคือหลักฐานชิ้นเดียวที่บอกว่ามันทำงานแล้ว */}
        <div style={{ width: '100%', paddingTop: 12, borderTop: '0.8px dashed #E0E2E5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#8A8C8E', lineHeight: '16px' }}>
            QR ชุดนี้ออกเมื่อ {formatWhen(qr.tokenIssuedAt, now)}
          </span>

          <button
            type="button"
            onClick={rotate}
            disabled={rotating}
            // ★ ปุ่มนี้ "ทำลายของที่ใช้งานได้อยู่" จึงต้องอธิบายผลลัพธ์ก่อนกด
            //   ไม่ใช้ confirm() เพราะการกดพลาดไม่ได้เสียหายอะไร (กดแล้วได้ใบใหม่ที่ใช้ได้ทันที)
            //   การขึ้นกล่องถามทุกครั้งจะกวนคนที่ตั้งใจกดมากกว่าช่วยคนที่กดพลาด
            title="ออก QR ใบใหม่ — ใบเดิมจะใช้ไม่ได้ทันที"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 10, cursor: rotating ? 'progress' : 'pointer', opacity: rotating ? 0.6 : 1 }}
          >
            <span className="material-icons" style={{ fontSize: 15, color: '#575859' }}>
              {rotating ? 'hourglass_top' : 'autorenew'}
            </span>
            <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: '#575859' }}>
              {rotating ? 'กำลังออกใบใหม่…' : 'ออก QR ใหม่'}
            </span>
          </button>
        </div>

        {/* ข้อความไทยจากเซิร์ฟเวอร์ตรง ๆ เช่น "งานนี้ปิดเรียบร้อยแล้ว จึงไม่ต้องออก QR ใหม่"
            ★ ไม่กลืน error เงียบ ๆ — ผู้ใช้กดปุ่มแล้วต้องรู้เสมอว่าเกิดอะไรขึ้น */}
        {rotateErrorMessage !== null && (
          <p role="alert" style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, color: '#B91C1C', margin: 0, lineHeight: '16px', textAlign: 'center' }}>
            {rotateErrorMessage}
          </p>
        )}

        {/* ── เครื่องมือทดสอบชั่วคราว (ลบทิ้งเมื่อ scanner กล้อง PYG-438 เสร็จ) ──
            ปิดอัตโนมัติใน build จริง เว้นแต่ตั้ง VITE_QR_TEST_TOOLS=true
            ดูเหตุผลและความเสี่ยงที่ lib/qrTestTools.ts */}
        {QR_TEST_TOOLS_ENABLED && (
          <>
            {/* canvas ใบนี้ไม่ได้ให้คนดู — วาด QR ใบใหญ่ไว้เป็นต้นฉบับตอนกดบันทึกอย่างเดียว
                (ที่โชว์บนจอเป็น SVG ซึ่งคมกว่า แต่ export เป็น PNG ตรง ๆ ไม่ได้)
                marginSize=4 คือขอบขาวตามสเปก QR — ตัวถอดรหัสต้องการขอบนี้ในการหาตำแหน่ง */}
            <div style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
              <QRCodeCanvas
                ref={downloadCanvasRef}
                value={qr.token}
                size={QR_DOWNLOAD_SIZE}
                level="M"
                marginSize={4}
                bgColor="#FFFFFF"
                fgColor="#000000"
              />
            </div>

            {/* เส้นทางที่ 1 (ตรงที่สุด): คัดลอกโทเค็นไปวางในช่องกรอกของผู้ดูแล */}
            <TokenCopyField token={qr.token} />

            {/* เส้นทางที่ 2: เซฟเป็นรูปแล้วให้ผู้ดูแลอัปโหลดกลับ */}
            <button
              type="button"
              onClick={() => {
                const canvas = downloadCanvasRef.current;
                if (!canvas) return;
                // ชื่อไฟล์ใช้เลขท้าย booking เท่านั้น — ห้ามเอา token มาตั้งชื่อไฟล์เด็ดขาด
                downloadCanvasPng(canvas, `payung-qr-${bookingId.replaceAll('-', '').slice(-6).toUpperCase()}.png`);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 36, padding: '0 14px', background: '#FFFFFF', border: '0.8px solid #E0E2E5', borderRadius: 10, cursor: 'pointer' }}
            >
              <span className="material-icons" style={{ fontSize: 16, color: '#575859' }}>download</span>
              <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, fontWeight: 600, color: '#575859' }}>
                บันทึกรูป QR (โหมดทดสอบ)
              </span>
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span className="material-icons" style={{ fontSize: 16, color: '#8A8C8E', flexShrink: 0, marginTop: 1 }}>shield</span>
        <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 12, color: '#8A8C8E', margin: 0, lineHeight: '18px' }}>
          QR นี้ใช้ได้กับงานใบนี้และผู้ดูแลที่รับงานเท่านั้น โปรดแสดงให้ผู้ดูแลสแกนจากหน้าจอ ไม่ต้องส่งต่อให้ใคร
          {' '}
          ถ้าเผลอส่งต่อหรือถ่ายรูปไปแล้ว กด "ออก QR ใหม่" ได้ทันที ใบเก่าจะใช้ไม่ได้อีก
        </p>
      </div>
    </CardShell>
  );
}

export default JobQrCard;
