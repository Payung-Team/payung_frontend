import { useEffect, useMemo, useRef, useState } from 'react';
import { useBooking } from '../../../context/BookingContext';

const BUSY_SLOTS: string[] = [];

const SLOTS = [
  { id: 'morning', label: 'ช่วงเช้า', range: '08:00 - 12:00', start: '08:00' },
  { id: 'afternoon', label: 'ช่วงบ่าย', range: '13:00 - 17:00', start: '13:00' },
  { id: 'evening', label: 'ช่วงเย็น', range: '18:00 - 22:00', start: '18:00' },
  { id: 'night', label: 'ช่วงดึก', range: '22:00 - 06:00', start: '22:00' },
];

const HOURLY_RATE = 250;

function isTimeInSlot(time: string, slotName: string) {
  if (!time || !slotName) return true;
  const [h, m] = time.split(':').map(Number);
  const val = h + m / 60;
  if (slotName === 'morning') return val >= 8 && val <= 12;
  if (slotName === 'afternoon') return val >= 13 && val <= 17;
  if (slotName === 'evening') return val >= 18 && val <= 22;
  if (slotName === 'night') return val >= 22 || val <= 6;
  return true;
}

function computeEndTime(start: string, duration: number) {
  if (!start) return '';
  const [h, m] = start.split(':').map(Number);
  const endH = (h + duration) % 24;
  return `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtThai(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function BookingStepDateTime() {
  const { bookingDraft, setBookingDraft, goToStep, setStepSubmit } = useBooking();

  const [date, setDate] = useState(bookingDraft?.dateTime?.date || '');
  const [slot, setSlot] = useState(bookingDraft?.dateTime?.slot || '');
  const [startTime, setStartTime] = useState(bookingDraft?.dateTime?.startTime || '');
  const [duration, setDuration] = useState<number>(bookingDraft?.dateTime?.duration || 4);
  const [error, setError] = useState<Record<string, string>>({});

  const endTime = useMemo(() => computeEndTime(startTime, duration), [startTime, duration]);

  // Auto-save
  useEffect(() => {
    setBookingDraft((prev) => ({
      ...(prev || { serviceLocation: [], serviceTypes: [] }),
      dateTime: { date, slot, startTime, duration, endTime },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, slot, startTime, duration, endTime]);

  const selectSlot = (s: (typeof SLOTS)[number]) => {
    setSlot(s.id);
    setStartTime(s.start);
    setError((prev) => {
      const next = { ...prev };
      delete next.slot;
      delete next.startTime;
      return next;
    });
  };

  const handleStartChange = (val: string) => {
    setStartTime(val);
    if (slot && val && !isTimeInSlot(val, slot)) {
      const slotObj = SLOTS.find((s) => s.id === slot);
      setError((prev) => ({
        ...prev,
        startTime: `เวลาเริ่มต้นต้องอยู่ใน ${slotObj?.label} (${slotObj?.range} น.)`,
      }));
    } else {
      setError((prev) => {
        const next = { ...prev };
        delete next.startTime;
        return next;
      });
    }
  };

  const handleSubmit = () => {
    const errs: Record<string, string> = {};
    if (!date) errs.date = 'กรุณาเลือกวันที่รับบริการ';
    if (!slot) errs.slot = 'กรุณาเลือกช่วงเวลานัดหมาย';
    if (!startTime) errs.startTime = 'กรุณาระบุเวลาเริ่ม';
    else if (slot && !isTimeInSlot(startTime, slot)) {
      const slotObj = SLOTS.find((s) => s.id === slot);
      errs.startTime = `เวลาเริ่มต้นต้องอยู่ใน ${slotObj?.label} (${slotObj?.range} น.)`;
    }
    setError(errs);
    if (Object.keys(errs).length === 0) goToStep(3);
  };

  // Register submit
  const submitRef = useRef<() => void>(() => {});
  submitRef.current = handleSubmit;
  useEffect(() => {
    setStepSubmit(() => submitRef.current());
    return () => setStepSubmit(null);
  }, [setStepSubmit]);

  const todayIso = new Date().toISOString().split('T')[0];
  const scheduleSentence =
    date && startTime
      ? `ผู้ดูแลมาถึง ${startTime} น. วันที่ ${fmtThai(date)} และอยู่จนถึง ${endTime} น. (${duration} ชั่วโมง)`
      : 'เลือกวันและเวลา แล้วระบบจะสรุปช่วงเวลาทำงานให้ตรวจสอบที่นี่';

  return (
    <div className="space-y-4">
      {/* Date */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">วันที่ต้องการ</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {[0, 1, 2].map((offset) => {
            const d = new Date();
            d.setDate(d.getDate() + offset);
            const iso = d.toISOString().split('T')[0];
            const label = offset === 0 ? 'วันนี้' : offset === 1 ? 'พรุ่งนี้' : 'มะรืนนี้';
            const sub = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
            const active = date === iso;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setDate(iso)}
                className={`flex flex-col items-start px-4 py-3 rounded-xl border text-left cursor-pointer transition min-w-[120px] ${
                  active
                    ? 'bg-[#52B69A] border-[#52B69A] text-white'
                    : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-bold">{label}</span>
                <span className={`text-xs mt-0.5 ${active ? 'text-white/90' : 'text-[#8A8C8E]'}`}>
                  {sub}
                </span>
              </button>
            );
          })}
        </div>
        {error.date && <p className="mt-3 text-xs font-semibold text-red-600">{error.date}</p>}
        <label className="block mt-4 text-sm font-semibold text-[#575859]">
          หรือเลือกวันอื่น
          <div className="relative mt-2 max-w-[280px]">
            <input
              type="date"
              value={date}
              min={todayIso}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 pl-10 border border-[#E0E2E5] rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
            />
            <span className="absolute left-3 top-3.5 material-icons text-[#AAB2BA] text-sm">
              calendar_today
            </span>
          </div>
        </label>
      </section>

      {/* Time slot */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">ช่วงเวลานัดหมาย</h2>
        <p className="text-sm text-[#8A8C8E] mt-1">แตะเลือกช่วงเวลา — ระบบจะเติมเวลาเริ่มให้อัตโนมัติ</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {SLOTS.map((s) => {
            const busy = BUSY_SLOTS.includes(s.id);
            const active = slot === s.id;
            return (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => selectSlot(s)}
                className={`flex flex-col items-start px-4 py-3 rounded-xl border text-left transition ${
                  busy
                    ? 'bg-gray-50 border-[#E0E2E5] text-gray-300 cursor-not-allowed'
                    : active
                      ? 'bg-[#52B69A] border-[#52B69A] text-white cursor-pointer'
                      : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <span className="text-sm font-bold">{s.label}</span>
                <span
                  className={`text-xs mt-0.5 ${active ? 'text-white/90' : 'text-[#8A8C8E]'}`}
                >
                  {s.range} น.
                </span>
                {busy && <span className="text-[10px] text-red-500 mt-0.5">ไม่ว่าง</span>}
              </button>
            );
          })}
        </div>
        {error.slot && <p className="mt-3 text-xs font-semibold text-red-600">{error.slot}</p>}

        {/* Start time (custom) */}
        <label className="block mt-5 text-sm font-semibold text-[#575859]">
          เวลาเริ่มงาน
          <input
            type="time"
            value={startTime}
            onChange={(e) => handleStartChange(e.target.value)}
            className={`block w-[160px] mt-2 p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
              error.startTime
                ? 'border-red-500 focus:ring-red-500'
                : 'border-[#E0E2E5] focus:ring-[#52B69A]'
            }`}
          />
        </label>
        {error.startTime && (
          <p className="mt-2 text-xs font-semibold text-red-600">{error.startTime}</p>
        )}
      </section>

      {/* Duration */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">ต้องการกี่ชั่วโมง</h2>
        <div className="mt-4 grid grid-cols-3 md:grid-cols-5 gap-2">
          {[2, 3, 4, 6, 8].map((h) => {
            const active = duration === h;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setDuration(h)}
                className={`flex flex-col items-center px-3 py-3 rounded-xl border transition cursor-pointer ${
                  active
                    ? 'bg-[#52B69A] border-[#52B69A] text-white'
                    : 'bg-white border-[#E0E2E5] text-[#575859] hover:bg-gray-50'
                }`}
              >
                <span className="text-base font-bold">{h} ชม.</span>
                <span
                  className={`text-xs mt-0.5 ${active ? 'text-white/90' : 'text-[#8A8C8E]'}`}
                >
                  ≈ {(HOURLY_RATE * h).toLocaleString()} ฿
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 bg-[#F0FAF4] border border-[#BFE0D6] rounded-xl p-4 text-sm font-semibold text-[#1B5C48] leading-relaxed">
          {scheduleSentence}
        </div>
      </section>
    </div>
  );
}
