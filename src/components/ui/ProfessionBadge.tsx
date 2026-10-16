import { PROFESSIONS, isProfession } from '../../lib/professions';
import type { Profession } from '../../lib/professions';

/**
 * ป้ายวิชาชีพ (PYG-556 · S01-AC3/AC4) — มีไอคอน + ข้อความทุกป้าย ไม่พึ่งสีอย่างเดียว
 * nowrap + max-w-full: "นักกายภาพบำบัด" ต้องไม่ล้นการ์ดที่ความกว้างมือถือ
 */
const TONE: Record<Profession, string> = {
  general_caregiver: 'bg-[#F0F1F3] text-[#575859] border-[#E0E2E5]',
  nurse: 'bg-[#E8F1FD] text-[#1D5FBF] border-[#C9DDF8]',
  physiotherapist: 'bg-[#FDF3E4] text-[#8A560B] border-[#F3D9A8]',
};

export default function ProfessionBadge({
  profession,
  size = 'sm',
}: {
  profession: string | null | undefined;
  size?: 'sm' | 'md';
}) {
  if (!isProfession(profession)) return null;
  const meta = PROFESSIONS[profession];
  const sizing = size === 'md' ? 'h-[30px] pl-[9px] pr-3 text-[13px]' : 'h-6 pl-[7px] pr-[9px] text-[12px]';

  return (
    <span
      className={`inline-flex items-center gap-1 max-w-full whitespace-nowrap rounded-full border font-semibold ${sizing} ${TONE[profession]}`}
      style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
    >
      <span className="material-icons-outlined shrink-0" style={{ fontSize: size === 'md' ? 17 : 15 }} aria-hidden="true">
        {meta.icon}
      </span>
      <span className="truncate">{meta.label}</span>
    </span>
  );
}
