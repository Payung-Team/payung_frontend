import { useEffect, useRef, useState } from 'react';
import { useBooking } from '../../../context/BookingContext';
import {
  bookingDurationHours,
  bookingEndOptions,
  bookingStartOptions,
  defaultBookingEndTime,
} from '../../../lib/bookingTime';
import { estimateBookingCost } from '../../../lib/bookingPrice';

// PYG-525 (การ์ดแม่ PYG-490): เลือกแค่ "วันที่ + เวลาเริ่ม + เวลาสิ้นสุด"
//   เลิกให้เลือกช่วงเช้า/บ่าย/เย็น และจำนวนชั่วโมงเอง — BE อนุมาน timeSlot และคำนวณ durationHours
//   ตัวเลือกเวลาทั้งหมดมาจาก lib/bookingTime.ts ซึ่งตรงกับกฎของ BE (booking-time.ts)
//   ใช้ทั้งจองให้ตัวเองและจองแทนในกลุ่มครอบครัว (ฟอร์มเดียวกัน)

const QUICK_DATES = [
  { offset: 0, label: 'วันนี้' },
  { offset: 1, label: 'พรุ่งนี้' },
  { offset: 2, label: 'มะรืนนี้' },
];

/**
 * "YYYY-MM-DD" ตามเวลาเครื่อง
 * ★ เดิมใช้ toISOString() ซึ่งเป็นวันที่ UTC — ในไทย (UTC+7) ช่วง 00:00–06:59
 *   ปุ่ม "วันนี้" จะกลายเป็นเมื่อวาน และการซ่อนเวลาที่ผ่านไปแล้วจะเทียบผิดวัน
 */
function localIsoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/** แปลง "YYYY-MM-DD" เป็นเวลาเที่ยงคืนตามเครื่อง (new Date(iso) อ่านเป็น UTC) */
function fromIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

