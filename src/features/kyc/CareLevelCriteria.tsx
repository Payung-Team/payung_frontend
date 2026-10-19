import { useCareLevelStrings, type CareLevel } from '../../lib/careLevels';

/**
 * เกณฑ์ของระดับที่เลือกอยู่ — วางใต้ CareLevelPicker ในหน้า KYC review (PYG-557 · S02)
 * เนื้อหามาจากร่าง T-01 (careLevels.ts → criteria) · ยังไม่เลือก = บอกให้เลือกก่อน
 * profession = วิชาชีพที่ผู้ดูแลเลือก ใช้แสดงคำแนะนำเท่านั้น ไม่บังคับระดับ
 */
interface Props {
  level: CareLevel | null;
  profession?: string | null;
}

export default function CareLevelCriteria({ level, profession }: Props) {
  const s = useCareLevelStrings();
  const c = s.criteria;
  const professionHint = profession ? c.professionHint[profession] : undefined;

  return (
    <div className="mt-3 flex flex-col gap-3">
      {professionHint && (
        <p className="flex items-start gap-1.5 rounded-lg bg-[#EFF6FF] px-3 py-2 text-[13px] leading-5 text-[#1E40AF]">
          <span className="material-icons-outlined shrink-0" style={{ fontSize: 17 }} aria-hidden="true">lightbulb</span>
          {professionHint}
        </p>
      )}

      <div className="rounded-[10px] border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-[14px] font-semibold text-[#111827]">
            {level ? c.title(s.levelLabel[level]) : c.emptyHint}
          </h4>
          <span className="inline-flex h-5 items-center rounded-md bg-[#FEF3C7] px-1.5 text-[11px] font-semibold text-[#92400E]">
            {c.draftTag}
          </span>
        </div>

        {level && (
          <dl className="mt-2.5 grid grid-cols-1 gap-x-3 gap-y-2 text-[13.5px] leading-5 sm:grid-cols-[130px_minmax(0,1fr)]">
            <dt className="font-medium text-[#6B7280]">{c.fitLabel}</dt>
            <dd className="m-0 text-[#1F2937]">{c.fit[level]}</dd>
            <dt className="font-medium text-[#6B7280]">{c.evidenceLabel}</dt>
            <dd className="m-0 font-semibold text-[#047857]">{c.evidence[level]}</dd>
            <dt className="font-medium text-[#6B7280]">{c.workLabel}</dt>
            <dd className="m-0 text-[#1F2937]">{c.work[level]}</dd>
            <dt className="font-medium text-[#6B7280]">{c.elderLabel}</dt>
            <dd className="m-0 text-[#1F2937]">{c.elder[level]}</dd>
          </dl>
        )}

        <p className="mt-2.5 border-t border-[#E5E7EB] pt-2 text-[12px] leading-4 text-[#6B7280]">{c.rule}</p>
      </div>
    </div>
  );
}
