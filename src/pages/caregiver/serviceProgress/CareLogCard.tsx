import { useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/Toast';

const CATEGORIES = ['ยา', 'อาหาร', 'สุขภาพร่างกาย', 'กิจกรรม', 'อื่นๆ'] as const;

/** "บันทึกการดูแล" composer — there is no care-log entry model on the backend yet, so submitting
 * doesn't persist anything; it honestly tells the caregiver that instead of pretending to save. */
export default function CareLogCard() {
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(CATEGORIES[0]);
  const { toasts, removeToast, info: showInfo } = useToast();

  function handleSubmit() {
    if (!note.trim()) return;
    showInfo('ฟีเจอร์บันทึกการดูแลจะเปิดใช้งานเร็ว ๆ นี้', 3000);
    setNote('');
  }

  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
      <p className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        บันทึกการดูแล
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              category === c ? 'bg-[#52B69A] text-white' : 'bg-[#F0F1F3] text-[#575859] hover:bg-[#E5E7EB]'
            }`}
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            {c}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="บันทึกสิ่งที่เกิดขึ้นระหว่างการดูแล..."
        className="mt-3 w-full resize-none rounded-xl border border-[#E5E7EB] p-3 text-sm text-[#1A1A1A] placeholder:text-[#B0B3B8] focus:border-[#52B69A] focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-[#B0B3B8]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          {note.length}/500
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!note.trim()}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-[#52B69A] px-4 text-xs font-bold text-white transition hover:bg-[#489e86] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <Icon name="send" size="small" color="#FFFFFF" />
          บันทึก
        </button>
      </div>
    </div>
  );
}
