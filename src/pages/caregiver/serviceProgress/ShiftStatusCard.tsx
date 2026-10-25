import { useEffect, useState } from 'react';
import RecipientActionRow from './RecipientActionRow';
import type { PatientProfile } from '../../../lib/patientProfile';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;
const NUM = { fontFamily: "'Inter', sans-serif" } as const;
const TICK_INTERVAL_MS = 30_000;

export interface ShiftStatusCardProps {
  checkInServerTs: string | null;
  checkOutServerTs: string | null;
  /** ข้อความระยะเวลาที่จองไว้ เช่น "2 ชม." — ใช้คำนวณเวลาเลิกงานที่คาดไว้และแถบความคืบหน้า */
  bookedDurationText?: string;
  patientName: string;
  careRecipientName?: string | null;
  recipientAvatarUrl?: string | null;
  /** PYG-460 — ใช้เฉพาะดึง "ประวัติแพ้ยา" ขึ้นมาโชว์ในการ์ด · รายละเอียดเต็มอยู่ในป๊อปอัปโปรไฟล์ */
  patientProfile?: PatientProfile | null;
  /** รายได้สุทธิหลังหักค่าธรรมเนียม (ข้อความจัดรูปแล้ว) — ไม่ส่งมา = งานนี้ไม่มียอด */
  netEarningsText?: string;
  /** true = ยอดโอนจริง · false = ประมาณการ (จะต่อท้ายว่า "ประมาณ") */
  netIsActual?: boolean;
  onViewProfile: () => void;
  onViewBookingDetails: () => void;
}

// Date.now() ต้องไม่ถูกอ่านตอน render ตรง ๆ — อ่านครั้งแรกใน lazy initializer
// แล้วอัปเดตผ่าน interval ใน effect เท่านั้น
function useElapsedMinutes(sinceIso: string | null, untilIso: string | null): number | null {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!sinceIso || untilIso) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sinceIso, untilIso]);

  if (!sinceIso) return null;
  const end = untilIso ? new Date(untilIso).getTime() : nowMs;
  return Math.max(0, Math.round((end - new Date(sinceIso).getTime()) / 60000));
}

/** "2 ชม." → 120 · คืน null ถ้าอ่านตัวเลขไม่ได้ เพื่อให้ส่วนที่ต้องใช้ค่านี้หายไปแทนที่จะเดามั่ว */
function parseBookedMinutes(text?: string): number | null {
  if (!text) return null;
  const match = /([\d.]+)/.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return Math.round(hours * 60);
}

function formatClock(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} นาที`;
  if (mins === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${mins} นาที`;
}

