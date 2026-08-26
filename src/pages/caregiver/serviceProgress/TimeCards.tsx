import { useEffect, useState } from 'react';
import { Icon } from '../../../components/ui/Icon';

export interface TimeCardsProps {
  checkInServerTs: string | null;
  checkOutServerTs: string | null;
  /** Display text for the booked duration, e.g. "4 ชม." — already computed elsewhere on the page. */
  bookedDurationText?: string;
}

const TICK_INTERVAL_MS = 60_000;

// Date.now() must never be called during render (it's an impure read of ambient state) — it's
// only read inside the effect below, in response to the mount/tick, which is the correct place
// for a side effect to sample the current time.
function useElapsedMinutes(sinceIso: string | null, untilIso: string | null): number | null {
  // Lazy initializer: React calls this once for the initial render only, which is the
  // sanctioned way to seed state from an impure read without doing so in the render body itself.
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

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

function formatElapsed(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} นาที`;
  return `${hours} ชม. ${mins} นาที`;
}

function TimeCell({
  icon,
  label,
  time,
  subtitle,
  tone,
  bordered,
}: Readonly<{ icon: string; label: string; time: string; subtitle: string; tone: 'active' | 'pending'; bordered?: boolean }>) {
  const iconColor = tone === 'active' ? '#047857' : '#8A8C8E';
  return (
    <div className={`flex-1 px-4 py-3.5 text-center ${bordered ? 'border-l border-[#F0F1F3]' : ''}`}>
      <div className="flex items-center justify-center gap-1">
        <Icon name={icon} size="small" color={iconColor} />
        <span className="text-xs font-semibold" style={{ color: iconColor, fontFamily: "'Bai Jamjuree', sans-serif" }}>
          {label}
        </span>
      </div>
      <p className="mt-1 text-lg font-bold text-[#1A1A1A]" style={{ fontFamily: "'Inter', sans-serif" }}>
        {time}
      </p>
      <p className="text-[11px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        {subtitle}
      </p>
    </div>
  );
}

/** Shell-less time row — meant to be nested inside a parent card (ServiceProgressWorkCard),
 * matching the Figma spec where check-in/check-out sit inside the same card as the map. */
export default function TimeCards({ checkInServerTs, checkOutServerTs, bookedDurationText }: Readonly<TimeCardsProps>) {
  const elapsedMinutes = useElapsedMinutes(checkInServerTs, checkOutServerTs);

  return (
    <div className="flex divide-x divide-[#F0F1F3]">
      <TimeCell
        icon="login"
        label="เช็คอิน"
        time={checkInServerTs ? formatTime(checkInServerTs) : '—'}
        subtitle={elapsedMinutes !== null ? `ทำงานมาแล้ว ${formatElapsed(elapsedMinutes)}` : ''}
        tone="active"
      />
      <TimeCell
        icon="logout"
        label={checkOutServerTs ? 'เช็คเอาท์' : 'เช็คเอาท์ (คาดว่า)'}
        time={checkOutServerTs ? formatTime(checkOutServerTs) : '—'}
        subtitle={bookedDurationText ? `ตามเวลาที่จอง ${bookedDurationText}` : ''}
        tone={checkOutServerTs ? 'active' : 'pending'}
        bordered
      />
    </div>
  );
}
