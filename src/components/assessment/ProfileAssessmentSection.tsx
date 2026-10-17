import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { CARE_RECIPIENT_ASSESSMENT, type CareRecipientAssessmentData } from '../../graphql/assessment';
import { chosenFlagLabels, formatAssessedAt, useAssessmentStrings } from '../../lib/assessmentStrings';
import { fetchCareRecipients, type CareRecipientSummary } from '../../lib/careRecipientsApi';
import Skeleton from '../ui/Skeleton';
import { AlertIcon, PencilIcon, QuestionMarkIcon } from './assessmentIcons';

/**
 * ส่วนแบบประเมินในโปรไฟล์ (S08 · AC8) — คะแนนรวม, Flags, วันที่ประเมินล่าสุด หรือ "ยังไม่ได้ประเมิน"
 * พร้อมปุ่มแก้ไขที่เปิดแบบประเมินพร้อมคำตอบเดิม
 *
 * ★ แสดงเฉพาะโปรไฟล์ที่ผู้ใช้เป็นเจ้าของ (REST care-recipients) — คนอื่นบันทึกแทนไม่ได้อยู่แล้ว (BE)
 */
export default function ProfileAssessmentSection({ onOpenAssessment }: { onOpenAssessment: (careRecipientId: string) => void }) {
  const s = useAssessmentStrings();
  const [state, setState] = useState<{ status: 'loading' | 'error' } | { status: 'ready'; list: CareRecipientSummary[] }>({
    status: 'loading',
  });

  useEffect(() => {
    let cancelled = false;
    fetchCareRecipients()
      .then((list) => {
        // ใบของตัวเองอยู่บนสุดเหมือนหน้าเลือกผู้รับบริการตอนจอง
        if (!cancelled) setState({ status: 'ready', list: [...list.filter((r) => r.isSelf), ...list.filter((r) => !r.isSelf)] });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="profile-assessment-title" className="mt-6 border-t border-gray-100 pt-6">
      <h3 id="profile-assessment-title" className="text-sm font-bold text-[#1A1A1A]">
        {s.profileSectionTitle}
      </h3>
      <p className="mt-0.5 text-xs text-gray-500">{s.profileSectionHint}</p>

      <div className="mt-3 flex flex-col gap-2.5">
        {state.status === 'loading' && <Skeleton height={72} borderRadius="12px" />}
        {state.status === 'error' && (
          <p role="alert" className="flex items-center gap-1.5 text-xs font-semibold text-red-600">
            <AlertIcon size={16} />
            {s.profileLoadFailed}
          </p>
        )}
        {state.status === 'ready' && state.list.length === 0 && (
          <p className="rounded-xl bg-[#F6FAF9] px-4 py-3 text-xs text-[#8A8C8E]">{s.profileEmpty}</p>
        )}
        {state.status === 'ready' &&
          state.list.map((r) => <RecipientAssessmentCard key={r.id} recipient={r} onOpen={() => onOpenAssessment(r.id)} />)}
      </div>
    </section>
  );
}

function RecipientAssessmentCard({ recipient, onOpen }: { recipient: CareRecipientSummary; onOpen: () => void }) {
  const s = useAssessmentStrings();
  // hasAssessment = false → ไม่ต้องยิง query (รู้คำตอบแล้วว่าเป็น null)
  const { data, loading, error } = useQuery<CareRecipientAssessmentData>(CARE_RECIPIENT_ASSESSMENT, {
    variables: { careRecipientId: recipient.id },
    skip: recipient.hasAssessment === false,
    fetchPolicy: 'network-only',
  });
  const a = data?.careRecipientAssessment ?? null;
  const notAssessed = recipient.hasAssessment === false || (!!data && !a);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900">
            {recipient.name}
            {recipient.isSelf && (
              <span className="shrink-0 rounded-full bg-[#F0FAF4] px-2 py-0.5 text-[11px] font-bold text-[#1B5C48]">
                {s.selfBadge}
              </span>
            )}
          </p>
          {loading && <Skeleton width={140} height={12} borderRadius="4px" className="mt-1.5" />}
          {error && <p className="mt-1 text-xs text-red-600">{s.profileLoadFailed}</p>}
          {notAssessed && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-semibold text-[#78350F]">
              <AlertIcon size={13} />
              {s.notAssessedBadge}
            </span>
          )}
          {a && (
            <>
              <p className="mt-1 text-sm font-bold text-[#1B5C48]">{s.profileScore(a.adlTotalScore)}</p>
              <p className="text-xs text-gray-500">{s.profileAssessedAt(formatAssessedAt(a.assessedAt))}</p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-[#52B69A] px-2.5 py-1.5 text-xs font-semibold text-[#1F5E43] hover:bg-[#F0FAF4]"
        >
          <PencilIcon size={14} />
          {a ? s.profileEdit : s.profileStart}
        </button>
      </div>
      {a && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(a.noSpecialConditions ? [s.profileNoFlags] : chosenFlagLabels(s, a.flags, a.dementiaSevere)).map((label) => (
            <span key={label} className="rounded-full bg-[#E3F2EA] px-2.5 py-0.5 text-xs font-semibold text-[#1F5E43]">
              {label}
            </span>
          ))}
          {a.hasUnsureFlag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-semibold text-[#78350F]">
              <QuestionMarkIcon size={12} />
              {s.unsureFlagLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
