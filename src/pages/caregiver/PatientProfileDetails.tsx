import { Icon } from '../../components/ui/Icon';
import { hasAnyProfileData, type PatientProfile } from '../../lib/patientProfile';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

/**
 * PYG-460 — ข้อมูลสุขภาพผู้รับบริการที่ผู้ดูแลต้องเห็นก่อนเริ่มงาน
 *
 * หน้าจอฝั่งลูกค้าเขียนไว้ว่า "ผู้ดูแลเห็นข้อมูลนี้ก่อนเริ่มงาน" ซึ่งไม่จริงมาก่อน
 * เพราะการ์ดฝั่งผู้ดูแลแสดงแค่ชื่อ ใช้ร่วมกันทั้งหน้าเช็คอิน (PatientSummaryCard)
 * และหน้าความคืบหน้า (PatientHeaderCard) เพื่อไม่ให้ลำดับความสำคัญเพี้ยนกันสองที่
 *
 * เรียงตามความสำคัญต่อความปลอดภัย:
 *   ประวัติแพ้ยา → ระดับการช่วยเหลือ → โรคประจำตัว → ยาที่ใช้ประจำ
 *   → คำแนะนำการดูแล → ที่เหลือ (อายุ/เพศ/น้ำหนัก/ส่วนสูง/กรุ๊ปเลือด/โรงพยาบาล)
 *
 * ประวัติแพ้ยาเด่นที่สุด (กรอบแดง + ไอคอนเตือน) เพราะเป็นข้อมูลที่ผิดพลาดแล้ว
 * อันตรายถึงชีวิต ไม่ใช่แค่ไม่สะดวก
 */
export default function PatientProfileDetails({
  profile,
}: Readonly<{ profile?: PatientProfile | null }>) {
  // การจองเก่าก่อน PYG-460 หรือคนที่ไม่กรอกอะไรเลย → ไม่ต้องขึ้นหัวข้อว่างไว้ให้สับสน
  if (!hasAnyProfileData(profile)) return null;
  const p = profile!;

  // อายุ 0 (ทารก) ต้องแสดง จึงเช็ค != null ไม่ใช่ truthiness
  const vitals = [
    p.age != null ? `${p.age} ปี` : null,
    p.gender || null,
    p.weight != null ? `${p.weight} กก.` : null,
    p.height != null ? `${p.height} ซม.` : null,
    p.bloodGroup ? `กรุ๊ปเลือด ${p.bloodGroup}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mt-4 space-y-3 border-t border-[#F0F1F3] pt-4">
      {p.allergies && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] p-3">
          <Icon name="warning" size="small" color="#DC2626" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#DC2626]" style={FONT}>
              ประวัติแพ้ยา / แพ้อาหาร
            </p>
            <p className="mt-0.5 break-words text-xs font-semibold text-[#991B1B]" style={FONT}>
              {p.allergies}
            </p>
          </div>
        </div>
      )}

      {p.supportLevel && (
        <Row icon="accessible" label="ระดับการช่วยเหลือตนเอง" value={p.supportLevel} />
      )}

      {!!p.conditions?.length && (
        <div>
          <p className="text-[11px] font-semibold text-[#8A8C8E]" style={FONT}>
            โรคประจำตัว
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {p.conditions.map((c) => (
              <span
                key={c}
                className="rounded-full bg-[#FFF4E5] px-2.5 py-0.5 text-[11px] font-semibold text-[#B45309]"
                style={FONT}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {p.medicines && <Row icon="medication" label="ยาที่ใช้ประจำ" value={p.medicines} />}
      {p.careInstructions && (
        <Row icon="assignment" label="คำแนะนำการดูแล" value={p.careInstructions} />
      )}
      {p.regularHospital && (
        <Row icon="local_hospital" label="โรงพยาบาลประจำ" value={p.regularHospital} />
      )}

      {vitals.length > 0 && (
        <p className="text-xs text-[#8A8C8E]" style={FONT}>
          {vitals.join(' · ')}
        </p>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: Readonly<{ icon: string; label: string; value: string }>) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon name={icon} size="small" color="#8A8C8E" />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-[#8A8C8E]" style={FONT}>
          {label}
        </p>
        <p className="mt-0.5 break-words text-xs font-semibold text-[#1A1A1A]" style={FONT}>
          {value}
        </p>
      </div>
    </div>
  );
}
