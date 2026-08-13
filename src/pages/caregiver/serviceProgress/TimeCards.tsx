import { useEffect, useState } from 'react';
import { Icon } from '../../../components/ui/Icon';

export interface TimeCardsProps {
  checkInServerTs: string | null;
  checkOutServerTs: string | null;
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

function TimeCard({
  icon,
  label,
  time,
  subtitle,
  tone,
}: Readonly<{ icon: string; label: string; time: string; subtitle: string; tone: 'active' | 'pending' }>) {
  const iconColor = tone === 'active' ? '#047857' : '#8A8C8E';
  return (
    <div className="flex-1 rounded-xl border border-[#F0F1F3] p-3.5 text-center">
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

export default function TimeCards({ checkInServerTs, checkOutServerTs }: Readonly<TimeCardsProps>) {
  const elapsedMinutes = useElapsedMinutes(checkInServerTs, checkOutServerTs);

  return (
    <div className="flex gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <TimeCard
        icon="login"
        label="เช็คอิน"
        time={checkInServerTs ? formatTime(checkInServerTs) : '—'}
        subtitle={elapsedMinutes !== null ? `ทำงานมาแล้ว ${formatElapsed(elapsedMinutes)}` : ''}
        tone="active"
      />
      <TimeCard
        icon="logout"
        label="เช็คเอาท์"
        time={checkOutServerTs ? formatTime(checkOutServerTs) : '(ยังไม่มี)'}
        subtitle=""
        tone={checkOutServerTs ? 'active' : 'pending'}
      />
    </div>
  );
}
