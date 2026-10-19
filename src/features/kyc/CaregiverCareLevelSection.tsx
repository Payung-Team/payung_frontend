import CareLevelBadge from '../../components/ui/CareLevelBadge';
import { toCareLevel, useCareLevelStrings } from '../../lib/careLevels';

/**
 * ส่วน "ระดับผู้ดูแล" ในโปรไฟล์ของผู้ดูแลเอง (PYG-557 · S02-AC5 · ดีไซน์ PYG-578 L4/L5)
 * อ่านอย่างเดียว — ผู้ดูแลแก้ระดับของตัวเองไม่ได้ (R3) จึงไม่มีปุ่มใดๆ
 * BE ให้ผู้ดูแลเห็นแค่ Caregiver.careLevel (ไม่มีผู้กำหนด / เวลา / สถานะทบทวน — เป็นข้อมูลของแอดมิน)
 */
export default function CaregiverCareLevelSection({ careLevel }: { careLevel: string | null | undefined }) {
  const s = useCareLevelStrings();
  const level = toCareLevel(careLevel);

  return (
    <section aria-labelledby="my-care-level" className="flex flex-col gap-2.5">
      <p id="my-care-level" className="text-[14px] font-semibold text-[#0A0A0A]">{s.title}</p>
      {level ? (
        <>
          <CareLevelBadge level={level} size="md" className="self-start" />
          <p className="flex items-start gap-1.5 rounded-lg bg-[#F8FAFC] px-3 py-2.5 text-[13px] leading-5 text-[#475569]">
            <span className="material-icons-outlined shrink-0" style={{ fontSize: 17 }} aria-hidden="true">info</span>
            {s.profileInfo}
          </p>
        </>
      ) : (
        <>
          <CareLevelBadge level={null} size="md" showEmpty className="self-start" />
          <p className="text-[13px] text-[#717182]">{s.profileNone}</p>
        </>
      )}
    </section>
  );
}
