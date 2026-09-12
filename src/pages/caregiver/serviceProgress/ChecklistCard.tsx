import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Icon } from '../../../components/ui/Icon';
import { ToastContainer } from '../../../components/ui/Toast';
import { SET_TASK_DONE } from '../../../graphql/queries';
import { useToast } from '../../../hooks/useToast';
import { extractGraphQLErrorMessage } from '../../../lib/apolloErrors';
import type { BookingTask } from '../CaregiverBookings';

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
    <div className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
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
              ทำแล้ว {completed} จาก {total} รายการ
            </span>
            <span className="text-xs font-bold text-[#8A8C8E]" style={{ fontFamily: "'Inter', sans-serif" }}>
              {progress}%
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#F0F1F3]">
            <div className="h-full rounded-full bg-[#52B69A] transition-[width]" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-3 flex flex-col gap-2">
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
                  className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-1 disabled:cursor-wait disabled:opacity-60 ${
                    done ? 'border-[#B7E4D7] bg-[#F1FAF7]' : 'border-[#F0F1F3] bg-white hover:border-[#B7E4D7]'
                  }`}
                >
                  <Icon name={pending ? 'hourglass_empty' : done ? 'check_circle' : 'radio_button_unchecked'} size="small" color={done ? '#52B69A' : '#B0B3B8'} />
                  <span className={`text-sm ${done ? 'text-[#575859] line-through' : 'text-[#1A1A1A]'}`} style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                    {task.description}
                    {task.timeNote && <span className="ml-1 text-xs text-[#8A8C8E]">({task.timeNote})</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
