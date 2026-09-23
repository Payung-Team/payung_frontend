import { useEffect, useState } from 'react';
import RecipientActionRow from '../serviceProgress/RecipientActionRow';
import { caregiverEarnings, formatBaht } from '../../../lib/caregiverEarnings';
import type { PatientProfile } from '../../../lib/patientProfile';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;
const NUM = { fontFamily: "'Inter', sans-serif" } as const;
const TICK_INTERVAL_MS = 30_000;

export interface PreShiftCardProps {
  /** "2569-09-16" ตามที่ backend ส่งมา */
  bookingDate: string;
  /** ข้อความวันที่แบบไทยที่หน้าแม่แปลงไว้แล้ว */
  dateText: string;
  /** "13:00 - 16:00" — ช่วงเวลาที่จองไว้ */
  timeText: string;
  durationText?: string;
  price: number;
  canCheckInToday: boolean;
  patientName: string;
  careRecipientName?: string | null;
  recipientAvatarUrl?: string | null;
  patientProfile?: PatientProfile | null;
  onViewProfile: () => void;
  onViewBookingDetails: () => void;
}

/** อ่าน "13:00" ตัวแรกจาก "13:00 - 16:00" — คืน null ถ้ารูปแบบไม่ตรง เพื่อให้ตัวนับถอยหลังหายไปแทนที่จะเดา */
function parseStartTime(bookingDate: string, timeText: string): Date | null {
  const match = /(\d{1,2}):(\d{2})/.exec(timeText);
  if (!match || !bookingDate) return null;
  const start = new Date(bookingDate);
  if (Number.isNaN(start.getTime())) return null;
  start.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return start;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} นาที`;
  if (mins === 0) return `${hours} ชม.`;
  return `${hours} ชม. ${mins} นาที`;
}

// Date.now() ต้องไม่ถูกอ่านตอน render ตรง ๆ — อ่านครั้งแรกใน lazy initializer แล้วอัปเดตใน effect
function useMinutesUntil(target: Date | null): number | null {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => setNowMs(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  return Math.round((target.getTime() - nowMs) / 60000);
}

function Stat({ label, value, tone = 'normal' }: Readonly<{ label: string; value: string; tone?: 'normal' | 'money' }>) {
  return (
    <div className="min-w-[88px]">
      <p className="text-[11px] text-[#8A8C8E]" style={FONT}>
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-bold ${tone === 'money' ? 'text-[#009265]' : 'text-[#1A1A1A]'}`} style={NUM}>
        {value}
      </p>
    </div>
  );
}

/**
 * การ์ดก่อนเริ่มงาน — คู่กับ ShiftStatusCard ของหน้าระหว่างทำงาน (พื้นขาว โครงเดียวกัน)
 * ผู้ดูแลที่เปิดหน้านี้กำลังจะไปทำงาน คำถามคือ "เริ่มกี่โมง อีกนานไหม ได้เท่าไร ดูแลใคร"
 *
 * เดิมหน้านี้เอาการ์ดสแกน QR ไว้ข้างขวาเท่ากับข้อมูลงาน ทั้งที่การสแกนทำเป็นขั้นสุดท้าย
 * เมื่อไปถึงสถานที่แล้ว — ตอนนี้ย้ายไปเป็นปุ่มบนแถบล่างที่ติดหน้าจอเหมือนหน้าระหว่างทำงาน
 */
export default function PreShiftCard({
  bookingDate,
  dateText,
  timeText,
  durationText,
  price,
  canCheckInToday,
  patientName,
  careRecipientName,
  recipientAvatarUrl,
  patientProfile,
  onViewProfile,
  onViewBookingDetails,
}: Readonly<PreShiftCardProps>) {
  const startAt = canCheckInToday ? parseStartTime(bookingDate, timeText) : null;
  const minutesUntil = useMinutesUntil(startAt);
  const earnings = caregiverEarnings(price);

  function timingText(): string {
    if (!canCheckInToday) return `เช็คอินได้ในวันที่ ${dateText}`;
    if (minutesUntil === null) return 'วันนี้ — เช็คอินได้เมื่อไปถึงสถานที่';
    if (minutesUntil > 0) return `เริ่มงานในอีก ${formatDuration(minutesUntil)}`;
    if (minutesUntil === 0) return 'ถึงเวลาเริ่มงานแล้ว';
    return `เลยเวลาเริ่มงานมา ${formatDuration(-minutesUntil)}`;
  }

  const late = canCheckInToday && minutesUntil !== null && minutesUntil < 0;

  return (
    <section className="overflow-hidden rounded-[18px] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)]" aria-label="ข้อมูลก่อนเริ่มงาน">
      <div className="border-b border-[#F3F4F6] p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                canCheckInToday ? 'bg-[#E6F5ED] text-[#047857]' : 'bg-[#EFF6FF] text-[#1D4ED8]'
              }`}
              style={FONT}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${canCheckInToday ? 'bg-[#10B981]' : 'bg-[#3B82F6]'}`}
                aria-hidden="true"
              />
              {canCheckInToday ? 'พร้อมเช็คอินวันนี้' : 'ยืนยันแล้ว · รอถึงวันนัดหมาย'}
            </span>
            <p className="mt-2 text-[30px] font-bold leading-none text-[#1A1A1A]" style={NUM}>
              {timeText || '—'}
            </p>
            <p className={`mt-1.5 text-xs ${late ? 'font-bold text-[#B45309]' : 'text-[#8A8C8E]'}`} style={FONT}>
              {timingText()}
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <Stat label="วันที่" value={dateText || '—'} />
            <span aria-hidden="true" className="h-8 w-px bg-[#F0F1F3]" />
            <Stat label="ระยะเวลา" value={durationText ?? '—'} />
            {price > 0 && (
              <>
                <span aria-hidden="true" className="h-8 w-px bg-[#F0F1F3]" />
                <Stat label="รายได้สุทธิ (ประมาณ)" value={formatBaht(earnings.net)} tone="money" />
              </>
            )}
          </div>
        </div>
      </div>

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
