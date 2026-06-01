import { useNavigate } from 'react-router-dom';
import { useBooking } from '../../../context/BookingContext';

export default function BookingStep3() {
  const navigate = useNavigate();
  const { goToStep } = useBooking();

  const handleFinish = () => {
    // Navigate to caregiver search page
    navigate('/search');
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
          <span className="material-icons text-3xl text-gray-400">playlist_add_check</span>
        </div>
        <h3 className="text-lg font-bold text-[#1A1A1A]">ขั้นตอนที่ 3: ยืนยันรายละเอียด</h3>
        <p className="text-sm text-gray-500 max-w-[400px] mx-auto leading-relaxed">
          ส่วนสรุปรายละเอียดทั้งหมดของการจองเพื่อให้คุณสามารถตรวจสอบความถูกต้องก่อนกดเริ่มต้นค้นหาผู้ดูแลระบบ (กำลังพัฒนาในรอบถัดไป)
        </p>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-100">
        <button
          onClick={() => goToStep(2)}
          className="px-6 py-3 border border-[#E0E2E5] text-[#575859] rounded-xl font-semibold shadow-sm hover:bg-gray-50 transition cursor-pointer flex items-center gap-1"
        >
          <span className="material-icons text-base">arrow_back</span>
          ย้อนกลับ
        </button>
        <button
          onClick={handleFinish}
          className="px-6 py-3 bg-[#52B69A] text-white rounded-xl font-bold shadow-md hover:bg-[#52B69A]/95 transition cursor-pointer flex items-center gap-2"
        >
          เริ่มต้นค้นหาผู้ดูแล
          <span className="material-icons text-base">search</span>
        </button>
      </div>
    </div>
  );
}
