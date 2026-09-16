import { Icon } from '../../../components/ui/Icon';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

export interface TaskPreviewCardProps {
  /** ชื่อภารกิจตามที่ผู้จองระบุ */
  tasks: string[];
  notes?: string;
}

/**
 * แผนงานแบบอ่านอย่างเดียว สำหรับหน้าก่อนเช็คอิน
 *
 * ★ ตั้งใจไม่ให้ติ๊กได้ตรงนี้ — การติ๊กหมายถึง "ทำแล้ว" ซึ่งเป็นไปไม่ได้ก่อนเริ่มงาน
 *   ของจริงที่ติ๊กได้คือ ChecklistCard ในหน้าระหว่างปฏิบัติงาน (ยิง setTaskDone)
 */
export default function TaskPreviewCard({ tasks, notes }: Readonly<TaskPreviewCardProps>) {
  if (tasks.length === 0 && !notes) return null;

  return (
    <section className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF7F3]">
            <Icon name="checklist" size="small" color="#31866F" />
          </span>
          <p className="text-[17px] font-bold text-[#1A1A1A]" style={FONT}>
            แผนงานที่ต้องทำ
          </p>
        </div>
        {tasks.length > 0 && (
          <span className="rounded-full bg-[#F0F1F3] px-3 py-1 text-xs font-bold text-[#575859]" style={FONT}>
            {tasks.length} รายการ
          </span>
        )}
      </div>

      {notes && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#FFEAA7] bg-[#FFF8E7] p-3">
          <Icon name="sticky_note_2" size="small" color="#B45309" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#B45309]" style={FONT}>
              ข้อความจากผู้รับบริการ
            </p>
            <p className="mt-0.5 break-words text-xs text-[#8A6D1F]" style={FONT}>
              {notes}
            </p>
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <>
          <div className="mt-4 flex flex-col gap-2">
            {tasks.map((task) => (
              <div key={task} className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] px-3.5 py-3">
                <span
                  aria-hidden="true"
                  className="h-6 w-6 shrink-0 rounded-md border-2 border-[#E0E2E5] bg-[#FAFBFC]"
                />
                <span className="min-w-0 text-sm leading-snug text-[#1A1A1A]" style={FONT}>
                  {task}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[#8A8C8E]" style={FONT}>
            ติ๊กว่าทำแล้วได้หลังเช็คอินเริ่มงาน
          </p>
        </>
      )}
    </section>
  );
}
