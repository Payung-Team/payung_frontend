import { forwardRef, useState } from 'react';
import ConfirmModal from '../../components/ui/ConfirmModal';
import CareLevelBadge from '../../components/ui/CareLevelBadge';
import CareLevelPicker from './CareLevelPicker';
import CareLevelCriteria from './CareLevelCriteria';
import { extractGraphQLErrorExtensions, extractGraphQLErrorMessage } from '../../lib/apolloErrors';
import { careLevelLabel, formatCareLevelTime, useCareLevelStrings, type CareLevel } from '../../lib/careLevels';
import type { CareLevelChange } from '../../graphql/careLevel';
import type { CareLevelData } from './useCareLevel';

/**
 * การ์ด "ระดับผู้ดูแล" ในหน้า KYC review ฝั่งแอดมิน (PYG-557 · S02 · ดีไซน์ PYG-578 · BE PYG-581)
 *
 * - KYC รอตรวจ: ตัวเลือกระดับ (ค่าอยู่ที่หน้าแม่ เพราะส่งไปกับ approveKyc) — S02-AC1/AC2
 * - หลังอนุมัติ: ระดับปัจจุบัน + ผู้กำหนด + เวลา, แก้ระดับพร้อมเหตุผลและขั้นยืนยัน, ประวัติ — S02-AC3/AC4
 * - ค่าเริ่มต้นจาก migration ที่ยังไม่ทบทวน: ป้ายขอบประ + "ค่าเริ่มต้น · ยังไม่ทบทวน" + ปุ่มทบทวน — S02-AC6
 *
 * กติกาจาก BE: เปลี่ยนระดับ หรือยืนยันค่าเริ่มต้น ต้องมีเหตุผลเสมอ · ค่าเดิมที่แอดมินกำหนดไว้แล้ว = ไม่มีอะไรเปลี่ยน (E4)
 */
interface Props {
  caregiverName: string;
  kycStatus: string;
  /** วิชาชีพที่ผู้ดูแลเลือก — ใช้แสดงคำแนะนำในเกณฑ์ระดับเท่านั้น */
  profession?: string | null;
  data: CareLevelData;
  /** โหมดรอตรวจ: ค่าที่เลือก (หน้าแม่ถือ) */
  picked: CareLevel | null;
  onPick: (level: CareLevel) => void;
  pickerError?: string;
  onNotify: (type: 'success' | 'error', message: string) => void;
}

const REASON_MAX_LENGTH = 500;

