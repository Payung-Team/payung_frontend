import { useState } from 'react';
import Icon from '../../../components/ui/Icon';
import ImageModal from '../../../components/ui/ImageModal';
import KycItemDetail from './KycItemDetail';
import { REJECT_CHIPS, REMARK_MAX, CHIP_SEPARATOR, isImageFile, isPdfFile } from './kycReviewItems';
import { formatBirthDate, formatIdCard } from './format';
import type { ChecklistRow, KycChecklist } from './useKycChecklist';
import type { AdminKycDetail, CaregiverDetail } from './types';

function StatusIcon({ row }: { row: ChecklistRow }) {
  if (row.isPass) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#059669" />
        <path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (row.isFail) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#DC2626" />
        <path d="M8.5 8.5l7 7M15.5 8.5l-7 7" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeDasharray="3.5 3" />
    </svg>
  );
}

export function ResultPill({ row, readOnlyPendingLabel = 'ไม่ได้ตรวจ' }: { row: ChecklistRow; readOnlyPendingLabel?: string }) {
  if (row.isPass) {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#ECFDF5] px-2.5 text-[13px] font-semibold text-[#047857]">
        <Icon name="check" style={{ fontSize: 15 }} />ผ่าน
      </span>
    );
  }
  if (row.isFail) {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#FEE2E2] px-2.5 text-[13px] font-semibold text-[#B91C1C]">
        <Icon name="close" style={{ fontSize: 15 }} />ไม่ผ่าน
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 items-center rounded-full bg-[#F3F4F6] px-2.5 text-[13px] font-semibold text-[#4B5563]">{readOnlyPendingLabel}</span>
  );
}

