import { useState } from 'react';
import { useBooking } from '../../../context/BookingContext';

const SUB_TASKS = [
  { id: 'personal_hygiene', name: 'ช่วยเหลือสุขอนามัยส่วนบุคคล (อาบน้ำ/แต่งตัว)' },
  { id: 'mobility_support', name: 'ช่วยพยุงเดินและเคลื่อนย้าย' },
  { id: 'meal_preparation', name: 'จัดเตรียมอาหารและเครื่องดื่ม' },
  { id: 'bedridden_turn', name: 'พลิกตัวผู้ป่วยติดเตียงป้องกันแผลกดทับ' },
  { id: 'bed_cleaning', name: 'ช่วยเหลือการทำความสะอาดร่างกายบนเตียง' },
  { id: 'bed_physical_therapy', name: 'ช่วยเหลือการทำกายภาพบำบัดเบื้องต้นบนเตียง' }
];

export default function BookingStep2() {
  const { bookingDraft, setBookingDraft, goToStep } = useBooking();

  const [selectedTasks, setSelectedTasks] = useState<string[]>(
    bookingDraft?.jobDetails?.tasks?.map(t => t.id) || []
  );
  const [customTasks, setCustomTasks] = useState<{ id: string; name: string }[]>(
    bookingDraft?.jobDetails?.customTasks || []
  );
  const [notes, setNotes] = useState(bookingDraft?.jobDetails?.notes || '');
  const [customTaskInput, setCustomTaskInput] = useState('');

  const handleToggleTask = (id: string) => {
    setSelectedTasks(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  const handleAddCustomTask = () => {
    const trimmed = customTaskInput.trim();
    if (!trimmed) return;
    const newId = `custom-${Date.now()}`;
    const newTask = {
      id: newId,
      name: trimmed
    };
    setCustomTasks(prev => [...prev, newTask]);
    setSelectedTasks(prev => [...prev, newId]);
    setCustomTaskInput('');
  };

  const handleDeleteCustomTask = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setCustomTasks(prev => prev.filter(t => t.id !== id));
    setSelectedTasks(prev => prev.filter(t => t !== id));
  };

  const handleSave = () => {
    const tasks = SUB_TASKS.filter(t => selectedTasks.includes(t.id)).map(t => ({
      id: t.id,
      name: t.name
    }));

    const activeCustomTasks = customTasks.filter(t => selectedTasks.includes(t.id));

    setBookingDraft(prev => {
      if (!prev) return null;
      return {
        ...prev,
        jobDetails: {
          tasks,
          customTasks: activeCustomTasks,
          notes
        }
      };
    });
  };

  const handleNext = () => {
    handleSave();
    goToStep(3);
  };

  const handleBack = () => {
    handleSave();
    goToStep(1);
  };

  return (
    <div className="space-y-6">
      {/* Card 1: ภารกิจย่อยหลักตามประเภทบริการ */}
      <div className="bg-white p-[22px] rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.03)] space-y-4">
        <div>
          <h3 
            className="text-[15px] font-bold text-[#1A1A1A] leading-[22px]" 
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ภารกิจย่อยหลักตามประเภทบริการ
          </h3>
          <p 
            className="text-xs text-[#8A8C8E] leading-[18px] mt-1"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            เลือกภารกิจที่ต้องการ และเพิ่มงานพิเศษอื่นๆ ได้
          </p>
        </div>

        {/* Checkboxes List */}
        <div className="space-y-2.5">
          {SUB_TASKS.map((task) => {
            const isChecked = selectedTasks.includes(task.id);
            return (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                className={`flex items-center p-[10px_12px] gap-2.5 bg-white border rounded-lg cursor-pointer transition-all duration-200 select-none ${
                  isChecked 
                    ? 'border-[#52B69A] bg-[#F0FAF4] text-[#1B5C48]' 
                    : 'border-[#E0E2E5] hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  className="w-4 h-4 text-[#52B69A] border-black rounded-[3px] focus:ring-[#52B69A] pointer-events-none"
                />
                <span 
                  className="text-[13px] font-semibold leading-[20px] text-[#1A1A1A]"
                  style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                >
                  {task.name}
                </span>
              </div>
            );
          })}

          {customTasks.map((task) => {
            const isChecked = selectedTasks.includes(task.id);
            return (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task.id)}
                className={`flex items-center justify-between p-[10px_12px] gap-2.5 bg-white border rounded-lg cursor-pointer transition-all duration-200 select-none ${
                  isChecked 
                    ? 'border-[#52B69A] bg-[#F0FAF4] text-[#1B5C48]' 
                    : 'border-[#E0E2E5] hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="w-4 h-4 text-[#52B69A] border-black rounded-[3px] focus:ring-[#52B69A] pointer-events-none"
                  />
                  <span 
                    className="text-[13px] font-semibold leading-[20px] text-[#1A1A1A] truncate"
                    style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
                  >
                    {task.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDeleteCustomTask(e, task.id)}
                  className="text-[#8A8C8E] hover:text-red-500 cursor-pointer flex items-center p-1 transition-colors"
                >
                  <span className="material-icons text-sm">delete</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Dashed border divider */}
        <div className="border-t border-dashed border-[#E0E2E5] pt-3.5 mt-3.5" />

        {/* Add custom tasks */}
        <div className="space-y-2">
          <p 
            className="text-xs text-[#8A8C8E] leading-[18px]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            เพิ่มภารกิจงานพิเศษอื่นๆ
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTaskInput}
              onChange={(e) => setCustomTaskInput(e.target.value)}
              placeholder="เช่น ช่วยพาหัดเดินออกกำลังกายเบาๆ ตอน 5 โมงเย็น"
              className="flex-1 h-10 border border-[#E0E2E5] rounded-lg px-3 text-[13px] placeholder:text-gray-400 focus:outline-none focus:border-[#52B69A] focus:ring-1 focus:ring-[#52B69A] bg-white"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomTask();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomTask}
              className="h-10 bg-[#52B69A] text-white text-[13px] font-bold rounded-lg px-4 flex items-center justify-center hover:bg-[#469e85] transition-colors cursor-pointer whitespace-nowrap shadow-sm"
              style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            >
              เพิ่มงาน
            </button>
          </div>


        </div>
      </div>

      {/* Card 2: ระบุข้อควรระวังหรือหมายเหตุถึงผู้ดูแล */}
      <div className="bg-white p-[22px] rounded-2xl border border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.03)] space-y-3">
        <div>
          <h3 
            className="text-[15px] font-bold text-[#1A1A1A] leading-[22px]"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            ระบุข้อควรระวังหรือหมายเหตุถึงผู้ดูแล
          </h3>
          <p 
            className="text-xs text-[#8A8C8E] leading-[18px] mt-1"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            บันทึกข้อระวังด้านความปลอดภัย ประวัติโรคที่ต้องเฝ้าระวัง
          </p>
        </div>

        <div className="relative">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            placeholder="เช่น ระวังเรื่องการลุกนั่งจากเก้าอี้กระทันหัน, ผู้สูงอายุมีปัญหาการทรงตัว"
            className="w-full h-[100px] min-h-[100px] border border-[#E0E2E5] rounded-lg p-3 text-[13px] placeholder:text-gray-400 focus:outline-none focus:border-[#52B69A] focus:ring-1 focus:ring-[#52B69A] bg-white resize-none"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
            maxLength={500}
          />
          <div 
            className="text-[11px] text-[#8A8C8E] text-right mt-1"
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            {notes.length}/500 ตัวอักษร
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1 px-6 py-3 border border-[#E0E2E5] text-[#575859] rounded-xl font-semibold shadow-sm hover:bg-gray-50 transition cursor-pointer text-[13px]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <span className="material-icons text-base">arrow_back</span>
          ย้อนกลับ
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex items-center gap-2 px-6 py-3 bg-[#52B69A] text-white rounded-xl font-bold shadow-md hover:bg-[#52B69A]/95 transition cursor-pointer text-sm"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          ขั้นตอนถัดไป: ตรวจสอบรายละเอียด
          <span className="material-icons text-base">arrow_forward</span>
        </button>
      </div>
    </div>
  );
}
