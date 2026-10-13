import { useState, type KeyboardEvent } from 'react';
import {
  MAX_CUSTOM_SKILLS,
  MAX_CUSTOM_SKILL_LENGTH,
  customSkillError,
  normalizeCustomSkill,
} from '../../lib/skillLabels';

/**
 * ทักษะอื่นๆ ที่ผู้ดูแลพิมพ์เอง — แสดงในโปรไฟล์เท่านั้น ไม่ใช้จับคู่งาน
 * Enter หรือจุลภาคเพื่อเพิ่ม · Backspace ในช่องว่างเพื่อลบอันสุดท้าย
 */
interface Props {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
}

const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

export default function CustomSkillsInput({ id, value, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const full = value.length >= MAX_CUSTOM_SKILLS;

  function commit() {
    const v = normalizeCustomSkill(draft);
    if (!v) return;
    const err = customSkillError(v, value);
    setError(err);
    if (err) return;
    onChange([...value, v]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // isComposing: กันกด Enter ตอนพิมพ์ด้วย IME แล้วเพิ่มคำที่ยังพิมพ์ไม่จบ
    if ((e.key === 'Enter' || e.key === ',') && !e.nativeEvent.isComposing) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
      setError(null);
    }
  }

  return (
    <div className="flex flex-col gap-2" style={font}>
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        ทักษะอื่นๆ <span className="text-[#717182] font-normal">(ไม่บังคับ)</span>
      </label>
      <div
        className={`flex flex-wrap gap-1.5 items-center min-h-[44px] border rounded-[10px] bg-white px-2 py-1.5 focus-within:ring-1 ${
          error ? 'border-red-500 focus-within:ring-red-500' : 'border-gray-300 focus-within:border-[#2D6A58] focus-within:ring-[#2D6A58]'
        }`}
      >
        {value.map((t, i) => (
          <span key={t} className="inline-flex items-center gap-1 h-[30px] pl-3 pr-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] text-[13px] font-medium text-[#334155]">
            {t}
            <button
              type="button"
              onClick={() => { onChange(value.filter((_, j) => j !== i)); setError(null); }}
              aria-label={`ลบ ${t}`}
              className="w-[22px] h-[22px] rounded-full text-[#64748B] hover:bg-[#E2E8F0] flex items-center justify-center cursor-pointer"
            >
              <span className="material-icons" style={{ fontSize: 15 }} aria-hidden="true">close</span>
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => { setDraft(e.target.value); if (error) setError(null); }}
          onKeyDown={onKeyDown}
          onBlur={commit}
          disabled={full}
          maxLength={MAX_CUSTOM_SKILL_LENGTH}
          autoComplete="off"
          aria-invalid={!!error || undefined}
          aria-describedby={`${id}-hint${error ? ` ${id}-error` : ''}`}
          placeholder={full ? `ครบ ${MAX_CUSTOM_SKILLS} รายการแล้ว` : 'พิมพ์แล้วกด Enter เช่น ภาษามือ, ทำอาหารคลีน'}
          className="flex-1 min-w-[160px] border-0 outline-none bg-transparent text-sm px-1 py-1 text-gray-900 disabled:cursor-not-allowed"
        />
      </div>
      {error && (
        <span id={`${id}-error`} className="flex items-start gap-1 text-[12.5px] text-red-500">
          <span className="material-icons mt-px" style={{ fontSize: 15 }} aria-hidden="true">error_outline</span>
          {error}
        </span>
      )}
      <span id={`${id}-hint`} className="flex items-center gap-1 text-[12.5px] text-[#717182]">
        <span className="material-icons-outlined" style={{ fontSize: 14 }} aria-hidden="true">visibility</span>
        แสดงในโปรไฟล์เท่านั้น ไม่ใช้จับคู่งาน · สูงสุด {MAX_CUSTOM_SKILLS} รายการ รายการละไม่เกิน {MAX_CUSTOM_SKILL_LENGTH} ตัวอักษร · {value.length}/{MAX_CUSTOM_SKILLS}
      </span>
    </div>
  );
}
