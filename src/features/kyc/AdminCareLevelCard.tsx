import { forwardRef, useState } from 'react';
import ConfirmModal from '../../components/ui/ConfirmModal';
import CareLevelBadge from '../../components/ui/CareLevelBadge';
import CareLevelPicker from './CareLevelPicker';
import { careLevelLabel, formatCareLevelTime, useCareLevelStrings, type CareLevel } from '../../lib/careLevels';
import type { CareLevelActor } from '../../graphql/careLevel';
import type { CareLevelData } from './useCareLevel';

/**
 * การ์ด "ระดับผู้ดูแล" ในหน้า KYC review ฝั่งแอดมิน (PYG-557 · S02 · ดีไซน์ PYG-578)
 *
 * - KYC รอตรวจ: ตัวเลือกระดับ (ค่าอยู่ที่หน้าแม่ เพราะปุ่มอนุมัติเป็นของหน้าแม่) — S02-AC1/AC2
 * - หลังอนุมัติ: ระดับปัจจุบัน + ผู้กำหนด + เวลา, แก้ระดับพร้อมขั้นยืนยัน, ประวัติ — S02-AC3/AC4
 * - ค่าเริ่มต้นจาก migration ที่ยังไม่ทบทวน: ป้ายขอบประ + "ค่าเริ่มต้น · ยังไม่ทบทวน" + ปุ่มทบทวน — S02-AC6
 */
interface Props {
  caregiverName: string;
  kycStatus: string;
  data: CareLevelData;
  /** อีเมลแอดมินที่ล็อกอิน — ใช้แสดง "(คุณ)" */
  currentAdminEmail?: string | null;
  /** โหมดรอตรวจ: ค่าที่เลือก (หน้าแม่ถือ) */
  picked: CareLevel | null;
  onPick: (level: CareLevel) => void;
  pickerError?: string;
  onNotify: (type: 'success' | 'error', message: string) => void;
}

function actorName(actor: CareLevelActor | null | undefined) {
  return actor?.displayName || actor?.email || '-';
}

const AdminCareLevelCard = forwardRef<HTMLDivElement, Props>(function AdminCareLevelCard(
  { caregiverName, kycStatus, data, currentAdminEmail, picked, onPick, pickerError, onNotify },
  pickerRef,
) {
  const s = useCareLevelStrings();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<CareLevel | null>(null);
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const isPending = kycStatus === 'pending';
  const { level, setBy, setAt, unreviewed, history, saving } = data;
  const isSame = !!draft && draft === level;
  // ค่าเดิมบันทึกไม่ได้ (E4) ยกเว้นเป็นการยืนยันค่าเริ่มต้นที่ยังไม่ทบทวน
  const canSave = !!draft && (!isSame || unreviewed) && !saving;

  function startEdit() {
    setDraft(level);
    setReason('');
    setEditing(true);
  }

  async function save() {
    if (!draft) return;
    try {
      await data.setLevel(draft, reason);
      setConfirmOpen(false);
      setEditing(false);
      onNotify('success', s.savedToast(s.levelLabel[draft]));
    } catch {
      onNotify('error', s.saveFailed);
    }
  }

  const header = (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 id="care-level-title" className="text-base font-semibold leading-5 text-[#064E3B]">
        {s.title}
        {isPending && <span className="ml-1 text-[#DC2626]" aria-hidden="true">*</span>}
      </h3>
      {isPending ? (
        <span className="text-[12.5px] text-[#6B7280]">{s.pickerHint}</span>
      ) : level && !editing ? (
        unreviewed ? (
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
        )
      ) : null}
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
          <p className="mt-3 text-[12.5px] text-[#6B7280]">{s.criteriaPending}</p>
        </div>
      ) : editing ? (
        <div className="mt-4 flex flex-col gap-4">
          <CareLevelPicker
            id="edit-care-level"
            labelledBy="care-level-title"
            value={draft}
            onChange={setDraft}
            currentValue={level}
            disabled={saving}
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="care-level-reason" className="text-[14px] font-semibold text-[#111827]">
              {s.reason} <span className="text-[12.5px] font-normal text-[#6B7280]">{s.reasonOptional}</span>
            </label>
            <textarea
              id="care-level-reason"
              rows={2}
              maxLength={200}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={s.reasonPlaceholder}
              className="w-full resize-none rounded-lg border-[1.5px] border-[#D1D5DB] px-3 py-2 text-[14px] text-[#111827] outline-none focus:border-[#059669] focus:ring-2 focus:ring-[#D1FAE5]"
            />
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
              onClick={() => setConfirmOpen(true)}
              disabled={!canSave}
              className="h-9 cursor-pointer rounded-lg bg-[#059669] px-4 text-[13px] font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSame && unreviewed && draft ? s.confirmSame(s.levelLabel[draft]) : s.save}
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
              <dd className="m-0 text-[#1F2937]">
                {actorName(setBy)}
                {setBy?.email && setBy.email === currentAdminEmail ? ` ${s.you}` : ''}
              </dd>
              <dt className="text-[#6B7280]">{s.setAt}</dt>
              <dd className="m-0 text-[#1F2937]">{formatCareLevelTime(setAt)}</dd>
            </dl>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <CareLevelBadge level={null} size="md" showEmpty className="self-start" />
          <span className="text-[13px] text-[#6B7280]">{s.noneAdmin}</span>
        </div>
      )}

      {!isPending && history.length > 0 && (
        <div className="mt-5 border-t border-[#F3F4F6] pt-4">
          <h4 className="text-[13px] font-medium text-[#6B7280]">{s.history}</h4>
          <ol className="mt-2 flex flex-col">
            {history.map((row) => (
              <li key={row.id} className="grid grid-cols-1 gap-1 border-b border-[#F3F4F6] py-2.5 last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-3">
                <span className="text-[13px] text-[#6B7280]">{row.createdAt ? formatCareLevelTime(row.createdAt) : '-'}</span>
                <span className="flex flex-col gap-0.5 text-[14px] text-[#1F2937]">
                  <span>
                    <b>
                      {row.oldLevel ? careLevelLabel(row.oldLevel, s) : '—'} → {careLevelLabel(row.newLevel, s)}
                    </b>
                    {' · '}
                    {row.changedBy ? actorName(row.changedBy) : <span className="text-[#92400E]">{s.historySystem}</span>}
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
        title={isSame && unreviewed ? s.reviewConfirmTitle(caregiverName) : s.confirmTitle(caregiverName)}
        description={
          draft
            ? isSame && unreviewed
              ? s.reviewConfirmBody(s.levelLabel[draft])
              : <>{s.confirmBody(level ? s.levelLabel[level] : s.none, s.levelLabel[draft])}{reason.trim() ? <><br />{s.reason}: {reason.trim()}</> : null}</>
            : ''
        }
        confirmText={isSame && unreviewed && draft ? s.confirmSame(s.levelLabel[draft]) : s.confirm}
        iconName="military_tech"
        onClose={() => setConfirmOpen(false)}
        onConfirm={save}
      />
    </article>
  );
});

export default AdminCareLevelCard;