function SmallChip({ row }: { row: ChecklistRow }) {
  if (row.isPass) return <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-[#ECFDF5] px-2 text-[12px] font-semibold text-[#047857]"><Icon name="check" style={{ fontSize: 13 }} />ผ่าน</span>;
  if (row.isFail) return <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-[#FEE2E2] px-2 text-[12px] font-semibold text-[#B91C1C]"><Icon name="close" style={{ fontSize: 13 }} />ไม่ผ่าน</span>;
  return <span className="inline-flex h-[22px] items-center rounded-full bg-[#F3F4F6] px-2 text-[12px] font-semibold text-[#4B5563]">ยังไม่ตรวจ</span>;
}

function Preview({
  row,
  caregiver,
  onLoadError,
  onRetry,
  retrying,
}: {
  row: ChecklistRow;
  caregiver: CaregiverDetail;
  onLoadError: () => void;
  onRetry: () => void;
  retrying: boolean;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  // รูปบัตรที่ใช้เทียบในรายการข้อมูลส่วนตัว — โหลดไม่ขึ้นไม่กระทบการกดผ่าน
  const [thumbErr, setThumbErr] = useState(false);
  const { item } = row;
  const file = item.file;
  const url = file?.url ?? '';

  const frame = (children: React.ReactNode, bg = 'bg-[#959698]') => (
    <div className={`relative flex h-[260px] items-center justify-center overflow-hidden rounded-xl sm:h-[433px] ${bg}`}>{children}</div>
  );

  if (item.kind === 'info') {
    return frame(
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 sm:p-5">
        {url && isImageFile(file) && !thumbErr ? (
          <img src={url} alt="บัตรประชาชน (ด้านหน้า)" onError={() => setThumbErr(true)} className="max-h-[45%] max-w-[70%] rounded-lg bg-white object-contain shadow-[0_8px_24px_rgba(0,0,0,0.18)]" />
        ) : (
          <span className="rounded-lg bg-white/90 px-3 py-1.5 text-[12.5px] text-[#4B5563]">ไม่มีรูปบัตรประชาชนให้เทียบ</span>
        )}
        <div className="w-full max-w-[400px] rounded-[10px] bg-white px-3.5 py-3 shadow-[0_4px_14px_rgba(0,0,0,0.12)]">
          <p className="mb-2 text-[12px] font-semibold leading-4 text-[#064E3B]">ข้อมูลที่ผู้ดูแลกรอก — เทียบกับบัตรด้านบน</p>
          <InfoCompare caregiver={caregiver} />
        </div>
      </div>,
    );
  }

  if (row.missing) {
    return frame(
      <div role="alert" className="flex max-w-[380px] flex-col items-center gap-2.5 p-6 text-center">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]"><Icon name="hide_image" style={{ fontSize: 26 }} /></span>
        <p className="text-base font-bold text-[#111827]">ไม่มีไฟล์ให้ตรวจ</p>
        <p className="text-[13px] leading-5 text-[#4B5563]">ผู้ดูแลยังไม่ได้แนบ{item.name} — กด "ไม่ผ่าน" เพื่อขอให้ส่งใหม่</p>
      </div>,
      'bg-[#F3F4F6]',
    );
  }

  if (row.loadErr) {
    return frame(
      <div role="alert" className="flex max-w-[380px] flex-col items-center gap-2.5 p-6 text-center">
        <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#FEE2E2] text-[#B91C1C]"><Icon name="broken_image" style={{ fontSize: 26 }} /></span>
        <p className="text-base font-bold text-[#111827]">โหลดรูปไม่ได้</p>
        <p className="text-[13px] leading-5 text-[#4B5563]">{file?.name} — ไฟล์อาจเสียหายหรือลิงก์หมดอายุ ยังกด "ผ่าน" ไม่ได้จนกว่าจะเห็นเอกสาร</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border-[1.5px] border-[#059669] bg-white px-4 text-[13px] font-semibold text-[#047857] disabled:opacity-60"
          >
            <Icon name="refresh" style={{ fontSize: 16 }} />
            {retrying ? 'กำลังโหลด...' : 'ลองโหลดใหม่'}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#D1D5DB] bg-white px-3.5 text-[13px] font-semibold text-[#374151]">
            <Icon name="open_in_new" style={{ fontSize: 16 }} />
            เปิดไฟล์ต้นฉบับ
          </a>
        </div>
      </div>,
      'bg-[#F3F4F6]',
    );
  }

  return (
    <>
      {frame(
        <>
          {isPdfFile(file) ? (
            <iframe title={file?.name} src={url} className="h-full w-full bg-white" />
          ) : isImageFile(file) ? (
            <>
              <img key={url} src={url} alt={item.name} onError={onLoadError} className="h-full w-full object-contain" />
              <button
                type="button"
                aria-label="ดูเต็มจอ"
                onClick={() => setFullscreen(true)}
                className="absolute right-3 top-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-black/45 text-white hover:bg-black/60"
              >
                <Icon name="open_in_full" />
              </button>
            </>
          ) : (
            <a href={url} target="_blank" rel="noreferrer" className="text-base font-semibold text-white underline">เปิดเอกสาร</a>
          )}
          <span className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-24px)] truncate rounded-md bg-black/60 px-2.5 py-1 text-[12px] leading-4 text-white">
            {file?.name}
          </span>
        </>,
      )}
      <ImageModal isOpen={fullscreen} onClose={() => setFullscreen(false)} imageUrl={url} title={item.name} />
    </>
  );
}

function InfoCompare({ caregiver: c }: { caregiver: CaregiverDetail }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px] leading-5">
      <dt className="text-[#4B5563]">ชื่อ-นามสกุล</dt>
      <dd className="font-semibold text-[#111827]">{c.fullName || '-'}</dd>
      <dt className="text-[#4B5563]">เลขบัตร</dt>
      <dd className="font-semibold tabular-nums text-[#111827]">{formatIdCard(c.idCardNumber)}</dd>
      <dt className="text-[#4B5563]">วันเกิด</dt>
      <dd className="font-semibold text-[#111827]">{formatBirthDate(c.dateOfBirth)}</dd>
    </dl>
  );
}

