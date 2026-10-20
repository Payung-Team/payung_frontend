import type { BookingActivity } from '../../graphql/careActivities';
import CareLevelBadge from '../ui/CareLevelBadge';

/**
 * รายการกิจกรรมการดูแลของการจอง (PYG-635 · S15) จัดกลุ่มตามหมวด + ป้ายระดับ
 * ใช้ทั้งขั้นตรวจสอบก่อนจอง (จาก draft) และหน้ารายละเอียดการจอง (snapshot จาก BE)
 */
export default function BookingActivitiesList({ activities }: Readonly<{ activities: BookingActivity[] }>) {
  const groups = new Map<string, BookingActivity[]>();
  for (const a of activities) {
    const list = groups.get(a.category);
    if (list) list.push(a);
    else groups.set(a.category, [a]);
  }

  return (
    <div className="flex flex-col gap-3">
      {[...groups.entries()].map(([category, items]) => (
        <div key={category}>
          <div className="text-xs font-bold tracking-wide text-[#52B69A]">{category}</div>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {items.map((a) => (
              <li key={a.activityId} className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                <span className="flex-1 leading-snug">{a.name}</span>
                <CareLevelBadge level={a.careLevel} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