function Stat({
  label,
  value,
  tone = 'normal',
}: Readonly<{ label: string; value: string; tone?: 'normal' | 'muted' | 'money' }>) {
  const valueColor = { normal: 'text-[#1A1A1A]', muted: 'text-[#8A8C8E]', money: 'text-[#009265]' }[tone];
  return (
    <div className="min-w-[88px]">
      <p className="text-[11px] text-[#8A8C8E]" style={FONT}>
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-bold ${valueColor}`} style={NUM}>
        {value}
      </p>
    </div>
  );
}

/**
 * การ์ดสถานะกะงาน — โครงเดียวกับการ์ดติดตามงานฝั่งผู้รับบริการ (พื้นขาว, ส่วนบนคือความคืบหน้า,
 * ส่วนล่างคั่นเส้นเป็นแถวโปรไฟล์ + ปุ่มลงมือ) แต่ใช้แถบความคืบหน้าแบบของฝั่งผู้ดูแลเอง
 * เพราะผู้ดูแลต้องรู้ "ทำมานานเท่าไร เทียบกับที่จองไว้" ไม่ใช่แค่ว่าอยู่ขั้นไหน
 *
 * ★ ประวัติแพ้ยาถูกยกขึ้นมาไว้ในการ์ดนี้ ไม่ได้ซ่อนในป๊อปอัป เพราะเป็นข้อมูลที่ผิดแล้ว
 *   อันตรายถึงชีวิต — ต้องเห็นโดยไม่ต้องกดอะไรเลย
 */
export default function ShiftStatusCard({
  checkInServerTs,
  checkOutServerTs,
  bookedDurationText,
  patientName,
  careRecipientName,
  recipientAvatarUrl,
  patientProfile,
  netEarningsText,
  netIsActual,
  onViewProfile,
  onViewBookingDetails,
}: Readonly<ShiftStatusCardProps>) {
  const elapsedMinutes = useElapsedMinutes(checkInServerTs, checkOutServerTs);
  const bookedMinutes = parseBookedMinutes(bookedDurationText);
  const done = checkOutServerTs !== null;

  const expectedOut =
    checkInServerTs && bookedMinutes !== null
      ? formatClock(new Date(new Date(checkInServerTs).getTime() + bookedMinutes * 60000))
      : '—';

  const progress =
    elapsedMinutes !== null && bookedMinutes !== null ? Math.min(100, Math.round((elapsedMinutes / bookedMinutes) * 100)) : null;
  const overMinutes = elapsedMinutes !== null && bookedMinutes !== null ? elapsedMinutes - bookedMinutes : null;
  const isOvertime = overMinutes !== null && overMinutes > 0;

  function paceText(): string {
    if (overMinutes === null || overMinutes === 0) return 'ครบเวลาพอดี';
    if (overMinutes > 0) return `เกินเวลาจอง ${formatDuration(overMinutes)}`;
    return `เหลืออีก ${formatDuration(-overMinutes)}`;
  }

  return (
    <section
      className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)]"
      aria-label="สถานะการปฏิบัติงาน"
    >
      {/* ── ส่วนบน: ความคืบหน้าของกะ ── */}
      <div className="border-b border-[#F3F4F6] p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                done ? 'bg-[#F0F1F3] text-[#575859]' : 'bg-[#E6F5ED] text-[#047857]'
              }`}
              style={FONT}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-[#8A8C8E]' : 'animate-pulse bg-[#10B981]'}`}
                aria-hidden="true"
              />
              {done ? 'ปิดงานแล้ว' : 'กำลังปฏิบัติงาน'}
            </span>
            <p className="mt-2 text-[32px] font-bold leading-none text-[#1A1A1A]" style={NUM}>
              {elapsedMinutes !== null ? formatDuration(elapsedMinutes) : '—'}
            </p>
            <p className="mt-1.5 text-xs text-[#8A8C8E]" style={FONT}>
              {done ? 'รวมเวลาปฏิบัติงาน' : 'ทำงานมาแล้ว'}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <Stat label="เช็คอิน" value={checkInServerTs ? formatClock(checkInServerTs) : '—'} />
            <span aria-hidden="true" className="h-8 w-px bg-[#F0F1F3]" />
            <Stat
              label={done ? 'เช็คเอาท์' : 'คาดว่าเลิกงาน'}
              value={checkOutServerTs ? formatClock(checkOutServerTs) : expectedOut}
              tone={done ? 'normal' : 'muted'}
            />
            {netEarningsText && (
              <>
                <span aria-hidden="true" className="h-8 w-px bg-[#F0F1F3]" />
                <Stat
                  label={netIsActual ? 'รายได้สุทธิ' : 'รายได้สุทธิ (ประมาณ)'}
                  value={netEarningsText}
                  tone="money"
                />
              </>
            )}
          </div>
        </div>

        {progress !== null && (
          <div className="mt-4">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#F0F1F3]">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{ width: `${progress}%`, background: isOvertime ? '#F59E0B' : '#52B69A' }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#8A8C8E]" style={FONT}>
              <span>ตามเวลาที่จอง {bookedDurationText}</span>
              <span className={isOvertime ? 'font-bold text-[#B45309]' : 'font-semibold text-[#575859]'}>{paceText()}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── ส่วนล่าง: ผู้รับบริการ + ทางเข้าดูข้อมูล (แถวเดียวกับหน้าก่อนเช็คอิน) ── */}
      <RecipientActionRow
        patientName={patientName}
        careRecipientName={careRecipientName}
        avatarUrl={recipientAvatarUrl}
        patientProfile={patientProfile}
        onViewProfile={onViewProfile}
        onViewBookingDetails={onViewBookingDetails}
      />
    </section>
  );
}
