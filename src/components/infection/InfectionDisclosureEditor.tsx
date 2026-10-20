import { useId, useState } from 'react';
import { useInfectionStrings } from '../../lib/infectionStrings';
import {
  infectionKey,
  saveRecipientInfection,
  type InfectionValue,
} from '../../lib/infectionDisclosure';
import { InfectionNoticeNotAcceptedError } from '../../lib/careRecipientsApi';

/**
 * ช่องแจ้งโรคติดเชื้อฝั่งญาติ (S10 · PYG-620 · Design PYG-616)
 * ใช้ทั้งขั้นผู้รับบริการในการจอง (variant booking) และโปรไฟล์ผู้รับบริการ (variant profile)
 *
 * ★ ไม่มีค่าที่เลือกไว้ล่วงหน้าเมื่อยังไม่ได้ระบุ และ checkbox รับทราบไม่ถูกติ๊กไว้ล่วงหน้า — ทุกครั้งที่เปิดแก้ (R3)
 * ★ ข้อความแจ้งการเปิดเผยอยู่เหนือปุ่มบันทึกเสมอ ไม่ซ่อนหลังลิงก์ (AC5)
 * ★ บันทึกตรงไป BE ทันที — ค่าไม่ผ่าน bookingDraft (sessionStorage)
 */
export default function InfectionDisclosureEditor({
  recipientId,
  recipientName,
  value,
  variant,
  onSaved,
}: {
  recipientId: string;
  recipientName: string;
  value: InfectionValue;
  variant: 'booking' | 'profile';
  onSaved: (value: InfectionValue) => void;
}) {
  const s = useInfectionStrings();
  const uid = useId();
  // ขั้นจอง: ยังไม่ได้ระบุ → เปิดช่องให้กรอกทันที · โปรไฟล์: แสดงค่าก่อน กด "ระบุ/แก้ไข" ค่อยเปิด
  const [editing, setEditing] = useState(variant === 'booking' && value === null);
  const [choice, setChoice] = useState<InfectionValue>(value);
  const [ack, setAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const startEdit = () => {
    setChoice(value);
    setAck(false);
    setError(null);
    setJustSaved(false);
    setEditing(true);
  };

  const save = async () => {
    if (choice === null || !ack || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveRecipientInfection(recipientId, choice);
      onSaved(saved);
      setEditing(false);
      setJustSaved(true);
    } catch (err) {
      setError(err instanceof InfectionNoticeNotAcceptedError ? s.noticeNotAccepted : s.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const key = infectionKey(value);
  const pill = {
    yes: { text: s.valueYes, cls: 'bg-[#FFF6E5] text-[#6B4E12] border border-[#E8C77A]' },
    no: { text: s.valueNo, cls: 'bg-[#EEF1F0] text-[#33453D] border border-[#C9D0CD]' },
    unset: { text: s.valueUnset, cls: 'bg-white text-[#4A4F4C] border-[1.5px] border-dashed border-[#9AA39F]' },
  }[key];

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-[180px] flex-1 text-sm font-semibold text-[#33453D]">{s.fieldTitle}</p>
          <span className={`inline-flex min-h-[32px] items-center rounded-full px-3.5 text-sm font-bold ${pill.cls}`}>
            {pill.text}
          </span>
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border-[1.5px] border-[#1B5C48] bg-white px-4 text-sm font-bold text-[#1B5C48] hover:bg-[#F0FAF4]"
          >
            <span className="material-icons" style={{ fontSize: 18 }} aria-hidden="true">
              edit
            </span>
            {value === null ? s.specify : s.edit}
          </button>
        </div>
        {value === null && (
          <p className="rounded-xl border-[1.5px] border-dashed border-[#B9C2BE] bg-[#F2F4F3] px-3.5 py-2.5 text-xs leading-relaxed text-[#33453D]">
            {s.unsetProfileHint}
          </p>
        )}
        {justSaved && (
          <p role="status" className="text-xs font-semibold text-[#1B5C48]">
            {s.saved}
          </p>
        )}
      </div>
    );
  }

  const missing = [choice === null ? s.missingChoice : null, !ack ? s.missingAck : null].filter(Boolean);
  const canCancel = value !== null || variant === 'profile';
  const options: { v: boolean; title: string; desc: string }[] = [
    { v: false, title: s.optionNo, desc: s.optionNoDesc },
    { v: true, title: s.optionYes, desc: s.optionYesDesc },
  ];

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="rounded-2xl border-[1.5px] border-[#DDE3E0] p-4">
        <legend className="px-1 text-base font-bold text-[#1A1A1A]">
          {s.fieldTitle} <span className="text-[#8E2A1B]">*</span>
        </legend>
        <p className="text-sm leading-relaxed text-[#4A4F4C]">{s.help}</p>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-[#1B5C48]">{s.reassure}</p>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {options.map((o) => {
            const selected = choice === o.v;
            return (
              <label
                key={String(o.v)}
                className={`flex min-h-[72px] cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                  selected ? 'border-[#1B5C48] bg-[#EAF6F0]' : 'border-[#DDE3E0] bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`${uid}-infection`}
                  checked={selected}
                  onChange={() => setChoice(o.v)}
                  className="mt-1 h-5 w-5 shrink-0 cursor-pointer accent-[#1B5C48]"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-base font-bold text-[#1A1A1A]">{o.title}</span>
                  <span className="text-sm leading-snug text-[#4A4F4C]">{o.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* ข้อความแจ้งการเปิดเผยอยู่ในข้อความของ checkbox เอง — เห็นก่อนปุ่มบันทึกเสมอ (AC5) */}
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl bg-[#F1F5FB] px-4 py-3">
        <input
          type="checkbox"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          className="mt-0.5 h-6 w-6 shrink-0 cursor-pointer accent-[#1B5C48]"
        />
        <span className="text-sm leading-relaxed text-[#1A1A1A]">{s.noticeAck(recipientName)}</span>
      </label>

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-sm font-bold text-[#8E2A1B]">
          <span className="material-icons" style={{ fontSize: 18 }} aria-hidden="true">
            error_outline
          </span>
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {missing.length > 0 && (
          <p id={`${uid}-missing`} className="min-w-[200px] flex-1 text-sm text-[#5F6662]">
            {missing.join(' · ')}
          </p>
        )}
        {canCancel && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={saving}
            className="min-h-[48px] cursor-pointer rounded-xl border-[1.5px] border-[#C9D0CD] bg-white px-5 text-sm font-semibold text-[#33453D] hover:bg-gray-50 disabled:cursor-not-allowed"
          >
            {s.cancel}
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={choice === null || !ack || saving}
          aria-describedby={missing.length > 0 ? `${uid}-missing` : undefined}
          className="min-h-[48px] min-w-[120px] cursor-pointer rounded-xl bg-[#1B5C48] px-5 text-sm font-bold text-white hover:bg-[#164B3B] disabled:cursor-not-allowed disabled:bg-[#E4E9E7] disabled:text-[#5F6662]"
        >
          {saving ? s.saving : s.save}
        </button>
      </div>
    </div>
  );
}
