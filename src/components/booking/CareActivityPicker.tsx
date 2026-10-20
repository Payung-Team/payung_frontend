import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { CARE_ACTIVITIES, type BookingActivity, type CareActivity } from '../../graphql/careActivities';
import { useCareActivityStrings } from '../../lib/careActivityStrings';
import CareLevelBadge from '../ui/CareLevelBadge';

/**
 * เลือกกิจกรรมการดูแลจากรายการกลาง (PYG-635 · S15) — จัดกลุ่มตามหมวด เลือกได้หลายข้อ ไม่บังคับ
 *
 * - โหลดไม่สำเร็จ / ไม่มีรายการ → บอกเฉย ๆ ไม่บล็อกการจอง (งานพิเศษพิมพ์เองยังใช้ได้แยกต่างหาก)
 * - ที่เลือกไว้แต่ไม่อยู่ในรายการที่เปิดใช้งานแล้ว (ถูกปิดระหว่างกรอก) → ตัดออกจาก draft ทันทีที่โหลดเสร็จ
 *   ไม่งั้นผู้ใช้เห็นว่าเลือกไว้แล้วไปโดน CARE_ACTIVITY_INACTIVE ตอนกดยืนยัน
 */
interface Props {
  value: BookingActivity[];
  onChange: (next: BookingActivity[]) => void;
}

function toBookingActivity(a: CareActivity): BookingActivity {
  return { activityId: a.id, name: a.nameTh, category: a.category, careLevel: a.careLevel };
}

export default function CareActivityPicker({ value, onChange }: Readonly<Props>) {
  const s = useCareActivityStrings();
  const { data, loading, error, refetch } = useQuery<{ careActivities: CareActivity[] }>(CARE_ACTIVITIES, {
    fetchPolicy: 'cache-and-network',
  });
  const activities = data?.careActivities;

  const groups = useMemo(() => {
    const map = new Map<string, CareActivity[]>();
    for (const a of activities ?? []) {
      const list = map.get(a.category);
      if (list) list.push(a);
      else map.set(a.category, [a]);
    }
    return [...map.entries()].map(([category, items]) => ({ category, items }));
  }, [activities]);

  const selectedIds = useMemo(() => new Set(value.map((a) => a.activityId)), [value]);

  // หมวดที่มีรายการถูกเลือกไว้เปิดค้างตั้งแต่แรก (กลับมาแก้จากขั้นตรวจสอบแล้วเห็นของที่เลือก)
  const [open, setOpen] = useState<Set<string>>(() => new Set(value.map((a) => a.category)));

  useEffect(() => {
    if (!activities || value.length === 0) return;
    const activeIds = new Set(activities.map((a) => a.id));
    const kept = value.filter((a) => activeIds.has(a.activityId));
    if (kept.length !== value.length) onChange(kept);
  }, [activities, value, onChange]);

  function toggle(a: CareActivity) {
    onChange(
      selectedIds.has(a.id)
        ? value.filter((v) => v.activityId !== a.id)
        : [...value, toBookingActivity(a)],
    );
  }

  function toggleGroup(category: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  let body: ReactNode;
  if (error && !activities) {
    body = (
      <div role="status" className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#E8D9A8] bg-[#FDF6E3] p-3 text-sm text-[#6B5A21]">
        <span className="flex-1">{s.pickerLoadFailed}</span>
        <button
          type="button"
          onClick={() => void refetch()}
          className="cursor-pointer rounded-lg border border-[#C9B26B] bg-white px-3 py-1.5 text-xs font-bold text-[#6B5A21] hover:bg-[#FFFBEF]"
        >
          {s.pickerRetry}
        </button>
      </div>
    );
  } else if (loading && !activities) {
    body = (
      <div className="mt-4 flex flex-col gap-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  } else if (groups.length === 0) {
    body = <p className="mt-4 rounded-xl bg-[#F9FAFB] p-3 text-sm text-[#8A8C8E]">{s.pickerEmpty}</p>;
  } else {
    body = (
      <div className="mt-4 flex flex-col gap-2">
        {groups.map((g) => {
          const selectedInGroup = g.items.filter((a) => selectedIds.has(a.id)).length;
          const isOpen = open.has(g.category);
          const panelId = `care-activity-group-${g.category}`;
          return (
            <div key={g.category} className="rounded-xl border border-[#E0E2E5]">
              <button
                type="button"
                onClick={() => toggleGroup(g.category)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-left hover:bg-gray-50"
              >
                <span className="flex-1 text-sm font-bold text-[#1A1A1A]">{g.category}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    selectedInGroup > 0 ? 'bg-[#52B69A] text-white' : 'bg-[#F1F3F5] text-[#575859]'
                  }`}
                >
                  {s.pickerGroupCount(selectedInGroup, g.items.length)}
                </span>
                <span
                  className="material-icons text-[#8A8C8E] transition-transform"
                  style={{ fontSize: 20, transform: isOpen ? 'rotate(180deg)' : undefined }}
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </button>
              {isOpen && (
                <div id={panelId} className="flex flex-col gap-2 px-3 pb-3">
                  {g.items.map((a) => {
                    const on = selectedIds.has(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(a)}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition ${
                          on ? 'border-[#BFE0D6] bg-[#F6FBF9]' : 'border-[#E0E2E5] bg-white hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 ${
                            on ? 'border-[#52B69A] bg-[#52B69A]' : 'border-[#C6C8CB] bg-white'
                          }`}
                        >
                          {on && (
                            <span className="material-icons text-white" style={{ fontSize: 16 }} aria-hidden="true">
                              check
                            </span>
                          )}
                        </span>
                        <span className="flex-1 text-sm font-semibold leading-snug text-[#1A1A1A]">{a.nameTh}</span>
                        <CareLevelBadge level={a.careLevel} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-[#1A1A1A]">{s.pickerTitle}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#8A8C8E]">{s.pickerHint}</p>
        </div>
        {value.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#1B5C48]">{s.pickerSelected(value.length)}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              className="cursor-pointer text-xs font-semibold text-[#8A8C8E] underline hover:text-red-500"
            >
              {s.pickerClear}
            </button>
          </div>
        )}
      </div>
      {body}
    </section>
  );
}
