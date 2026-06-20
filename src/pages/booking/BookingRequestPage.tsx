import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../context/BookingContext';
import BookingStep1 from './steps/BookingStep1';
import BookingStep2 from './steps/BookingStep2';
import BookingStep3 from './steps/BookingStep3';

import pyLoad1 from '../../assets/PY-load-1.png';
import pyLoad2 from '../../assets/PY-load-2.png';
import pyLoad3 from '../../assets/PY-load-3.png';

const FRAMES = [pyLoad1, pyLoad2, pyLoad3];

function SearchingLoadingScreen() {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [positionPercent, setPositionPercent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % FRAMES.length);
    }, 200); // 200ms per frame
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPositionPercent((prev) => (prev >= 75 ? 0 : prev + 1.25));
    }, 50); // 50ms tick rate
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
        
        {/* Walking Track Area with Ground Line */}
        <div className="relative w-[400px] h-[180px] border-b-2 border-dashed border-[#E0E2E5] mb-2 overflow-hidden flex items-end">
          {/* Footprint/Trailing Dots */}
          {dots.map((dot, index) => (
            <div
              key={index}
              style={{ left: dot.left }}
              className={`w-3.5 h-3.5 rounded-full bg-[#1D471C] absolute bottom-[6px] transition-all duration-300 ${
                positionPercent > dot.threshold ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
              }`}
            />
          ))}

          {/* Animated Elderly Person Walking */}
          <div
            style={{ left: `${positionPercent}%`}}
            className="absolute bottom-[-12px] h-[140px] w-auto transition-all duration-100 ease-linear"
          >
            <img
              src={FRAMES[currentFrame]}
              alt="Elderly walking animation"
              className="h-full w-auto object-contain"
            />
          </div>
        </div>

        {/* Text Details */}
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

export default function BookingRequestPage() {
  const navigate = useNavigate();
  const { step, goToStep, bookingDraft, resetBooking } = useBooking();

  useEffect(() => {
    resetBooking();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isSearching, setIsSearching] = useState(false);

  // Helper values for sidebar cost estimation
  const duration = bookingDraft?.dateTime?.duration || 4;
  const averageHourlyRate = 250;
  const rawCost = averageHourlyRate * duration;
  const platformFee = Math.round(rawCost * 0.1);
  const totalEstimated = rawCost + platformFee;

  const handleStartSearch = async () => {
    if (!bookingDraft) return;

    setIsSearching(true);
    // แสดง animation แล้วไปหน้า search โดยไม่สร้าง booking ใน DB
    // booking จะถูกสร้างเมื่อ patient เลือก caregiver ที่หน้า CaregiverProfilePage
    await new Promise(resolve => setTimeout(resolve, 2500));
    setIsSearching(false);
    navigate('/search');
  };

  if (isSearching) {
    return <SearchingLoadingScreen />;
  }

  return (
    <div className="bg-[#F6FAF9] min-h-screen py-6 px-4 md:px-8">
      <div className="max-w-[1200px] mx-auto">
        {/* Back Button */}
        <button
          onClick={() => {
            if (step > 1) goToStep(step - 1);
            else navigate('/patient-home');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E0E2E5] rounded-full shadow-sm hover:bg-gray-50 transition cursor-pointer text-sm font-semibold text-[#575859] mb-6"
        >
          <span className="material-icons text-base">arrow_back</span>
          ย้อนกลับ
        </button>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">สร้างคำขอจองบริการดูแล</h1>
          <p className="text-sm text-[#8A8C8E] mt-1">กรอกรายละเอียดเพื่อค้นหาผู้ดูแลที่เหมาะกับคุณ</p>
        </div>

        {/* Progress Tracker */}
        <div className="flex justify-center mb-8">
          <div className="relative flex items-center justify-between w-full max-w-[600px]">
            {/* Step lines */}
            <div className="absolute left-0 right-0 top-[16px] h-[2px] bg-[#E0E2E5] z-0" />
            <div
              className="absolute left-0 top-[16px] h-[2px] bg-[#52B69A] transition-all duration-300 z-0"
              style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}
            />

            {/* Step 1 */}
            <div className="flex flex-col items-center z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition ${step >= 1 ? 'bg-[#52B69A] text-white' : 'bg-[#C6C8CB] text-white'}`}>
                1
              </div>
              <span className="text-xs font-semibold text-[#1A1A1A] mt-2 bg-[#F6FAF9] px-2">ข้อมูลการจอง</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition ${step >= 2 ? 'bg-[#52B69A] text-white' : 'bg-[#C6C8CB] text-white'}`}>
                2
              </div>
              <span className={`text-xs font-semibold mt-2 bg-[#F6FAF9] px-2 ${step >= 2 ? 'text-[#1A1A1A]' : 'text-[#8A8C8E]'}`}>ระบุความต้องการ</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center z-10">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition ${step >= 3 ? 'bg-[#52B69A] text-white' : 'bg-[#C6C8CB] text-white'}`}>
                3
              </div>
              <span className={`text-xs font-semibold mt-2 bg-[#F6FAF9] px-2 ${step >= 3 ? 'text-[#1A1A1A]' : 'text-[#8A8C8E]'}`}>ยืนยันรายละเอียด</span>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`${step === 3 ? 'lg:col-span-3 max-w-[800px] mx-auto w-full' : 'lg:col-span-2'} space-y-6`}>
            {step === 1 && <BookingStep1 />}
            {step === 2 && <BookingStep2 />}
            {step === 3 && <BookingStep3 onStartSearch={handleStartSearch} />}
          </div>

          {/* Right Sidebar: Cost Estimator */}
          {step !== 3 && (
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6 sticky top-[94px]">
                <h3 className="text-lg font-bold text-[#1A1A1A] border-b pb-3">ประมาณการค่าใช้จ่าย</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-sm text-[#575859]">
                    <span>อัตราเฉลี่ยผู้ดูแล:</span>
                    <span className="font-semibold text-gray-800">฿{averageHourlyRate}/ชม.</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#575859]">
                    <span>ระยะเวลา:</span>
                    <span className="font-semibold text-gray-800">{duration} ชม.</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#575859]">
                    <span>ค่าบริการผู้ดูแล:</span>
                    <span className="font-semibold text-gray-800">฿{rawCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#575859] border-b pb-3">
                    <span>ค่าธรรมเนียมแพลตฟอร์ม (10%):</span>
                    <span className="font-semibold text-gray-800">฿{platformFee.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-base font-bold text-[#1A1A1A] pt-1">
                    <span>รวมทั้งสิ้นโดยประมาณ:</span>
                    <span className="text-[#52B69A]">฿{totalEstimated.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-start gap-2">
                  <span className="material-icons text-teal-600 text-sm mt-0.5">info</span>
                  <p className="text-xs text-[#52B69A] leading-relaxed font-semibold">
                    นี่คือการประมาณการเบื้องต้น ค่าบริการจริงอาจขึ้นอยู่กับผู้ดูแลแต่ละท่านที่คุณเลือกในขั้นตอนถัดไป
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
