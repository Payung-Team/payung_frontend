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
  const { bookingDraft, setBookingDraft, goToStep, setStepSubmit, setStepMissing } = useBooking();

  const [date, setDate] = useState(bookingDraft?.dateTime?.date || '');
  const [slot, setSlot] = useState(bookingDraft?.dateTime?.slot || '');
  const [startTime, setStartTime] = useState(bookingDraft?.dateTime?.startTime || '');
  // 0 = ยังไม่เลือกจำนวนชั่วโมง — ไม่ตั้งค่าเริ่มต้นให้ ผู้ใช้ต้องเลือกเอง
  const [duration, setDuration] = useState<number>(bookingDraft?.dateTime?.duration || 0);
  const [error, setError] = useState<Record<string, string>>({});

  const endTime = useMemo(
    () => (duration ? computeEndTime(startTime, duration) : ''),
    [startTime, duration],
  );

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
    if (!duration) errs.duration = 'กรุณาเลือกจำนวนชั่วโมง';
    setError(errs);
    if (Object.keys(errs).length === 0) goToStep(3);
  };

  // Report missing required fields so the sticky "Next" button can disable itself
  useEffect(() => {
    const missing: string[] = [];
    if (!date) missing.push('วันที่');
    if (!slot) missing.push('ช่วงเวลานัดหมาย');
    if (!startTime || (slot && !isTimeInSlot(startTime, slot))) missing.push('เวลาเริ่มงาน');
    if (!duration) missing.push('จำนวนชั่วโมง');
    setStepMissing(missing);
    return () => setStepMissing([]);
  }, [date, slot, startTime, duration, setStepMissing]);

  // Register submit
  const submitRef = useRef<() => void>(() => {});
  submitRef.current = handleSubmit;
  useEffect(() => {
    setStepSubmit(() => submitRef.current());
    return () => setStepSubmit(null);
  }, [setStepSubmit]);

  const todayIso = new Date().toISOString().split('T')[0];
  // วันที่จากปุ่มลัด 3 ใบแรก — ถ้าเลือกวันอื่นนอกเหนือจากนี้ ให้ไฮไลต์ช่องเลือกวันเอง
  const quickPickIsos = [0, 1, 2].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  });
  const customDateActive = !!date && !quickPickIsos.includes(date);
  const scheduleSentence =
    date && startTime && duration
      ? `ผู้ดูแลมาถึง ${startTime} น. วันที่ ${fmtThai(date)} และอยู่จนถึง ${endTime} น. (${duration} ชั่วโมง)`
      : 'เลือกวัน เวลา และจำนวนชั่วโมง แล้วระบบจะสรุปช่วงเวลาทำงานให้ตรวจสอบที่นี่';

  return (
    <div className="space-y-4">
      {/* Date */}
      <section className="bg-white p-6 rounded-2xl border border-gray-100">
        <h2 className="text-lg font-bold text-[#1A1A1A]">วันที่ต้องการ</h2>
        <div className="mt-8 flex flex-wrap items-start gap-2">
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
          <span className="flex items-center min-h-[64px] text-sm font-semibold text-[#8A8C8E] px-1">
            หรือ
          </span>
          <label className="relative block min-w-[200px] cursor-pointer">
            <span className="absolute -top-5 left-0 text-xs font-semibold text-[#8A8C8E]">
              เลือกวันอื่น
            </span>
            <div
              className={`relative flex items-center gap-1.5 px-4 py-3 min-h-[64px] rounded-xl border transition ${
                customDateActive ? 'border-[#52B69A] bg-[#F2FAF7]' : 'border-[#E0E2E5] bg-white'
              }`}
            >
              <span
                className={`material-icons text-sm ${customDateActive ? 'text-[#52B69A]' : 'text-[#AAB2BA]'}`}
              >
                calendar_today
              </span>
              <input
                type="date"
                value={date}
                min={todayIso}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-[#1A1A1A] focus:outline-none cursor-pointer"
              />
            </div>
          </label>
        </div>
        {error.date && <p className="mt-3 text-xs font-semibold text-red-600">{error.date}</p>}
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
        <h2 className="mt-6 text-lg font-bold text-[#1A1A1A]">เวลาเริ่มงาน</h2>
        <p className="text-sm text-[#8A8C8E] mt-1">
          ปรับเวลาเริ่มได้เอง หากต้องการเวลาที่ต่างจากช่วงเวลาที่เลือกไว้
        </p>
        <input
          type="time"
          value={startTime}
          onChange={(e) => handleStartChange(e.target.value)}
          className={`block w-[160px] mt-4 p-3 border rounded-xl text-sm bg-white focus:outline-none focus:ring-1 ${
            error.startTime
              ? 'border-red-500 focus:ring-red-500'
              : 'border-[#E0E2E5] focus:ring-[#52B69A]'
          }`}
        />
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
        {error.duration && (
          <p className="mt-3 text-xs font-semibold text-red-600">{error.duration}</p>
        )}
        <div className="mt-4 bg-[#F0FAF4] border border-[#BFE0D6] rounded-xl p-4 text-sm font-semibold text-[#1B5C48] leading-relaxed">
          {scheduleSentence}
        </div>
      </section>
    </div>
  );
}
