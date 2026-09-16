import type { ReactNode } from 'react';
import EmergencyContactCard from './EmergencyContactCard';
import type { PatientProfile } from '../../../lib/patientProfile';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

export interface PatientFullProfileProps {
  recipientName: string;
  /** ชื่อผู้จอง — แสดงเมื่อคนจองกับผู้รับบริการไม่ใช่คนเดียวกัน */
  bookedByName?: string | null;
  profile?: PatientProfile | null;
  dayOfContactName?: string | null;
  dayOfContactPhone?: string | null;
  dayOfContactRelationship?: string | null;
}

/** ช่องข้อมูลหนึ่งช่อง — ค่าที่ผู้ใช้ไม่ได้กรอกแสดงเป็น "—" ไม่ใช่ซ่อนหาย
 *  เพราะผู้ดูแลต้องแยกออกว่า "ไม่มีข้อมูล" กับ "ไม่ได้ดูตรงนั้น" ต่างกัน */
function Field({ label, value, tone = 'normal' }: Readonly<{ label: string; value?: ReactNode; tone?: 'normal' | 'danger' }>) {
  const filled = value !== null && value !== undefined && value !== '';
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-[#8A8C8E]" style={FONT}>
        {label}
      </p>
      <p
        className={`mt-0.5 break-words text-sm font-semibold ${
          !filled ? 'text-[#B0B3B8]' : tone === 'danger' ? 'text-[#DC2626]' : 'text-[#1A1A1A]'
        }`}
        style={FONT}
      >
        {filled ? value : '—'}
      </p>
    </div>
  );
}

function SectionLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="text-xs font-bold text-[#575859]" style={FONT}>
      {children}
    </p>
  );
}

/**
 * ข้อมูลผู้รับบริการ "ทั้งหมด" ที่ถูกกรอกไว้ตอนจอง — โครงเดียวกับที่ฝั่งผู้จองเห็น
 * ในหน้ารายละเอียดการจอง เพื่อให้สองฝ่ายอ่านข้อมูลชุดเดียวกันในรูปแบบเดียวกัน
 *
 * ต่างจาก PatientProfileDetails (ที่ใช้ในการ์ดย่อ) ตรงที่ตัวนี้ "แสดงทุกช่องเสมอ"
 * รวมถึงช่องที่ว่าง เพราะในป๊อปอัปนี้ผู้ดูแลกำลังตั้งใจมาอ่านข้อมูลทั้งชุด
 * ถ้าซ่อนช่องว่างไว้ ผู้ดูแลจะไม่รู้ว่าข้อมูลนั้น "ไม่มี" หรือ "ตัวเองมองข้ามไป"
 *
 * ผู้ติดต่อฉุกเฉินอยู่บนสุดพร้อมปุ่มโทร — เป็นสิ่งที่ต้องใช้ทันทีเมื่อมีเหตุ
 */
export default function PatientFullProfile({
  recipientName,
  bookedByName,
  profile,
  dayOfContactName,
  dayOfContactPhone,
  dayOfContactRelationship,
}: Readonly<PatientFullProfileProps>) {
  const hasEmergencyContact = Boolean(dayOfContactName && dayOfContactPhone);

  return (
    <div className="flex flex-col gap-4">
      {/* ── ผู้ติดต่อยามฉุกเฉิน ── */}
      {hasEmergencyContact ? (
        <EmergencyContactCard name={dayOfContactName} phone={dayOfContactPhone} relationship={dayOfContactRelationship} />
      ) : (
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
          <p className="text-[11px] font-semibold text-[#8A8C8E]" style={FONT}>
            ผู้ติดต่อฉุกเฉิน
          </p>
          <p className="mt-0.5 text-sm font-semibold text-[#B0B3B8]" style={FONT}>
            การจองนี้ไม่ได้ระบุผู้ติดต่อในวันนัดหมาย
          </p>
        </div>
      )}

      {/* ── ตัวตน ── */}
      <div>
        <SectionLabel>ข้อมูลผู้รับบริการ</SectionLabel>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="ชื่อผู้รับบริการ" value={recipientName} />
          <Field label="ผู้จอง" value={bookedByName || 'ผู้รับบริการจองด้วยตัวเอง'} />
        </div>
      </div>

      {/* ── สุขภาพ ── */}
      <div className="border-t border-[#F0F1F3] pt-4">
        <SectionLabel>รายละเอียดทางสุขภาพ (กรอกตอนจอง)</SectionLabel>

        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          {/* อายุ 0 (ทารก) ต้องแสดง จึงเช็ค != null ไม่ใช่ truthiness */}
          <Field label="อายุ" value={profile?.age != null ? `${profile.age} ปี` : ''} />
          <Field label="เพศ" value={profile?.gender ?? ''} />
          <Field label="กรุ๊ปเลือด" value={profile?.bloodGroup ? `กรุ๊ป ${profile.bloodGroup}` : ''} />
          <Field label="น้ำหนัก" value={profile?.weight != null ? `${profile.weight} กก.` : ''} />
          <Field label="ส่วนสูง" value={profile?.height != null ? `${profile.height} ซม.` : ''} />
          <Field label="โรงพยาบาลประจำ" value={profile?.regularHospital ?? ''} />
        </div>

        <div className="mt-3">
          <Field label="ระดับความช่วยเหลือ" value={profile?.supportLevel ?? ''} />
        </div>

        <div className="mt-3">
          <p className="text-[11px] text-[#8A8C8E]" style={FONT}>
            โรคประจำตัว / อาการ
          </p>
          {profile?.conditions?.length ? (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {profile.conditions.map((condition) => (
                <span
                  key={condition}
                  className="rounded-full bg-[#FFF4E5] px-2.5 py-0.5 text-[11px] font-semibold text-[#B45309]"
                  style={FONT}
                >
                  {condition}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-0.5 text-sm font-semibold text-[#B0B3B8]" style={FONT}>
              —
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <Field label="ยาที่ใช้ประจำ" value={profile?.medicines ?? ''} />
          {/* แพ้ยาเป็นช่องเดียวที่ย้ำด้วยสีแดงทั้งตอนมีและตอนไม่มี — กรอกไว้ว่า "ไม่มี"
              กับ "ไม่ได้กรอก" ต่างกันมากในเรื่องความปลอดภัย */}
          <Field label="ประวัติแพ้ยา / อาหาร" value={profile?.allergies ?? ''} tone="danger" />
        </div>

        {profile?.careInstructions && (
          <div className="mt-3">
            <p className="text-[11px] text-[#8A8C8E]" style={FONT}>
              ข้อมูลสุขภาพเพิ่มเติม / คำแนะนำการดูแล
            </p>
            <div className="mt-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5">
              <p className="break-words text-sm text-[#1A1A1A]" style={FONT}>
                {profile.careInstructions}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