function fmtThaiShort(iso: string) {
  return fromIsoDate(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function fmtThaiLong(iso: string) {
  return fromIsoDate(iso).toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function fmtHours(hours: number) {
  return `${Math.round(hours * 100) / 100} ชั่วโมง`;
}

function TimeButton({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center justify-center min-h-[52px] px-2 py-2 rounded-xl border transition cursor-pointer ${
        active
          ? 'bg-[#52B69A] border-[#52B69A] text-white'
          : 'bg-white border-[#E0E2E5] text-[#1A1A1A] hover:bg-gray-50'
      }`}
    >
      <span className="text-base font-bold">{label}</span>
      {sub && (
        <span className={`text-[11px] ${active ? 'text-white/90' : 'text-[#8A8C8E]'}`}>{sub}</span>
      )}
    </button>
  );
}

export default function BookingStepDateTime() {
  const { bookingDraft, setBookingDraft, goToStep, setStepSubmit, setStepMissing } = useBooking();

  const [date, setDate] = useState(bookingDraft?.dateTime?.date || '');
  const [startTime, setStartTime] = useState(bookingDraft?.dateTime?.startTime || '');
  const [endTime, setEndTime] = useState(bookingDraft?.dateTime?.endTime || '');
  const [error, setError] = useState<Record<string, string>>({});

  // นาฬิกาเดินทุกนาที — เปิดหน้าค้างไว้แล้วเวลาที่ผ่านไปต้องหายไปเองด้วย
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayIso = localIsoDate(now);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const optionsFor = (iso: string) => bookingStartOptions(iso === todayIso ? nowMinute : undefined);

  // ร่างที่ค้างใน sessionStorage อาจเป็นวันที่ผ่านไปแล้ว — ถือว่ายังไม่ได้เลือก
  const dateValid = !!date && date >= todayIso;
  const startOptions = dateValid ? optionsFor(date) : [];
  const endOptions = bookingEndOptions(startTime);
  const startValid = startOptions.includes(startTime);
  const endValid = startValid && endOptions.includes(endTime);
  const duration = endValid ? bookingDurationHours(startTime, endTime) : 0;
  const cost = estimateBookingCost(duration);

  // Auto-save — duration เก็บเฉพาะเมื่อเวลาครบและถูกกฎ (sidebar ใช้แสดงราคา)
  useEffect(() => {
    setBookingDraft((prev) => ({
      ...(prev || { serviceLocation: [], serviceTypes: [] }),
      dateTime: { date, startTime, endTime, duration },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, startTime, endTime, duration]);

  const clearError = (...keys: string[]) =>
    setError((prev) => {
      const next = { ...prev };
      keys.forEach((k) => delete next[k]);
      return next;
    });

  const selectDate = (iso: string) => {
    setDate(iso);
    clearError('date');
    // เวลาเริ่มที่เลือกไว้ใช้ไม่ได้กับวันใหม่ (เช่น เปลี่ยนเป็น "วันนี้" แล้วเวลานั้นผ่านไปแล้ว)
    // → ล้างทิ้ง ไม่ปล่อยให้ค่าที่ถูกซ่อนอยู่ค้างในฟอร์มโดยผู้ใช้มองไม่เห็น
    if (startTime && !optionsFor(iso).includes(startTime)) {
      setStartTime('');
      setEndTime('');
    }
  };

  const selectStart = (t: string) => {
    setStartTime(t);
    setEndTime(defaultBookingEndTime(t));
    clearError('startTime', 'endTime');
  };

  const selectEnd = (t: string) => {
    setEndTime(t);
    clearError('endTime');
  };

  // "เลือกวันอื่น" — เปิดปฏิทินของเบราว์เซอร์ (ปฏิทินของ PYG-493 ยังไม่มีฝั่ง FE)
  const dateInputRef = useRef<HTMLInputElement>(null);
  const openCalendar = () => {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      // เบราว์เซอร์ที่ไม่มี showPicker — โฟกัสช่องแทน ผู้ใช้ยังเปิดปฏิทินเองได้
      input.focus();
      input.click();
    }
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!dateValid) errs.date = 'กรุณาเลือกวันที่รับบริการ';
    else if (!startValid) {
      errs.startTime = startTime
        ? 'เวลาเริ่มที่เลือกไว้ผ่านไปแล้ว กรุณาเลือกใหม่'
        : 'กรุณาเลือกเวลาเริ่ม';
    } else if (!endValid) errs.endTime = 'กรุณาเลือกเวลาสิ้นสุด';
    setError(errs);
    if (Object.keys(errs).length === 0) goToStep(3);
  };

  // Report missing required fields so the sticky "Next" button can disable itself
  useEffect(() => {
    const missing: string[] = [];
    if (!dateValid) missing.push('วันที่');
    if (!startValid) missing.push('เวลาเริ่ม');
    if (!endValid) missing.push('เวลาสิ้นสุด');
    setStepMissing(missing);
    return () => setStepMissing([]);
  }, [dateValid, startValid, endValid, setStepMissing]);

  // Register submit
  const submitRef = useRef<() => void>(() => {});
  submitRef.current = handleSubmit;
  useEffect(() => {
    setStepSubmit(() => submitRef.current());
    return () => setStepSubmit(null);
  }, [setStepSubmit]);

  const quickPickIsos = QUICK_DATES.map(({ offset }) => localIsoDate(addDays(now, offset)));
  const customDateActive = dateValid && !quickPickIsos.includes(date);
  // หลัง 21:00 วันนี้ไม่เหลือเวลาเริ่มให้เลือก (เริ่มได้ถึง 21:30 และต้องหลังเวลาปัจจุบัน)
  const todayClosed = optionsFor(todayIso).length === 0;
  const startPassed = dateValid && !!startTime && !startValid;

  return (
    <div className="space-y-4">
      {/* Date */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">วันที่ต้องการ</h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {QUICK_DATES.map(({ offset, label }, i) => {
            const iso = quickPickIsos[i];
            const closed = offset === 0 && todayClosed;
            const active = !closed && date === iso;
            return (
              <button
                key={label}
                type="button"
                disabled={closed}
                onClick={() => selectDate(iso)}
                aria-pressed={active}
                className={`flex flex-col items-start px-4 py-3 min-h-[64px] rounded-xl border text-left transition ${
                  closed
                    ? 'bg-gray-50 border-[#E0E2E5] text-gray-400 cursor-not-allowed'
                    : active
                      ? 'bg-[#52B69A] border-[#52B69A] text-white cursor-pointer'
                      : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <span className="text-sm font-bold">{label}</span>
                <span className={`text-xs mt-0.5 ${active ? 'text-white/90' : 'text-[#8A8C8E]'}`}>
                  {closed ? 'เลยเวลาจองแล้ว' : fmtThaiShort(iso)}
                </span>
              </button>
            );
          })}
          <div className="relative">
            <button
              type="button"
              onClick={openCalendar}
              aria-pressed={customDateActive}
              className={`w-full h-full flex flex-col items-start px-4 py-3 min-h-[64px] rounded-xl border text-left transition cursor-pointer ${
                customDateActive
                  ? 'bg-[#52B69A] border-[#52B69A] text-white'
                  : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-1 text-sm font-bold">
                <span className="material-icons" style={{ fontSize: 16 }}>calendar_today</span>
                เลือกวันอื่น
              </span>
              <span className={`text-xs mt-0.5 ${customDateActive ? 'text-white/90' : 'text-[#8A8C8E]'}`}>
                {customDateActive ? fmtThaiShort(date) : 'เปิดปฏิทิน'}
              </span>
            </button>
            {/* ช่องจริงซ่อนไว้ใต้ปุ่ม — ปฏิทินของเบราว์เซอร์จะเปิดตรงตำแหน่งปุ่ม */}
            <input
              ref={dateInputRef}
              type="date"
              tabIndex={-1}
              aria-hidden="true"
              value={dateValid ? date : ''}
              min={todayIso}
              onChange={(e) => {
                if (e.target.value && e.target.value >= todayIso) selectDate(e.target.value);
              }}
              className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
            />
          </div>
        </div>
        {error.date && <p className="mt-3 text-xs font-semibold text-red-600">{error.date}</p>}
      </section>

      {/* Time */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">เวลาเริ่ม</h2>
        {!dateValid ? (
          <p className="text-sm text-[#8A8C8E] mt-1">เลือกวันที่ก่อน แล้วจะแสดงเวลาที่จองได้</p>
        ) : (
          <>
            <p className="text-sm text-[#8A8C8E] mt-1">
              ระบุเวลาเริ่มที่ต้องการให้ผู้ดูแลมาถึง
            </p>
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {startOptions.map((t) => (
                <TimeButton
                  key={t}
                  label={t}
                  active={startTime === t}
                  onClick={() => selectStart(t)}
                />
              ))}
            </div>
          </>
        )}
        {(error.startTime || startPassed) && (
          <p className="mt-3 text-xs font-semibold text-red-600">
            {error.startTime || 'เวลาเริ่มที่เลือกไว้ผ่านไปแล้ว กรุณาเลือกใหม่'}
          </p>
        )}

        {startValid && (
          <>
            <h2 className="mt-6 text-lg font-bold text-[#1A1A1A]">เวลาสิ้นสุด</h2>
            <p className="text-sm text-[#8A8C8E] mt-1">
              กรุณาระบุเวลาสิ้นสุดงาน
            </p>
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {endOptions.map((t) => (
                <TimeButton
                  key={t}
                  label={t}
                  sub={`${Math.round(bookingDurationHours(startTime, t) * 100) / 100} ชม.`}
                  active={endTime === t}
                  onClick={() => selectEnd(t)}
                />
              ))}
            </div>
            {error.endTime && (
              <p className="mt-3 text-xs font-semibold text-red-600">{error.endTime}</p>
            )}
          </>
        )}

        {/* สรุปอัปเดตทันที: "09:00 – 13:00 · 4 ชั่วโมง · ฿xxx" */}
        <div
          aria-live="polite"
          className="mt-6 bg-[#F0FAF4] border border-[#BFE0D6] rounded-xl p-4 text-[#1B5C48]"
        >
          {duration > 0 ? (
            <>
              <div className="text-xs font-semibold text-[#52B69A]">{fmtThaiLong(date)}</div>
              <div className="mt-1 text-base font-bold leading-relaxed">
                {startTime} – {endTime} | {fmtHours(duration)} | ฿{cost.total.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-[#575859]">
                ราคาประมาณการ
              </div>
            </>
          ) : (
            <div className="text-sm font-semibold leading-relaxed">
              เลือกวัน เวลาเริ่ม และเวลาสิ้นสุด แล้วระบบจะสรุปจำนวนชั่วโมงและราคาให้ที่นี่
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