const AdminCareLevelCard = forwardRef<HTMLDivElement, Props>(function AdminCareLevelCard(
  { caregiverName, kycStatus, profession, data, picked, onPick, pickerError, onNotify },
  pickerRef,
) {
  const s = useCareLevelStrings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CareLevel | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isPending = kycStatus === 'pending';
  const isVerified = kycStatus === 'verified';
  const { level, setByName, setAt, unreviewed, history, saving } = data;
  const isSame = !!draft && draft === level;
  // ค่าเดิมที่แอดมินกำหนดไว้แล้วบันทึกไม่ได้ (E4) · ค่าเดิมที่ยังไม่ทบทวน = ยืนยันได้
  const isConfirmingDefault = isSame && unreviewed;
  const canSave = !!draft && (!isSame || unreviewed) && !saving;

  function startEdit() {
    setDraft(level);
    setReason('');
    setReasonError(undefined);
    setEditing(true);
  }

  function requestSave() {
    if (!draft) return;
    if (!reason.trim()) {
      setReasonError(s.reasonRequired);
      return;
    }
    setConfirmOpen(true);
  }

  async function save() {
    if (!draft) return;
    try {
      await data.setLevel(draft, reason);
      setConfirmOpen(false);
      setEditing(false);
      onNotify('success', s.savedToast(s.levelLabel[draft]));
    } catch (err) {
      setConfirmOpen(false);
      const code = extractGraphQLErrorExtensions(err)?.code;
      if (code === 'CARE_LEVEL_REASON_REQUIRED') setReasonError(s.reasonRequired);
      else if (code === 'CARE_LEVEL_INVALID' || code === 'CARE_LEVEL_REQUIRED') onNotify('error', s.invalid);
      else if (code === 'CARE_LEVEL_KYC_NOT_VERIFIED') onNotify('error', s.kycNotVerified);
      else onNotify('error', extractGraphQLErrorMessage(err) ?? s.saveFailed);
    }
  }

  function historyActor(row: CareLevelChange) {
    if (row.source === 'MIGRATION_DEFAULT' || !row.changedBy) {
      return <span className="text-[#92400E]">{s.historySystem}</span>;
    }
    const note =
      row.source === 'KYC_APPROVAL'
        ? s.historyKycApproval
        : row.oldLevel === row.newLevel
          ? s.historyReviewed
          : '';
    return (
      <>
        {row.changedByName || '-'}
        {note && <span className="text-[#6B7280]"> {note}</span>}
      </>
    );
  }

  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 id="care-level-title" className="text-base font-semibold leading-5 text-[#064E3B]">
        {s.title}
        {isPending && <span className="ml-1 text-[#DC2626]" aria-hidden="true">*</span>}
      </h3>
      {isPending ? (
        <span className="text-[12.5px] text-[#6B7280]">{s.pickerHint}</span>
      ) : editing ? null : !level ? (
        // อนุมัติแล้วแต่ยังไม่มีระดับ (อนุมัติหลัง migration ก่อน PYG-581 ขึ้น) — BE ให้กำหนดผ่าน setCaregiverCareLevel ได้
        isVerified ? (
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-[#059669] px-3 text-[13px] font-semibold text-white hover:bg-[#047857]"
          >
            {s.assign}
          </button>
        ) : null
      ) : unreviewed ? (
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-[#D97706] px-3 text-[13px] font-semibold text-white hover:bg-[#B45309]"
        >
          {s.review}
        </button>
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-[#D1D5DB] bg-white px-3 text-[13px] font-semibold text-[#374151] hover:bg-gray-50"
        >
          <span className="material-icons-outlined" style={{ fontSize: 16 }} aria-hidden="true">edit</span>
          {s.edit}
        </button>
      )}
    </div>
  );

  return (
    <article
      aria-labelledby="care-level-title"
      className={`rounded-xl border bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${
        pickerError ? 'border-[#FCA5A5]' : unreviewed && !isPending ? 'border-[#FCD34D]' : 'border-[#E5E7EB]'
      }`}
    >
      {header}

      {isPending ? (
        <div className="mt-4">
          <CareLevelPicker
            ref={pickerRef}
            id="kyc-care-level"
            labelledBy="care-level-title"
            value={picked}
            onChange={onPick}
            error={pickerError}
          />
          <CareLevelCriteria level={picked} profession={profession} />
        </div>
      ) : editing ? (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <CareLevelPicker
              id="edit-care-level"
              labelledBy="care-level-title"
              value={draft}
              onChange={setDraft}
              currentValue={level}
              disabled={saving}
            />
            <CareLevelCriteria level={draft} profession={profession} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="care-level-reason" className="text-[14px] font-semibold text-[#111827]">
              {s.reason} <span className="text-[#DC2626]" aria-hidden="true">*</span>
            </label>
            <textarea
              id="care-level-reason"
              rows={2}
              maxLength={REASON_MAX_LENGTH}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(undefined);
              }}
              placeholder={s.reasonPlaceholder}
              aria-required="true"
              aria-invalid={!!reasonError || undefined}
              aria-describedby={reasonError ? 'care-level-reason-error' : undefined}
              className={`w-full resize-none rounded-lg border-[1.5px] px-3 py-2 text-[14px] text-[#111827] outline-none focus:ring-2 ${
                reasonError
                  ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FEE2E2]'
                  : 'border-[#D1D5DB] focus:border-[#059669] focus:ring-[#D1FAE5]'
              }`}
            />
            {reasonError && (
              <span id="care-level-reason-error" role="alert" className="flex items-center gap-1 text-sm text-red-500">
                <span className="material-icons" style={{ fontSize: 16 }} aria-hidden="true">error_outline</span>
                {reasonError}
              </span>
            )}
          </div>
          {isSame && !unreviewed && (
            <span className="flex items-center gap-1 text-[13px] text-[#6B7280]">
              <span className="material-icons-outlined" style={{ fontSize: 16 }} aria-hidden="true">info</span>
              {s.sameValue}
            </span>
          )}
          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              className="h-9 cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-4 text-[13px] font-semibold text-[#374151] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {s.cancel}
            </button>
            <button
              type="button"
              onClick={requestSave}
              disabled={!canSave}
              className="h-9 cursor-pointer rounded-lg bg-[#059669] px-4 text-[13px] font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isConfirmingDefault && draft ? s.confirmSame(s.levelLabel[draft]) : s.save}
            </button>
          </div>
        </div>
      ) : level ? (
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <CareLevelBadge level={level} size="md" unreviewed={unreviewed} />
            {unreviewed && (
              <span className="inline-flex h-6 items-center gap-1 rounded-md bg-[#FEF3C7] px-2 text-[12px] font-bold text-[#92400E]">
                <span className="material-icons-outlined" style={{ fontSize: 14 }} aria-hidden="true">pending</span>
                {s.unreviewed}
              </span>
            )}
          </div>
          {unreviewed ? (
            <p className="rounded-lg bg-[#FFFBEB] px-3 py-2 text-[13.5px] leading-5 text-[#92400E]">{s.unreviewedNote}</p>
          ) : (
            <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-y-1.5 text-[14px]">
              <dt className="text-[#6B7280]">{s.setBy}</dt>
              <dd className="m-0 text-[#1F2937]">{setByName || '-'}</dd>
              <dt className="text-[#6B7280]">{s.setAt}</dt>
              <dd className="m-0 text-[#1F2937]">{formatCareLevelTime(setAt)}</dd>
            </dl>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <CareLevelBadge level={null} size="md" showEmpty className="self-start" />
          <span className="text-[13px] text-[#6B7280]">{isVerified ? s.noneVerified : s.noneAdmin}</span>
        </div>
      )}

      {!isPending && history.length > 0 && (
        <div className="mt-5 border-t border-[#F3F4F6] pt-4">
          <h4 className="text-[13px] font-medium text-[#6B7280]">{s.history}</h4>
          <ol className="mt-2 flex flex-col">
            {history.map((row) => (
              <li key={row.id} className="grid grid-cols-1 gap-1 border-b border-[#F3F4F6] py-2.5 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3">
                <span className="text-[13px] text-[#6B7280]">{formatCareLevelTime(row.createdAt)}</span>
                <span className="flex flex-col gap-0.5 text-[14px] text-[#1F2937]">
                  <span>
                    <b>
                      {row.oldLevel ? careLevelLabel(row.oldLevel, s) : '—'} → {careLevelLabel(row.newLevel, s)}
                    </b>
                    {' · '}
                    {historyActor(row)}
                  </span>
                  {row.reason && <span className="text-[13px] text-[#6B7280]">“{row.reason}”</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmOpen}
        isLoading={saving}
        title={isConfirmingDefault ? s.reviewConfirmTitle(caregiverName) : s.confirmTitle(caregiverName)}
        description={
          draft ? (
            <>
              {isConfirmingDefault
                ? s.reviewConfirmBody(s.levelLabel[draft])
                : s.confirmBody(level ? s.levelLabel[level] : s.none, s.levelLabel[draft])}
              <br />
              {s.reason}: {reason.trim()}
            </>
          ) : (
            ''
          )
        }
        confirmText={isConfirmingDefault && draft ? s.confirmSame(s.levelLabel[draft]) : s.confirm}
        iconName="military_tech"
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
      />
    </article>
  );
});

export default AdminCareLevelCard;
