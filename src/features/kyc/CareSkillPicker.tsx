import { isSelectableSkill, skillLabel } from '../../lib/skillLabels';
import { useCareSkillCatalog } from './useCareSkillCatalog';
import { isProfession } from '../../lib/professions';
import ProfessionBadge from '../../components/ui/ProfessionBadge';

/**
 * ทักษะกลาง (ใช้จับคู่งาน) — ทักษะพื้นฐานทุกวิชาชีพติ๊กได้ + ทักษะเฉพาะที่ขึ้นตามวิชาชีพที่เลือก
 * รายการมาจาก API careSkills (PYG-655 · useCareSkillCatalog)
 * ค่าเดิมที่ติ๊กไม่ได้แล้ว (รหัสชุดเก่า หรือทักษะเฉพาะของวิชาชีพอื่น) แสดงแยกให้กดเอาออกได้ ไม่ซ่อนเงียบๆ
 *
 * tone ตามแบบฟิลด์อื่นใน KycStep1 ตอน resubmit: muted = ยังไม่แก้ (เทา) · edited = แก้แล้ว (เขียว)
 */
interface Props {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
  profession: string | null | undefined;
  error?: string;
  tone?: 'default' | 'muted' | 'edited';
  /** ทักษะเฉพาะที่เพิ่งถูกเอาออกเพราะเปลี่ยนวิชาชีพ */
  droppedSkills?: string[];
}

const font = { fontFamily: "'Bai Jamjuree', sans-serif" };

export default function CareSkillPicker({ id, value, onChange, profession, error, tone = 'default', droppedSkills = [] }: Props) {
  const catalog = useCareSkillCatalog();
  const basic = catalog.filter((s) => !s.profession);
  const specific = catalog.filter((s) => s.profession && s.profession === profession);
  const legacy = value.filter((s) => !isSelectableSkill(s, profession, catalog));
  const count = value.length - legacy.length;

  function toggle(code: string) {
    onChange(value.includes(code) ? value.filter((s) => s !== code) : [...value, code]);
  }

  function chip(code: string, label: string) {
    const selected = value.includes(code);
    const look =
      tone === 'muted'
        ? selected
          ? 'bg-gray-200 text-[#9CA3AF] border-transparent'
          : 'bg-white text-[#0A0A0A] border-[#E2E8F0]'
        : tone === 'edited'
          ? selected
            ? 'bg-[#ECFDF5] text-[#047857] border-[#10B981]'
            : 'bg-white text-[#0A0A0A] border-[#E2E8F0] hover:border-[#10B981] hover:text-[#10B981]'
          : selected
            ? 'bg-[#E3EFEA] text-[#1F4D40] border-[#2D6A58] font-semibold'
            : `bg-white text-[#0A0A0A] ${error ? 'border-[#FCA5A5]' : 'border-[#E2E8F0]'} hover:border-[#2D6A58] hover:text-[#2D6A58]`;
    return (
      <button
        key={code}
        type="button"
        aria-pressed={selected}
        onClick={() => toggle(code)}
        className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium border transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D6A58] ${look}`}
        style={font}
      >
        {selected && <span className="material-icons" style={{ fontSize: 17 }} aria-hidden="true">check</span>}
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2" style={font} role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        ทักษะการดูแล <span className="text-red-600" aria-hidden="true">*</span>
        {tone === 'edited' && (
          <span className="text-[11px] font-semibold text-[#047857] bg-[#D1FAE5] rounded-full px-2 py-px">แก้ไขแล้ว</span>
        )}
      </span>
      <span className="text-[13px] text-[#717182] -mt-0.5">เลือกทุกข้อที่คุณทำได้ ระบบใช้ข้อมูลนี้จับคู่คุณกับงานที่ตรงกัน</span>

      <div className="flex flex-wrap gap-2">{basic.map((s) => chip(s.value, s.label))}</div>

      {/* ทักษะเฉพาะวิชาชีพ — ขึ้นเมื่อเลือกพยาบาล / นักกายภาพฯ */}
      {specific.length > 0 ? (
          <>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[13px] font-semibold text-gray-700">ทักษะเฉพาะ</span>
              <ProfessionBadge profession={profession} />
            </div>
            <div className="flex flex-wrap gap-2">{specific.map((s) => chip(s.value, s.label))}</div>
          </>
        ) : (
          <div className="flex gap-1.5 items-start text-[12.5px] leading-normal text-[#64748B] bg-[#F8FAFC] border border-dashed border-[#CBD5E1] rounded-[10px] px-3 py-2 mt-1.5">
            <span className="material-icons-outlined mt-px" style={{ fontSize: 16 }} aria-hidden="true">lock</span>
            {isProfession(profession)
              ? 'ทักษะทางคลินิก เช่น ฉีดยา ดูดเสมหะ กายภาพบำบัด ทำได้เฉพาะพยาบาลหรือนักกายภาพบำบัด'
              : 'เลือกวิชาชีพก่อน ทักษะเฉพาะของพยาบาลและนักกายภาพบำบัดจะขึ้นตรงนี้'}
          </div>
        )}

      {droppedSkills.length > 0 && (
        <div role="status" className="flex gap-1.5 items-start text-[12.5px] leading-normal text-[#7A4F0C] bg-[#FEF6E9] border border-[#F3D9A8] rounded-[10px] px-3 py-2">
          <span className="material-icons-outlined mt-px" style={{ fontSize: 16 }} aria-hidden="true">info</span>
          เอา "{droppedSkills.map(skillLabel).join('", "')}" ออกแล้ว เพราะเป็นทักษะเฉพาะของวิชาชีพที่คุณไม่ได้เลือก
        </div>
      )}

      {legacy.length > 0 && (
        <div className="flex flex-col gap-1.5 mt-1">
          <span className="text-[12.5px] text-[#717182]">ทักษะเดิมที่เลือกไม่ได้แล้ว กดเพื่อเอาออก แล้วเลือกจากรายการด้านบนแทน</span>
          <div className="flex flex-wrap gap-2">
            {legacy.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggle(s)}
                aria-label={`เอา ${skillLabel(s)} ออก`}
                className="inline-flex items-center gap-1 pl-3.5 pr-2 py-1.5 rounded-full text-[13px] font-medium border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-[#475569] hover:border-red-400 hover:text-red-600 cursor-pointer"
              >
                {skillLabel(s)}
                <span className="material-icons" style={{ fontSize: 16 }} aria-hidden="true">close</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error ? (
        <span className="flex items-center gap-1 text-sm text-red-500">
          <span className="material-icons" style={{ fontSize: 16 }} aria-hidden="true">error_outline</span>
          {error}
        </span>
      ) : (
        <span className="text-[12.5px] text-[#717182]">เลือกแล้ว {count} ทักษะ</span>
      )}
    </div>
  );
}
