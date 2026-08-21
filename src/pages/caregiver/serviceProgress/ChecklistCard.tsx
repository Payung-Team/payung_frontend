import { Icon } from '../../../components/ui/Icon';

export interface ChecklistCardProps {
  tasks: string[];
  notes?: string | null;
}

/** "แผนงานวันนี้" — tasks are shown as an inert (unchecked) checklist, not an interactive one:
 * the backend has no per-task completion state to persist, so a clickable checkbox would silently
 * lose its state on refresh and mislead the caregiver into thinking progress was saved. Progress
 * stays honestly at 0 until that persistence exists. */
export default function ChecklistCard({ tasks, notes }: Readonly<ChecklistCardProps>) {
  if (tasks.length === 0 && !notes) return null;
  const total = tasks.length;

  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <p className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        แผนงานวันนี้
      </p>

      {notes && (
        <div className="mt-3 rounded-[10px] border border-[#FFEAA7] bg-[#FFF8E7] p-3">
          <p className="text-xs text-[#8A6D1F]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            ข้อความจากผู้รับบริการ: {notes}
          </p>
        </div>
      )}

      {total > 0 && (
        <>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              ทำแล้ว 0 จาก {total} รายการ
            </span>
            <span className="text-xs font-bold text-[#8A8C8E]" style={{ fontFamily: "'Inter', sans-serif" }}>
              0%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F3]">
            <div className="h-full w-0 rounded-full bg-[#52B69A]" />
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {tasks.map((task) => (
              <div key={task} className="flex items-center gap-2.5 rounded-lg border border-[#F0F1F3] px-3 py-2.5">
                <Icon name="radio_button_unchecked" size="small" color="#B0B3B8" />
                <span className="text-sm text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  {task}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[11px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            การติ๊กเสร็จงานจะเปิดใช้งานเร็ว ๆ นี้
          </p>
        </>
      )}
    </div>
  );
}