function RemarkEditor({ row, checklist }: { row: ChecklistRow; checklist: KycChecklist }) {
  const id = row.item.id;
  const remark = row.result.remark;
  const parts = remark ? remark.split(CHIP_SEPARATOR) : [];
  const fieldId = `remark-${id}`;
  return (
    <div className="flex flex-col gap-2.5 px-3 pb-3.5 sm:pb-4 sm:pl-[42px] sm:pr-4">
      <label htmlFor={fieldId} className="text-[13px] font-semibold leading-[18px] text-[#991B1B]">
        เหตุผลที่ไม่ผ่าน <span aria-hidden="true">*</span>
        <span className="font-normal text-[#4B5563]"> · ผู้ดูแลจะเห็นข้อความนี้</span>
      </label>
      <div className="flex flex-wrap gap-1.5">
        {REJECT_CHIPS.map((chip) => {
          const sel = parts.includes(chip);
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={sel}
              onClick={() => checklist.toggleChip(id, chip)}
              className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border px-3 text-[12.5px] font-medium ${
                sel ? 'border-[#DC2626] bg-[#DC2626] text-white' : 'border-[#FCA5A5] bg-white text-[#991B1B] hover:bg-[#FEF2F2]'
              }`}
            >
              <Icon name={sel ? 'check' : 'add'} style={{ fontSize: 14 }} />
              {chip}
            </button>
          );
        })}
      </div>
      <textarea
        id={fieldId}
        rows={3}
        value={remark}
        maxLength={REMARK_MAX}
        onChange={(e) => checklist.setRemark(id, e.target.value)}
        onBlur={() => checklist.blur(id)}
        aria-invalid={row.remarkError || undefined}
        aria-describedby={`${fieldId}-msg`}
        placeholder="อธิบายสิ่งที่ต้องแก้ เช่น ถ่ายใหม่ให้เห็นเลขบัตรครบ 13 หลัก"
        className={`min-h-[76px] w-full resize-y rounded-lg bg-white px-3 py-2.5 text-[14px] leading-[22px] text-[#111827] outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#FEE2E2] ${
          row.remarkError ? 'border-[1.5px] border-[#DC2626]' : 'border border-[#D1D5DB]'
        }`}
        style={{ fontFamily: 'inherit' }}
      />
      <div id={`${fieldId}-msg`} className="flex items-start justify-between gap-2 text-[12px] leading-4">
        {row.remarkError ? (
          <span className="inline-flex items-start gap-1 font-semibold text-[#B91C1C]">
            <Icon name="warning" style={{ fontSize: 14 }} />
            ต้องระบุเหตุผล — เลือกจากด้านบนหรือพิมพ์เอง
          </span>
        ) : (
          <span className="text-[#4B5563]">จำเป็น · ไม่เกิน {REMARK_MAX} ตัวอักษร</span>
        )}
        <span className={`shrink-0 tabular-nums ${remark.length >= 180 ? 'text-[#B45309]' : 'text-[#4B5563]'}`}>
          {remark.length}/{REMARK_MAX}
        </span>
      </div>
    </div>
  );
}

function Row({ row, checklist, readOnly }: { row: ChecklistRow; checklist: KycChecklist; readOnly: boolean }) {
  const { item } = row;
  const editable = !readOnly && !row.locked;
  const passDisabled = !!row.passBlocked && !row.isPass;
  return (
    <div
      className={`rounded-xl border sm:rounded-none sm:border-0 sm:border-b sm:last:border-b-0 ${
        row.isFail ? 'border-[#FECACA] bg-[#FEF2F2] sm:border-[#EEF0F2]' : row.viewing ? 'border-[#9CA3AF] bg-[#F3F4F6] sm:border-[#EEF0F2]' : 'border-[#E5E7EB] bg-white sm:border-[#EEF0F2]'
      }`}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_44px] items-center gap-x-2.5 gap-y-3 p-3 sm:grid-cols-[minmax(0,1fr)_56px_184px] sm:gap-x-3 sm:gap-y-0">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-px inline-flex shrink-0"><StatusIcon row={row} /></span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <button type="button" tabIndex={-1} onClick={() => checklist.view(item.id)} className="cursor-pointer text-left text-[14px] font-semibold leading-5 text-[#111827]">
                {item.name}
              </button>
              {row.viewing && (
                <span className="inline-flex h-5 items-center gap-0.5 rounded-full bg-[#064E3B] px-[7px] text-[11px] font-semibold text-white">
                  <Icon name="visibility" style={{ fontSize: 12 }} />กำลังดู
                </span>
              )}
            </div>
            <span className="text-[12px] leading-4 text-[#4B5563]">{item.meta}</span>
            {row.passBlocked && !readOnly && !row.locked && (
              <span className="inline-flex items-center gap-1 text-[12px] font-semibold leading-4 text-[#B91C1C]">
                <Icon name="warning" style={{ fontSize: 13 }} />
                {row.passBlocked}
              </span>
            )}
            {row.locked && !readOnly && (
              <span className="inline-flex items-center gap-1 text-[12px] leading-4 text-[#4B5563]">
                <Icon name="lock" style={{ fontSize: 13 }} />
                ตรวจใบนี้ในระบบแล้ว · แก้ไขไม่ได้
              </span>
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            aria-label={`ดู ${item.name}`}
            aria-pressed={row.viewing}
            onClick={() => checklist.view(item.id)}
            className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border sm:h-10 sm:w-10 ${
              row.viewing ? 'border-[#064E3B] bg-[#064E3B] text-white' : 'border-[#D1D5DB] bg-white text-[#047857] hover:bg-[#ECFDF5]'
            }`}
          >
            <Icon name="visibility" style={{ fontSize: 18 }} />
          </button>
        </div>
        <div className="col-span-2 min-w-0 sm:col-span-1">
          {editable ? (
            <div role="group" aria-label={`ผลตรวจ ${item.name}`} className="flex w-full overflow-hidden rounded-lg border border-[#D1D5DB] bg-white">
              <button
                type="button"
                aria-pressed={row.isPass}
                disabled={passDisabled}
                title={row.passBlocked ?? 'ผ่าน'}
                onClick={() => checklist.pass(item.id)}
                className={`inline-flex h-11 flex-1 items-center justify-center gap-1.5 text-[13px] font-semibold sm:h-10 ${
                  row.isPass ? 'bg-[#047857] text-white' : 'bg-white text-[#374151] hover:bg-[#ECFDF5]'
                } ${passDisabled ? 'cursor-not-allowed opacity-45 hover:bg-white' : 'cursor-pointer'}`}
              >
                <Icon name="check" style={{ fontSize: 15 }} />ผ่าน
              </button>
              <span aria-hidden="true" className="w-px bg-[#D1D5DB]" />
              <button
                type="button"
                aria-pressed={row.isFail}
                onClick={() => checklist.fail(item.id)}
                className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 text-[13px] font-semibold sm:h-10 ${
                  row.isFail ? 'bg-[#DC2626] text-white' : 'bg-white text-[#374151] hover:bg-[#FEF2F2]'
                }`}
              >
                <Icon name="close" style={{ fontSize: 15 }} />ไม่ผ่าน
              </button>
            </div>
          ) : (
            <ResultPill row={row} />
          )}
        </div>
      </div>

      {editable && row.isFail && <RemarkEditor row={row} checklist={checklist} />}
      {!editable && row.isFail && row.result.remark && (
        <div className="px-3 pb-3.5 sm:pb-4 sm:pl-[42px] sm:pr-4">
          <p className="rounded-lg border border-[#FECACA] bg-white px-3 py-2.5 text-[13px] leading-5 text-[#7F1D1D]">
            <span className="font-semibold">เหตุผลที่ส่งให้ผู้ดูแล: </span>
            {row.result.remark}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * การ์ด "ตรวจเอกสาร" (ดีไซน์ Main.dc.html) — ตัวอย่างเอกสาร + รายละเอียดของรายการที่กำลังดู + รายการผลตรวจ
 */
export default function KycChecklistCard({
  checklist,
  detail,
  readOnly,
  onRetry,
}: {
  checklist: KycChecklist;
  detail: AdminKycDetail;
  readOnly: boolean;
  onRetry: () => Promise<unknown>;
}) {
  const [retrying, setRetrying] = useState(false);
  const { viewRow, rows, total } = checklist;

  if (!viewRow) return null;

  const retry = async () => {
    setRetrying(true);
    try {
      await onRetry();
      checklist.setLoadErr(viewRow.item.id, false);
    } finally {
      setRetrying(false);
    }
  };

  const eligible = checklist.passAllEligible.length;

  return (
    <aside aria-label="ตรวจเอกสาร" className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:px-6 sm:py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[12px] font-medium leading-4 text-[#4B5563]">กำลังดู · {checklist.viewIndex + 1} / {total}</span>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold leading-[22px] text-[#111827]">{viewRow.item.name}</h3>
            <SmallChip row={viewRow} />
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" aria-label="เอกสารก่อนหน้า" onClick={() => checklist.step(-1)} className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#374151] hover:bg-gray-50">
            <Icon name="chevron_left" />
          </button>
          <button type="button" aria-label="เอกสารถัดไป" onClick={() => checklist.step(1)} className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-[#D1D5DB] bg-white text-[#374151] hover:bg-gray-50">
            <Icon name="chevron_right" />
          </button>
        </div>
      </div>

      <Preview
        key={viewRow.item.id}
        row={viewRow}
        caregiver={detail.caregiver}
        onLoadError={() => checklist.setLoadErr(viewRow.item.id, true)}
        onRetry={() => void retry()}
        retrying={retrying}
      />

      <KycItemDetail row={viewRow} detail={detail} />

      <div className="mt-6 border-t border-[#F3F4F6] pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-base font-bold leading-5 text-[#064E3B]">ตรวจเอกสาร</h3>
            <p aria-live="polite" className="text-[13px] leading-5 text-[#374151]">
              <span className="font-semibold">{readOnly ? `ผ่าน ${checklist.passCount}/${total}` : `ตรวจแล้ว ${checklist.checkedCount}/${total}`}</span>
              {checklist.failRows.length > 0 && (
                <>
                  <span> · </span>
                  <span className="font-semibold text-[#B91C1C]">ไม่ผ่าน {checklist.failRows.length}</span>
                </>
              )}
            </p>
          </div>
          {readOnly ? (
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F3F4F6] px-2.5 text-[12px] font-semibold text-[#374151]">
              <Icon name="lock" style={{ fontSize: 14 }} />
              ผลตรวจครั้งล่าสุด · อ่านอย่างเดียว
            </span>
          ) : (
            <button
              type="button"
              onClick={checklist.passAll}
              disabled={eligible === 0}
              title="ตั้งเป็น “ผ่าน” เฉพาะรายการที่ยังไม่ได้ตรวจ — ไม่เปลี่ยนรายการที่ไม่ผ่าน"
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] bg-white px-3.5 text-[13px] font-semibold ${
                eligible ? 'cursor-pointer border-[#059669] text-[#047857] hover:bg-[#ECFDF5]' : 'cursor-not-allowed border-[#E5E7EB] text-[#9CA3AF]'
              }`}
            >
              <Icon name="done_all" style={{ fontSize: 16 }} />
              {checklist.checkedCount === 0 ? 'ผ่านทั้งหมด' : 'ผ่านที่เหลือทั้งหมด'}
            </button>
          )}
        </div>

        <div aria-hidden="true" className="mt-3 grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}>
          {rows.map((r) => (
            <span key={r.item.id} className={`h-1.5 rounded-[3px] ${r.isPass ? 'bg-[#059669]' : r.isFail ? 'bg-[#DC2626]' : 'bg-[#E5E7EB]'}`} />
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:gap-0 sm:overflow-hidden sm:rounded-[10px] sm:border sm:border-[#E5E7EB]">
          <div className="hidden grid-cols-[minmax(0,1fr)_56px_184px] gap-x-3 border-b border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2.5 text-[12px] font-semibold leading-4 text-[#4B5563] sm:grid">
            <span className="pl-[30px]">เอกสาร</span>
            <span className="text-center">ดู</span>
            <span>ผลตรวจ</span>
          </div>
          {rows.map((row) => (
            <Row key={row.item.id} row={row} checklist={checklist} readOnly={readOnly} />
          ))}
        </div>
      </div>
    </aside>
  );
}
