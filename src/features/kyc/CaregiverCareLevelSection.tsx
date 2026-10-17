import CareLevelBadge from '../../components/ui/CareLevelBadge';
import { formatCareLevelTime, useCareLevelStrings } from '../../lib/careLevels';
import type { CareLevelData } from './useCareLevel';

/**
 * ส่วน "ระดับผู้ดูแล" ในโปรไฟล์ของผู้ดูแลเอง (PYG-557 · S02-AC5 · ดีไซน์ PYG-578 L4/L5)
 * อ่านอย่างเดียว — ผู้ดูแลแก้ระดับของตัวเองไม่ได้ (R3) จึงไม่มีปุ่มใดๆ
 * ค่าเริ่มต้นจาก migration: แสดง "กำหนดโดยระบบ" · ตัวบอก "ยังไม่ทบทวน" มีเฉพาะฝั่งแอดมิน
 */
export default function CaregiverCareLevelSection({ data }: { data: CareLevelData }) {
  const s = useCareLevelStrings();
  const { level, setAt, unreviewed } = data;

  return (
    <section aria-labelledby="my-care-level" className="flex flex-col gap-2.5">
      <p id="my-care-level" className="text-[14px] font-semibold text-[#0A0A0A]">{s.title}</p>
      {level ? (
        <>
          <CareLevelBadge level={level} size="md" className="self-start" />
          <p className="text-[13px] text-[#717182]">
            {unreviewed ? s.profileSetBySystem : s.profileSetByTeam(formatCareLevelTime(setAt, false))}
          </p>
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
