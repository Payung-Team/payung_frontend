import { useEffect, useRef, useState } from 'react';
import { useBooking } from '../../../context/BookingContext';
import {
  BOOKING_FORM_STEP_MINUTES,
  bookingDurationHours,
  bookingEndOptions,
  bookingStartOptions,
  defaultBookingEndTime,
  formatDurationHours,
  timeToMinutes,
} from '../../../lib/bookingTime';
import { estimateBookingCost } from '../../../lib/bookingPrice';
import { bookingServiceType } from '../../../lib/bookingServiceType';

// PYG-525 (การ์ดแม่ PYG-490): เลือกแค่ "วันที่ + เวลาเริ่ม + เวลาสิ้นสุด"
//   เลิกให้เลือกช่วงเช้า/บ่าย/เย็น และจำนวนชั่วโมงเอง — BE อนุมาน timeSlot และคำนวณ durationHours
//   ตัวเลือกเวลาทั้งหมดมาจาก lib/bookingTime.ts ซึ่งตรงกับกฎของ BE (booking-time.ts)
//   ใช้ทั้งจองให้ตัวเองและจองแทนในกลุ่มครอบครัว (ฟอร์มเดียวกัน)
// PYG-689: เวลาเริ่ม–สิ้นสุดอยู่แถวเดียวกันเป็น dropdown 2 ช่อง และเลือกได้ทีละ 1 ชั่วโมง
//   (เดิมเป็นปุ่มทีละ 30 นาทีสองตาราง ยาวมากบนมือถือ) — select ของเบราว์เซอร์เปิดตัวเลือกแบบวงล้อบนมือถือให้เอง

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

/** ร่างที่ค้างจากฟอร์มเดิม (ทีละ 30 นาที) ที่ไม่ลงตัวกับรายชั่วโมง — ถือว่ายังไม่ได้เลือก */
function onFormStep(time?: string | null): string {
  const minutes = timeToMinutes(time);
  return minutes !== null && minutes % BOOKING_FORM_STEP_MINUTES === 0 ? (time as string) : '';
}

function TimeSelect({
  id,
  label,
  value,
  placeholder,
  options,
  disabled,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const filled = !!value && !disabled;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-bold text-[#575859]">
        {label}
      </label>
      <div className="relative mt-1.5">
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`h-[52px] w-full appearance-none truncate rounded-xl border pl-3.5 pr-9 text-[15px] font-semibold outline-none transition sm:pl-4 sm:text-base ${
            disabled
              ? 'cursor-not-allowed border-[#E0E2E5] bg-gray-50 text-gray-400'
              : invalid
                ? 'cursor-pointer border-[#DC3545] bg-white text-[#1A1A1A]'
                : filled
                  ? 'cursor-pointer border-[#52B69A] bg-[#F0FAF4] text-[#1B5C48] focus:ring-2 focus:ring-[#52B69A]/30'
                  : 'cursor-pointer border-[#E0E2E5] bg-white text-[#8A8C8E] hover:border-[#BFE0D6] focus:border-[#52B69A] focus:ring-2 focus:ring-[#52B69A]/30'
          }`}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value} className="text-[#1A1A1A]">
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className={`material-icons pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${
            disabled ? 'text-gray-300' : 'text-[#52B69A]'
          }`}
          style={{ fontSize: 22 }}
        >
          expand_more
        </span>
      </div>
    </div>
  );
}

export default function BookingStepDateTime() {
  const { bookingDraft, setBookingDraft, goToStep, setStepSubmit, setStepMissing } = useBooking();

  const [date, setDate] = useState(bookingDraft?.dateTime?.date || '');
  const [startTime, setStartTime] = useState(() => onFormStep(bookingDraft?.dateTime?.startTime));
  const [endTime, setEndTime] = useState(() => onFormStep(bookingDraft?.dateTime?.endTime));
  const [error, setError] = useState<Record<string, string>>({});

  // นาฬิกาเดินทุกนาที — เปิดหน้าค้างไว้แล้วเวลาที่ผ่านไปต้องหายไปเองด้วย
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const todayIso = localIsoDate(now);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const optionsFor = (iso: string) =>
    bookingStartOptions(iso === todayIso ? nowMinute : undefined, BOOKING_FORM_STEP_MINUTES);

  // ร่างที่ค้างใน sessionStorage อาจเป็นวันที่ผ่านไปแล้ว — ถือว่ายังไม่ได้เลือก
  const dateValid = !!date && date >= todayIso;
  const startOptions = dateValid ? optionsFor(date) : [];
  const endOptions = bookingEndOptions(startTime, BOOKING_FORM_STEP_MINUTES);
  const startValid = startOptions.includes(startTime);
  const endValid = startValid && endOptions.includes(endTime);
  const duration = endValid ? bookingDurationHours(startTime, endTime) : 0;
  const cost = estimateBookingCost(duration, bookingServiceType(bookingDraft?.serviceTypes));

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
    // เปลี่ยนเวลาเริ่มแล้วเวลาสิ้นสุดเดิมยังใช้ได้ (ยาว 1–12 ชม.) → คงไว้ ไม่ต้องให้เลือกใหม่
    const keepEnd = bookingEndOptions(t, BOOKING_FORM_STEP_MINUTES).includes(endTime);
    if (!keepEnd) setEndTime(defaultBookingEndTime(t, BOOKING_FORM_STEP_MINUTES));
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

      {/* Time — เวลาเริ่ม → เวลาสิ้นสุด อยู่แถวเดียวกัน (PYG-689) */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">เวลาที่ต้องการ</h2>
        <p className="text-sm text-[#8A8C8E] mt-1">
          {dateValid
            ? 'เลือกเวลาที่ผู้ดูแลมาถึง และเวลาที่จบงาน (เลือกได้ทีละ 1 ชั่วโมง)'
            : 'เลือกวันที่ก่อน แล้วจะเลือกเวลาได้'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <TimeSelect
            id="booking-start-time"
            label="เวลาเริ่ม"
            value={startValid ? startTime : ''}
            placeholder="เลือกเวลา"
            options={startOptions.map((t) => ({ value: t, label: t }))}
            disabled={!dateValid || startOptions.length === 0}
            invalid={!!error.startTime || startPassed}
            onChange={selectStart}
          />
          {/* ห่อไว้ชั้นหนึ่ง: .material-icons ของ Google ตั้ง display เอง ทับคลาส hidden ของ Tailwind */}
          <span aria-hidden="true" className="hidden h-[52px] items-center text-[#8A8C8E] sm:flex">
            <span className="material-icons" style={{ fontSize: 20 }}>
              arrow_forward
            </span>
          </span>
          <TimeSelect
            id="booking-end-time"
            label="เวลาสิ้นสุด"
            value={endValid ? endTime : ''}
            placeholder="เลือกเวลา"
            options={endOptions.map((t) => ({
              value: t,
              label: `${t} (${formatDurationHours(bookingDurationHours(startTime, t))})`,
            }))}
            disabled={!startValid}
            invalid={!!error.endTime}
            onChange={selectEnd}
          />
        </div>

        {(error.startTime || startPassed) && (
          <p className="mt-3 text-xs font-semibold text-red-600">
            {error.startTime || 'เวลาเริ่มที่เลือกไว้ผ่านไปแล้ว กรุณาเลือกใหม่'}
          </p>
        )}
        {error.endTime && !error.startTime && (
          <p className="mt-3 text-xs font-semibold text-red-600">{error.endTime}</p>
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
