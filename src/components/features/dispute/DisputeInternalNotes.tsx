import { useState } from 'react';
import DisputeCard from './DisputeCard';
import { cn } from '../../../lib/utils';
import { formatThaiDateTime } from './disputeMeta';
import type { InternalNote } from './disputeDetailMapper';

interface DisputeInternalNotesProps {
  notes: InternalNote[];
  onAddNote: (message: string) => void;
}

// PYG-321 — โน้ตภายในของแอดมิน (ไม่แสดงให้คู่กรณีเห็น) แยกจากข้อความ public
export default function DisputeInternalNotes({ notes, onAddNote }: DisputeInternalNotesProps) {
  const [draft, setDraft] = useState('');
  const canSave = draft.trim() !== '';

  const handleSave = () => {
    if (!canSave) return;
    onAddNote(draft.trim());
    setDraft('');
  };

  return (
    <DisputeCard title="บันทึกภายใน (เฉพาะแอดมิน)">
      {notes.length === 0 ? (
        <p className="text-sm text-[#8A8C8E]">ยังไม่มีบันทึกภายใน</p>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-[#E5E7EB] px-3 py-3">
              <p className="text-[13px] leading-5 text-[#575859]">{note.message}</p>
              <p className="mt-1 font-[Inter] text-[11px] text-[#C6C8CB]">
                {note.author} · {formatThaiDateTime(note.at)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        <input
          id="noteInput"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
          placeholder="เพิ่มบันทึกภายใน..."
          aria-label="เพิ่มบันทึกภายใน"
          className="h-10 min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#059669]"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={cn(
            'h-10 shrink-0 rounded-lg px-5 text-[13px] font-bold text-white transition-colors',
            canSave ? 'cursor-pointer bg-[#1A1A1A] hover:bg-black' : 'cursor-not-allowed bg-[#C6C8CB]',
          )}
        >
          บันทึก
        </button>
      </div>
    </DisputeCard>
  );
}
