import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Icon } from '../../../components/ui/Icon';
import { ToastContainer } from '../../../components/ui/Toast';
import { SET_TASK_DONE } from '../../../graphql/queries';
import { useToast } from '../../../hooks/useToast';
import { extractGraphQLErrorMessage } from '../../../lib/apolloErrors';
import type { BookingTask } from '../CaregiverBookings';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

export interface ChecklistCardProps {
  tasks: BookingTask[];
  notes?: string | null;
}

interface SetTaskDoneData {
  setTaskDone: BookingTask;
}

interface SetTaskDoneVariables {
  input: {
    taskId: string;
    done: boolean;
  };
}

export default function ChecklistCard({ tasks, notes }: Readonly<ChecklistCardProps>) {
  const [visibleTasks, setVisibleTasks] = useState(tasks);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());
  const [setTaskDone] = useMutation<SetTaskDoneData, SetTaskDoneVariables>(SET_TASK_DONE);
  const { toasts, removeToast, error: showError } = useToast();

  useEffect(() => {
    setVisibleTasks(tasks);
  }, [tasks]);

  if (visibleTasks.length === 0 && !notes) return null;

  const completed = visibleTasks.filter((task) => Boolean(task.doneAt)).length;
  const total = visibleTasks.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

  async function toggleTask(task: BookingTask) {
    if (pendingTaskIds.has(task.id)) return;

    const done = !task.doneAt;
    setPendingTaskIds((current) => new Set(current).add(task.id));
    try {
      const result = await setTaskDone({ variables: { input: { taskId: task.id, done } } });
      const savedTask = result.data?.setTaskDone;
      if (savedTask) {
        setVisibleTasks((current) => current.map((item) => (item.id === savedTask.id ? savedTask : item)));
      }
    } catch (error) {
      showError(extractGraphQLErrorMessage(error) ?? 'บันทึกสถานะงานไม่สำเร็จ กรุณาลองใหม่', 4000);
    } finally {
      setPendingTaskIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  }

  return (
    <section className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EAF7F3]">
            <Icon name="checklist" size="small" color="#31866F" />
          </span>
          <p className="text-[17px] font-bold text-[#1A1A1A]" style={FONT}>
            แผนงานวันนี้
          </p>
        </div>
        {total > 0 && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              completed === total ? 'bg-[#EAF7F3] text-[#31866F]' : 'bg-[#F0F1F3] text-[#575859]'
            }`}
            style={FONT}
          >
            {completed}/{total} รายการ
          </span>
        )}
      </div>

      {total > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F0F1F3]">
            <div className="h-full rounded-full bg-[#52B69A] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="w-9 shrink-0 text-right text-xs font-bold text-[#575859]" style={{ fontFamily: "'Inter', sans-serif" }}>
            {progress}%
          </span>
        </div>
      )}

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

      {total > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {visibleTasks.map((task) => {
            const done = Boolean(task.doneAt);
            const pending = pendingTaskIds.has(task.id);
            return (
              <button
                key={task.id}
                type="button"
                aria-pressed={done}
                aria-label={`${done ? 'ยกเลิกการทำ' : 'ทำเครื่องหมายว่าเสร็จ'} ${task.description}`}
                disabled={pending}
                onClick={() => void toggleTask(task)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-1 disabled:cursor-wait disabled:opacity-60 ${
                  done ? 'border-[#B7E4D7] bg-[#F1FAF7]' : 'border-[#E5E7EB] bg-white hover:border-[#52B69A] hover:bg-[#FAFDFC]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition ${
                    done ? 'border-[#52B69A] bg-[#52B69A]' : 'border-[#D5D8DC] bg-white'
                  }`}
                >
                  <Icon
                    name={pending ? 'hourglass_empty' : 'check'}
                    size="small"
                    color={done ? '#FFFFFF' : '#D5D8DC'}
                    style={{ fontSize: 16, opacity: done || pending ? 1 : 0.6 }}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm leading-snug ${done ? 'text-[#8A8C8E] line-through' : 'font-semibold text-[#1A1A1A]'}`}
                    style={FONT}
                  >
                    {task.description}
                  </span>
                  {task.timeNote && (
                    <span className="mt-0.5 block text-[11px] text-[#8A8C8E]" style={FONT}>
                      {task.timeNote}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
