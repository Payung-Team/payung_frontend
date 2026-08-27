import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import BookingStepService from './steps/BookingStepService';
import BookingStepDateTime from './steps/BookingStepDateTime';
import BookingStepLocation from './steps/BookingStepLocation';
import BookingStepPatient from './steps/BookingStepPatient';
import BookingStepReview from './steps/BookingStepReview';

import pyLoad1 from '../../assets/PY-load-1.png';
import pyLoad2 from '../../assets/PY-load-2.png';
import pyLoad3 from '../../assets/PY-load-3.png';

const FRAMES = [pyLoad1, pyLoad2, pyLoad3];

const STEP_LABELS = ['บริการ', 'วันเวลา', 'สถานที่', 'ผู้รับบริการ', 'ตรวจสอบ'];
const STEP_CAPTIONS = [
  'ต้องการดูแลแบบไหน',
  'จะให้มาเมื่อไหร่',
  'ไปที่ไหน',
  'ดูแลใคร',
  'ตรวจสอบและส่งคำขอ',
];

function SearchingLoadingScreen() {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [positionPercent, setPositionPercent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % FRAMES.length);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPositionPercent((prev) => (prev >= 75 ? 0 : prev + 1.25));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const dots = [
    { left: '10%', threshold: 18 },
    { left: '23%', threshold: 31 },
    { left: '36%', threshold: 44 },
    { left: '49%', threshold: 57 },
    { left: '62%', threshold: 70 },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] bg-[#F6FAF9] px-4">
      <div className="flex flex-col items-center max-w-[700px] text-center space-y-8">
        <div className="relative w-[400px] h-[180px] border-b-2 border-dashed border-[#E0E2E5] mb-2 overflow-hidden flex items-end">
          {dots.map((dot, index) => (
            <div
              key={index}
              style={{ left: dot.left }}
              className={`w-3.5 h-3.5 rounded-full bg-[#1D471C] absolute bottom-[6px] transition-all duration-300 ${
                positionPercent > dot.threshold ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              }`}
            />
          ))}
          <div
            style={{ left: `${positionPercent}%` }}
            className="absolute bottom-[-12px] h-[140px] w-auto transition-all duration-100 ease-linear"
          >
            <img
              src={FRAMES[currentFrame]}
              alt="Elderly walking animation"
              className="h-full w-auto object-contain"
            />
          </div>
        </div>
        <div className="space-y-3 mt-4">
          <h3 className="font-['Bai_Jamjuree'] font-bold text-2xl md:text-3xl text-[#1A1A1A] leading-normal">
            กำลังค้นหาผู้ดูแลที่เหมาะสม
          </h3>
          <p className="font-['Bai_Jamjuree'] text-sm md:text-base text-[#8A8C8E] leading-relaxed">
            ระบบกำลังจับคู่ข้อมูลความต้องการของคุณกับผู้ดูแลในพื้นที่...
          </p>
          <p className="font-['Bai_Jamjuree'] text-xs md:text-sm text-[#AAB2BA] pt-4">
            กรุณารอสักครู่
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  filled,
}: {
  icon: string;
  label: string;
  value: string;
  filled: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={`material-icons text-lg mt-0.5 ${filled ? 'text-[#52B69A]' : 'text-[#8A968F]'}`}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#8A8C8E]">{label}</div>
        <div
          className={`text-sm font-semibold leading-snug break-words ${
            filled ? 'text-[#1A1A1A]' : 'text-[#8A968F]'
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default function BookingRequestPage() {
  const navigate = useNavigate();
  const { step, goToStep, bookingDraft, resetBooking, stepSubmit } = useBooking();

  useEffect(() => {
    resetBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [isSearching, setIsSearching] = useState(false);
  const [showPlanDetail, setShowPlanDetail] = useState(false);

  const handleBack = () => {
    if (step > 1) goToStep(step - 1);
    else navigate('/patient-home');
  };
  const handleNext = () => {
    if (stepSubmit) stepSubmit();
  };

  const nextLabel =
    step === 5 ? 'เริ่มต้นค้นหาผู้ดูแล'
    : step === 4 ? 'ตรวจสอบรายละเอียด'
    : 'ถัดไป';
  const nextIcon = step === 5 ? 'search' : 'arrow_forward';
  const nextHint =
    step === 5
      ? 'กดเพื่อเริ่มค้นหาผู้ดูแลที่ตรงกับคำขอของคุณ'
      : 'ข้อมูลถูกบันทึกอัตโนมัติทุกขั้น';

  // Sidebar summary values
  const duration = bookingDraft?.dateTime?.duration || 4;
  const averageHourlyRate = 250;
  const rawCost = averageHourlyRate * duration;
  const platformFee = Math.round(rawCost * 0.1);
  const totalEstimated = rawCost + platformFee;

  const locs = bookingDraft?.serviceLocation || [];
  const locName =
    locs.length === 2 ? 'ที่บ้าน + พาไปข้างนอก'
    : locs.includes('at_home') ? 'ที่บ้านผู้ป่วย'
    : locs.includes('accompany_outside') ? 'พาไปข้างนอก'
    : '';

  const svcCount = bookingDraft?.serviceTypes?.length || 0;
  const taskCount =
    (bookingDraft?.jobDetails?.tasks?.length || 0) +
    (bookingDraft?.jobDetails?.customTasks?.length || 0);
  const planText = svcCount ? `${taskCount} งานย่อย จาก ${svcCount} บริการ` : '';

  const dt = bookingDraft?.dateTime;
  const dateTimeText =
    dt?.date && dt?.startTime
      ? `${new Date(dt.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · ${dt.startTime} น.`
      : '';

  const patientName = bookingDraft?.recipient?.patientDetails?.name || '';

  const handleStartSearch = async () => {
    if (!bookingDraft) return;
    setIsSearching(true);
    await new Promise((resolve) => setTimeout(resolve, 2500));
    setIsSearching(false);
    navigate('/search');
  };

  if (isSearching) return <SearchingLoadingScreen />;

  return (
    <div className="bg-[#F6FAF9] min-h-screen pb-32">
      {/* Header: compact title + step counter + pill tabs */}
      <div className="bg-white border-b border-[#E0E2E5] sticky top-[70px] z-20">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1">
            <span className="material-icons text-[#52B69A] text-[26px]">health_and_safety</span>
            <div>
              <div className="text-base font-bold text-[#1A1A1A] leading-tight">จองผู้ดูแล</div>
              <div className="text-xs text-[#8A8C8E]">{STEP_CAPTIONS[step - 1]}</div>
            </div>
          </div>
          <div className="text-xs text-[#8A8C8E] font-semibold">ขั้นที่ {step} จาก 5</div>
        </div>

        {/* Pill tabs */}
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 pb-3">
          <div className="flex gap-1.5">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const isActive = step === n;
              const isPast = n < step;
              const isClickable = n <= step;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => isClickable && goToStep(n)}
                  disabled={!isClickable}
                  aria-current={isActive ? 'step' : undefined}
                  className={`flex-1 min-h-[40px] py-2 px-1.5 rounded-lg text-[11px] md:text-xs font-bold leading-tight transition ${
                    isActive
                      ? 'bg-[#1B5C48] text-white cursor-pointer'
                      : isPast
                        ? 'bg-[#E6F5ED] text-[#1B5C48] cursor-pointer hover:bg-[#D9EEDF]'
                        : 'bg-[#EDF1F0] text-[#8A968F] cursor-not-allowed'
                  }`}
                >
                  {n}. {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-4">
            {step === 1 && <BookingStepService />}
            {step === 2 && <BookingStepDateTime />}
            {step === 3 && <BookingStepLocation />}
            {step === 4 && <BookingStepPatient />}
            {step === 5 && <BookingStepReview onStartSearch={handleStartSearch} />}
          </div>

          {/* Sidebar summary */}
          <aside className="lg:col-span-1">
            <div className="bg-white border border-[#E0E2E5] rounded-2xl p-5 sticky top-[196px]">
              <h3 className="text-sm font-bold text-[#1A1A1A]">สรุปการจอง</h3>
              <div className="mt-4 space-y-3">
                <SummaryRow
                  icon="place"
                  label="สถานที่"
                  value={locName || 'ยังไม่ระบุ'}
                  filled={!!locName}
                />
                {/* Expandable plan row */}
                {svcCount > 0 ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowPlanDetail((v) => !v)}
                      aria-expanded={showPlanDetail}
                      className="w-full flex items-start gap-2.5 text-left hover:bg-gray-50 rounded-lg -mx-2 px-2 py-1 transition cursor-pointer"
                    >
                      <span className="material-icons text-lg mt-0.5 text-[#52B69A]">
                        checklist
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-[#8A8C8E]">แผนงาน</div>
                        <div className="text-sm font-semibold leading-snug break-words text-[#1A1A1A]">
                          {planText}
                        </div>
                      </div>
                      <span className="material-icons text-lg text-[#8A8C8E] mt-0.5">
                        {showPlanDetail ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    {showPlanDetail && (
                      <div className="mt-2 ml-7 space-y-2.5 border-l-2 border-[#E6F5ED] pl-3">
                        {(bookingDraft?.serviceTypes || []).map((svc) => {
                          const tasksInSvc = (bookingDraft?.jobDetails?.tasks || []).filter(
                            (t) => t.id.startsWith(`${svc}-`),
                          );
                          if (tasksInSvc.length === 0) return null;
                          return (
                            <div key={svc}>
                              <div className="text-[11px] font-bold text-[#52B69A]">{svc}</div>
                              <ul className="mt-1 space-y-1">
                                {tasksInSvc.map((t) => (
                                  <li
                                    key={t.id}
                                    className="text-xs text-[#575859] leading-snug flex gap-1.5"
                                  >
                                    <span className="text-[#52B69A]">•</span>
                                    <span className="flex-1">{t.name}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                        {(bookingDraft?.jobDetails?.customTasks || []).length > 0 && (
                          <div>
                            <div className="text-[11px] font-bold text-[#3B5BDB]">
                              งานพิเศษที่เพิ่ม
                            </div>
                            <ul className="mt-1 space-y-1">
                              {bookingDraft?.jobDetails?.customTasks?.map((t) => (
                                <li
                                  key={t.id}
                                  className="text-xs text-[#575859] leading-snug flex gap-1.5"
                                >
                                  <span className="text-[#3B5BDB]">★</span>
                                  <span className="flex-1">{t.name}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <SummaryRow
                    icon="checklist"
                    label="แผนงาน"
                    value="ยังไม่เลือก"
                    filled={false}
                  />
                )}
                <SummaryRow
                  icon="event"
                  label="วันเวลา"
                  value={dateTimeText || 'ยังไม่เลือก'}
                  filled={!!dateTimeText}
                />
                <SummaryRow
                  icon="person"
                  label="คนไข้"
                  value={patientName || 'ยังไม่กรอก'}
                  filled={!!patientName}
                />
              </div>
              <div className="border-t border-dashed border-[#E0E2E5] mt-4 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#575859]">
                  <span>ค่าดูแล {duration} ชม. × 250฿</span>
                  <span>{rawCost.toLocaleString()} ฿</span>
                </div>
                <div className="flex justify-between text-[#575859]">
                  <span>ค่าบริการแพลตฟอร์ม</span>
                  <span>{platformFee.toLocaleString()} ฿</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>ประมาณการรวม</span>
                  <span>{totalEstimated.toLocaleString()} ฿</span>
                </div>
                <p className="text-xs text-[#8A8C8E] leading-relaxed pt-1">
                  ยังไม่ตัดเงิน — ชำระหลังผู้ดูแลรับงาน
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Sticky bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-[#E0E2E5] z-30">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-3 min-h-[48px] bg-white border border-[#E0E2E5] rounded-xl text-sm font-semibold text-[#575859] hover:bg-gray-50 transition cursor-pointer"
            >
              <span className="material-icons text-base">arrow_back</span>
              <span className="hidden sm:inline">ย้อนกลับ</span>
            </button>
          )}
          <span className="flex-1 text-xs text-[#8A8C8E] leading-snug hidden md:block">
            {nextHint}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center justify-center gap-2 px-6 py-3 min-h-[48px] min-w-[140px] bg-[#52B69A] text-white rounded-xl font-bold text-sm shadow-md hover:bg-[#469e85] transition cursor-pointer"
          >
            <span>{nextLabel}</span>
            <span className="material-icons text-base">{nextIcon}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
