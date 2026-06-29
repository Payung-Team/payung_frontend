import { useBooking } from '../../../context/BookingContext';


const PLATFORM_FEE_PERCENT = 10;

interface BookingStep3Props {
  onStartSearch: () => void;
}

export default function BookingStep3({ onStartSearch }: BookingStep3Props) {
  
  const { bookingDraft, goToStep } = useBooking();

  const handleFinish = () => {
    onStartSearch();
  };

  // Helper function to format Thai dates (e.g. "6 มิถุนายน 2569")
  const formatThaiDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const year = parseInt(parts[0]) + 543;
      const monthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      const month = monthNames[parseInt(parts[1]) - 1];
      const day = parseInt(parts[2]);
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  // Section 1 Computations: วัน เวลา และสถานที่นัดหมาย
  const serviceLocs = bookingDraft?.serviceLocation || [];
  const displayServiceLocation = serviceLocs.includes('at_home') && serviceLocs.includes('accompany_outside')
    ? 'ที่บ้านผู้ป่วย และ ร่วมเดินทางภายนอก'
    : serviceLocs.includes('at_home')
    ? 'ที่บ้านผู้ป่วย'
    : serviceLocs.includes('accompany_outside')
    ? 'ร่วมเดินทางข้างนอก'
    : '-';

  const atHomeAddress = bookingDraft?.locationDetails?.at_home?.address || '';
  const hospitalName = bookingDraft?.locationDetails?.accompany_outside?.hospitalName || '';
  const meetingPoint = bookingDraft?.locationDetails?.accompany_outside?.meetingPoint || '';

  const displayAddressParts = [];
  if (serviceLocs.includes('at_home') && atHomeAddress) {
    const subDist = bookingDraft?.locationDetails?.subDistrict || '';
    const dist = bookingDraft?.locationDetails?.district || '';
    const prov = bookingDraft?.locationDetails?.province || '';
    const post = bookingDraft?.locationDetails?.postalCode || '';
    const fullAddr = `${atHomeAddress} ตำบล/แขวง${subDist} อำเภอ/เขต${dist} จังหวัด${prov} ${post}`.trim();
    displayAddressParts.push(fullAddr);
  }
  if (serviceLocs.includes('accompany_outside') && hospitalName) {
    displayAddressParts.push(`ปลายทาง: ${hospitalName}${meetingPoint ? ` (จุดนัดพบ: ${meetingPoint})` : ''}`);
  }
  const displayAddress = displayAddressParts.length > 0 
    ? displayAddressParts.join(' / ') 
    : '-';

  const slotLabels: Record<string, string> = {
    morning: 'รอบเช้า',
    afternoon: 'รอบบ่าย',
    evening: 'รอบเย็น',
    night: 'รอบดึก'
  };
  const slotText = slotLabels[bookingDraft?.dateTime?.slot || ''] || '';
  const startTimeVal = bookingDraft?.dateTime?.startTime || '';
  const displaySlotTime = startTimeVal ? `${slotText} (${startTimeVal} น.)` : '-';

  const durationVal = bookingDraft?.dateTime?.duration || 4;
  const endTimeVal = bookingDraft?.dateTime?.endTime || '';
  const displayDurationInfo = startTimeVal && endTimeVal 
    ? `${durationVal} ชม. · เริ่ม ${startTimeVal} น. · สิ้นสุด ${endTimeVal} น.` 
    : `${durationVal} ชม.`;

  // Section 2 Computations: ประวัติสุขภาพคนไข้ผู้รับการดูแล
  const conditionsArr = bookingDraft?.recipient?.patientDetails?.conditions || [];
  const hasConditions = conditionsArr.length > 0;
  const conditionsText = conditionsArr.join(', ');

  const allergiesText = bookingDraft?.recipient?.patientDetails?.allergies || '';
  const hasAllergies = !!allergiesText && allergiesText.trim().toLowerCase() !== 'ไม่มี' && allergiesText.trim() !== '';

  // Section 4 Computations: แผนภารกิจการดูแล
  const tasksCount = bookingDraft?.jobDetails?.tasks?.length || 0;
  const customTasksCount = bookingDraft?.jobDetails?.customTasks?.length || 0;
  const totalTasksCount = tasksCount + customTasksCount;

  // Section 5 Computations: ค่าบริการโดยประมาณ
  const caregiverRate = bookingDraft?.estimatedCost?.hourlyRate || 250;
  const hours = bookingDraft?.dateTime?.duration || bookingDraft?.estimatedCost?.hours || 4;
  const caregiverCost = caregiverRate * hours;
  const platformFee = Math.round(caregiverCost * (PLATFORM_FEE_PERCENT / 100));
  const totalCost = caregiverCost + platformFee;

  return (
    <div className="box-border w-full bg-white border border-[#E0E2E5] rounded-[20px] p-[28px] shadow-[0px_4px_16px_rgba(0,0,0,0.04)] flex flex-col items-start self-stretch">
      {/* Title */}
      <div className="flex flex-col items-center p-0 w-full self-stretch h-[30px] mb-5">
        <h2 className="w-[292px] h-[30px] font-['Bai_Jamjuree'] font-bold text-xl text-[#1B5C48] text-center leading-[30px]">
          ตรวจสอบและยืนยันข้อมูลการจอง
        </h2>
      </div>

      {/* Main Content Containers */}
      <div className="flex flex-col items-start pt-5 w-full self-stretch gap-[18px]">
        {/* Section 1: วัน เวลา และสถานที่นัดหมาย */}
        <div className="box-border w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 flex flex-col items-start self-stretch">
          <div className="flex flex-row justify-between items-center p-0 w-full h-[21px]">
            <div className="flex flex-row items-center gap-1.5 h-full">
              <span className="material-icons text-[18px] text-[#52B69A] leading-[18px]">schedule</span>
              <h4 className="font-['Bai_Jamjuree'] font-bold text-sm text-[#1A1A1A] leading-[21px]">
                วัน เวลา และสถานที่นัดหมาย
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('scrollTarget', 'step1-datetime');
                goToStep(1);
              }}
              className="flex items-center gap-1 text-[#52B69A] hover:text-[#469e85] transition-colors font-['Bai_Jamjuree'] text-xs font-semibold cursor-pointer"
            >
              <span className="material-icons text-sm">edit</span>
              แก้ไข
            </button>
          </div>

          <div className="flex flex-col items-start pt-3 w-full self-stretch gap-2.5">
            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                สถานที่รับบริการ
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {displayServiceLocation}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch gap-4">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px] shrink-0">
                ที่อยู่ระบุ
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right break-words max-w-[450px]">
                {displayAddress}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                วันที่จัดนัดหมาย
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {formatThaiDate(bookingDraft?.dateTime?.date)}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                เวลานัดทำบริการ
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {displaySlotTime}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                ระยะเวลา
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {displayDurationInfo}
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: ประวัติสุขภาพคนไข้ผู้รับการดูแล */}
        <div className="box-border w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 flex flex-col items-start self-stretch">
          <div className="flex flex-row justify-between items-center p-0 w-full h-[21px]">
            <div className="flex flex-row items-center gap-1.5 h-full">
              <span className="material-icons text-[18px] text-[#52B69A] leading-[18px]">person</span>
              <h4 className="font-['Bai_Jamjuree'] font-bold text-sm text-[#1A1A1A] leading-[21px]">
                ประวัติสุขภาพคนไข้ผู้รับการดูแล
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('scrollTarget', 'step1-patient');
                goToStep(1);
              }}
              className="flex items-center gap-1 text-[#52B69A] hover:text-[#469e85] transition-colors font-['Bai_Jamjuree'] text-xs font-semibold cursor-pointer"
            >
              <span className="material-icons text-sm">edit</span>
              แก้ไข
            </button>
          </div>

          <div className="flex flex-col items-start pt-3 w-full self-stretch gap-2.5">
            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                ชื่อ-นามสกุล คนไข้
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {bookingDraft?.recipient?.patientDetails?.name || '-'}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                อายุ
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {bookingDraft?.recipient?.patientDetails?.age ? `${bookingDraft?.recipient?.patientDetails?.age} ปี` : '-'}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                เพศ / สัดส่วน
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {`เพศ${bookingDraft?.recipient?.patientDetails?.gender || '-'} · น้ำหนัก ${bookingDraft?.recipient?.patientDetails?.weight || '-'} กก. · ส่วนสูง ${bookingDraft?.recipient?.patientDetails?.height || '-'} ซม.`}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                ความสามารถช่วยเหลือตนเอง
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {bookingDraft?.recipient?.patientDetails?.supportLevel || '-'}
              </span>
            </div>

            {(hasConditions || hasAllergies) && (
              <div className="box-border w-full bg-[#FFF3E0] border border-[#FFC570] rounded-xl p-3 flex flex-col items-start gap-1.5 self-stretch mt-2 text-[13px] leading-[20px] font-['Bai_Jamjuree']">
                {hasConditions && (
                  <div className="text-[#E08C00] font-bold w-full">
                    โรคประจำตัวที่ต้องเฝ้าระวัง: {conditionsText}
                  </div>
                )}
                {hasAllergies && (
                  <div className={`text-[#D97706] font-bold w-full ${hasConditions ? 'border-t border-dashed border-[#FFC570] pt-1.5 mt-0.5' : ''}`}>
                    ประวัติการแพ้ยาหรือแพ้อาหาร: {allergiesText}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                ยาคนไข้ประจำวัน
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {bookingDraft?.recipient?.patientDetails?.medicines || 'ไม่มี'}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                กรุ๊ปเลือด
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {bookingDraft?.recipient?.patientDetails?.bloodGroup ? `กรุ๊ป ${bookingDraft?.recipient?.patientDetails?.bloodGroup}` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: ช่องทางติดต่อหน้างานในวันบริการ */}
        <div className="box-border w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 flex flex-col items-start self-stretch">
          <div className="flex flex-row justify-between items-center p-0 w-full h-[21px]">
            <div className="flex flex-row items-center gap-1.5 h-full">
              <span className="material-icons text-[18px] text-[#52B69A] leading-[18px]">phone</span>
              <h4 className="font-['Bai_Jamjuree'] font-bold text-sm text-[#1A1A1A] leading-[21px]">
                ช่องทางติดต่อหน้างานในวันบริการ
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('scrollTarget', 'step1-contact');
                goToStep(1);
              }}
              className="flex items-center gap-1 text-[#52B69A] hover:text-[#469e85] transition-colors font-['Bai_Jamjuree'] text-xs font-semibold cursor-pointer"
            >
              <span className="material-icons text-sm">edit</span>
              แก้ไข
            </button>
          </div>

          <div className="flex flex-col items-start pt-3 w-full self-stretch gap-2.5">
            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                ผู้ติต่อรับสาย
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {bookingDraft?.contactPerson?.name || '-'}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                เบอร์โทรศัพท์ประสานงาน
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {bookingDraft?.contactPerson?.phone || '-'}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[13px] leading-[20px]">
                ความสัมพันธ์กับผู้ป่วย
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                {bookingDraft?.contactPerson?.relationship || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: แผนภารกิจการดูแล */}
        <div className="box-border w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 flex flex-col items-start self-stretch">
          <div className="flex flex-row justify-between items-center p-0 w-full h-[21px]">
            <div className="flex flex-row items-center gap-1.5 h-full">
              <span className="material-icons text-[18px] text-[#52B69A] leading-[18px]">assignment</span>
              <h4 className="font-['Bai_Jamjuree'] font-bold text-sm text-[#1A1A1A] leading-[21px]">
                {`แผนภารกิจการดูแล (${totalTasksCount} งานย่อย)`}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem('scrollTarget', 'step2-tasks');
                goToStep(2);
              }}
              className="flex items-center gap-1 text-[#52B69A] hover:text-[#469e85] transition-colors font-['Bai_Jamjuree'] text-xs font-semibold cursor-pointer"
            >
              <span className="material-icons text-sm">edit</span>
              แก้ไข
            </button>
          </div>

          <div className="flex flex-col items-start pt-3 w-full self-stretch">
            <div className="box-border w-full bg-white border border-[#E0E2E5] rounded-lg p-3 max-h-[150px] overflow-y-auto self-stretch flex flex-col items-start">
              {totalTasksCount === 0 ? (
                <span className="font-['Bai_Jamjuree'] text-gray-400 text-xs italic">ไม่มีการระบุภารกิจย่อย</span>
              ) : (
                <ul className="list-disc pl-5 flex flex-col items-start gap-1.5 w-full text-[13px] leading-[20px] font-['Bai_Jamjuree']">
                  {bookingDraft?.jobDetails?.tasks?.map((t) => (
                    <li key={t.id} className="text-[#1A1A1A] font-['Bai_Jamjuree'] text-[13px]">
                      {t.name}
                    </li>
                  ))}
                  {bookingDraft?.jobDetails?.customTasks?.map((t) => (
                    <li key={t.id} className="text-[#3B5BDB] font-['Bai_Jamjuree'] text-[13px]">
                      {t.name} (งานกรอกเพิ่มเติม)
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {bookingDraft?.jobDetails?.notes && (
              <div className="box-border w-full bg-[#FFFDF6] border border-[#FDF0CD] rounded-lg p-2.5 mt-2.5 self-stretch text-[13px] leading-[20px] font-['Bai_Jamjuree'] text-[#1A1A1A] font-bold">
                หมายเหตุแนบท้าย: "{bookingDraft.jobDetails.notes}"
              </div>
            )}
          </div>
        </div>

        {/* Section 5: ค่าบริการโดยประมาณ */}
        <div className="box-border w-full bg-[#F0FAF4] border border-[#E6F5ED] rounded-xl p-[14px_16px] flex flex-col items-start self-stretch">
          <div className="flex flex-col items-start p-0 w-full h-[21px]">
            <h4 className="font-['Bai_Jamjuree'] font-bold text-sm text-[#1B5C48] leading-[21px]">
              ค่าบริการโดยประมาณ
            </h4>
          </div>

          <div className="flex flex-col items-start pt-2.5 w-full self-stretch gap-1.5">
            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#1A1A1A] font-normal text-[13px] leading-[20px]">
                ค่าบริการ Caregiver (฿{caregiverRate} x {hours} ชม.)
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                ฿{caregiverCost.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-row justify-between items-start p-0 w-full self-stretch">
              <span className="font-['Bai_Jamjuree'] text-[#1A1A1A] font-normal text-[13px] leading-[20px]">
                ค่าบริการแพลตฟอร์ม ({PLATFORM_FEE_PERCENT}%)
              </span>
              <span className="font-['Inter'] text-[#1A1A1A] font-medium text-[13px] leading-[20px] text-right">
                ฿{platformFee.toLocaleString()}
              </span>
            </div>

            <div className="box-border w-full border-t border-[#A7D8C2] mt-1 pt-2 self-stretch flex flex-row justify-between items-start">
              <span className="font-['Bai_Jamjuree'] text-[#1A1A1A] font-bold text-[13px] leading-[20px]">
                ยอดรวมโดยประมาณ
              </span>
              <span className="font-['Bai_Jamjuree'] text-[#52B69A] font-bold text-base leading-[24px] text-right">
                ฿{totalCost.toLocaleString()}
              </span>
            </div>

            <div className="flex flex-col items-start p-0 w-full mt-2">
              <p className="font-['Bai_Jamjuree'] text-[#8A8C8E] font-normal text-[11px] leading-[16px] text-left">
                ยอดนี้เป็นการประมาณ ยอดจริงยืนยันหลังการจองสมบูรณ์
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col items-start pt-6 w-full self-stretch gap-2.5 mt-6">
        <button
          type="button"
          onClick={handleFinish}
          className="flex flex-row justify-center items-center py-0 px-[22px] gap-2 w-full h-11 bg-[#52B69A] shadow-[0px_4px_12px_rgba(82,182,154,0.2)] rounded-lg hover:bg-[#469e85] transition-colors cursor-pointer"
        >
          <span className="font-['Bai_Jamjuree'] font-bold text-sm text-white text-center leading-[21px]">
            เริ่มต้นค้นหาผู้ดูแล
          </span>
        </button>

        <button
          type="button"
          onClick={() => goToStep(2)}
          className="box-border flex flex-row justify-center items-center py-0 px-[18px] gap-1.5 w-full h-10 bg-white border border-[#E0E2E5] rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <span className="font-['Bai_Jamjuree'] font-semibold text-[13px] text-[#575859] text-center leading-[20px]">
            ย้อนกลับไปแก้ไข
          </span>
        </button>
      </div>
    </div>
  );
}
