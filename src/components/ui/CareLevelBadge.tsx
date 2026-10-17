import { CARE_LEVEL_RANK, toCareLevel, useCareLevelStrings } from '../../lib/careLevels';

/**
 * ป้ายระดับผู้ดูแล (PYG-557 · S02-AC5) — ใช้ซ้ำได้กับระดับ booking (S16)
 *
 * ต่างจาก ProfessionBadge (แคปซูล + ไอคอนวิชาชีพ) เมื่อวางคู่กัน: มุมเหลี่ยม + แท่ง 3 ขั้น + ข้อความ "ระดับ…"
 * สีเดียว แยกระดับด้วยจำนวนแท่งและข้อความ ไม่พึ่งสี · screen reader อ่าน "ระดับผู้ดูแล: ระดับกลาง"
 *
 * - level = null / ค่าที่ไม่รู้จัก → "ยังไม่ได้กำหนดระดับ" (ขอบประ) เมื่อ showEmpty, ไม่งั้นไม่แสดง
 * - unreviewed = ค่าเริ่มต้นจาก migration ที่ยังไม่มีแอดมินทบทวน (S02-AC6 · E3) — ขอบประ ใช้ฝั่งแอดมินเท่านั้น
 */
interface Props {
  level: unknown;
  size?: 'sm' | 'md';
  showEmpty?: boolean;
  unreviewed?: boolean;
  className?: string;
}

export default function CareLevelBadge({ level, size = 'sm', showEmpty = false, unreviewed = false, className = '' }: Props) {
  const s = useCareLevelStrings();
  const value = toCareLevel(level);
  const sizing = size === 'md' ? 'h-[30px] px-2.5 text-[13px] gap-[7px]' : 'h-6 px-2 text-[12px] gap-1.5';
  const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

  if (!value) {
    if (!showEmpty) return null;
    return (
      <span
        className={`inline-flex items-center whitespace-nowrap rounded-md border border-dashed border-[#CBD5E1] bg-white font-semibold text-[#64748B] ${sizing} ${className}`}
        style={font}
      >
        <span className="material-icons-outlined shrink-0" style={{ fontSize: size === 'md' ? 15 : 14 }} aria-hidden="true">
          remove
        </span>
        {s.none}
      </span>
    );
  }

  const rank = CARE_LEVEL_RANK[value];
  const heights = size === 'md' ? [5, 8, 12] : [4, 7, 10];
  const label = s.levelLabel[value];

  return (
    <span
      role="img"
      aria-label={s.badgeAria(label)}
      className={`inline-flex items-center whitespace-nowrap rounded-md border bg-white font-bold text-[#1F5A49] ${
        unreviewed ? 'border-dashed border-[#A7C4BA]' : 'border-[#A7C4BA]'
      } ${sizing} ${className}`}
      style={font}
    >
      <span className="inline-flex items-end gap-[2px]" aria-hidden="true" style={{ height: heights[2] }}>
        {heights.map((h, i) => (
          <span
            key={h}
            className={`w-[3px] rounded-[1px] ${i < rank ? 'bg-[#047857]' : 'bg-[#D1D5DB]'}`}
            style={{ height: h }}
          />
        ))}
      </span>
      <span aria-hidden="true">{label}</span>
    </span>
  );
}
