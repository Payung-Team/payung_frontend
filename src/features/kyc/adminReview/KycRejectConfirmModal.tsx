import Icon from '../../../components/ui/Icon';
import { REMARK_MAX } from './kycReviewItems';
import type { KycChecklist } from './useKycChecklist';

/**
 * ยืนยันการปฏิเสธ KYC (ดีไซน์ board 5) — แสดงเฉพาะรายการที่ไม่ผ่าน แก้เหตุผลได้ก่อนส่ง
 * เหตุผลเขียนกลับเข้า checklist โดยตรง ปิด modal แล้วข้อความยังอยู่
 */
export default function KycRejectConfirmModal({
  isOpen,
  isLoading,
  caregiverName,
  caregiverNumber,
  checklist,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  isLoading: boolean;
  caregiverName: string;
  caregiverNumber: string;
  checklist: KycChecklist;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;
  const { failRows, pendRows, emptyRows } = checklist;
  const confirmDisabled = isLoading || failRows.length === 0 || emptyRows.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(17,24,39,0.5)] px-4 pb-6 pt-20 sm:pt-[12vh]">
      <div className="fixed inset-0 -z-10" onClick={isLoading ? undefined : onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-kyc-title"
        className="w-full max-w-[600px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#F3F4F6] px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id="reject-kyc-title" className="text-xl font-bold leading-7 text-[#111827]">ยืนยันการปฏิเสธ KYC</h2>
            <p className="mt-0.5 text-[13px] leading-5 text-[#4B5563]">
              {caregiverName || '-'} · {caregiverNumber} · ไม่ผ่าน {failRows.length} รายการ
            </p>
          </div>
          <button
            type="button"
            aria-label="ปิด"
            onClick={onClose}
            disabled={isLoading}
            className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-[#F3F4F6] text-[#374151] hover:bg-gray-200"
          >
            <Icon name="close" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-6 pb-5 pt-4">
          <p className="flex items-start gap-2 rounded-lg bg-[#EFF6FF] px-3 py-2.5 text-[13px] font-medium leading-5 text-[#1E40AF]">
            <Icon name="info" style={{ fontSize: 17 }} />
            ผู้ดูแลจะเห็นรายการนี้และแก้ไขได้เฉพาะส่วนที่ไม่ผ่าน
          </p>

          {failRows.map((row) => {
            const id = `m-remark-${row.item.id}`;
            const empty = row.emptyRemark;
            const readOnly = row.locked;
            return (
              <div key={row.item.id} className="flex flex-col gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon name="cancel" color="#DC2626" style={{ fontSize: 18 }} />
                  <span className="text-[14px] font-semibold leading-5 text-[#111827]">{row.item.name}</span>
                  <span className="text-[12px] text-[#4B5563]">{row.item.meta}</span>
                </div>
                {readOnly ? (
                  <p className="rounded-lg border border-[#FECACA] bg-white px-3 py-2 text-[13px] leading-5 text-[#7F1D1D]">
                    <span className="font-semibold">ปฏิเสธในระบบแล้ว: </span>
                    {row.result.remark || '-'}
                  </p>
                ) : (
                  <>
                    <label htmlFor={id} className="text-[12.5px] font-semibold leading-4 text-[#991B1B]">
                      เหตุผลที่ส่งให้ผู้ดูแล (แก้ไขได้)
                    </label>
                    <textarea
                      id={id}
                      rows={2}
                      value={row.result.remark}
                      maxLength={REMARK_MAX}
                      onChange={(e) => checklist.setRemark(row.item.id, e.target.value)}
                      onBlur={() => checklist.blur(row.item.id)}
                      aria-invalid={empty || undefined}
                      className={`min-h-16 w-full resize-y rounded-lg bg-white px-3 py-2 text-[14px] leading-[22px] text-[#111827] outline-none focus:ring-2 focus:ring-[#FEE2E2] ${
                        empty ? 'border-[1.5px] border-[#DC2626]' : 'border border-[#D1D5DB]'
                      }`}
                      style={{ fontFamily: 'inherit' }}
                    />
                    <div className="flex justify-between gap-2 text-[12px] leading-4">
                      {empty ? <span className="font-semibold text-[#B91C1C]">ต้องระบุเหตุผล</span> : <span />}
                      <span className={`tabular-nums ${row.result.remark.length >= 180 ? 'text-[#B45309]' : 'text-[#4B5563]'}`}>
                        {row.result.remark.length}/{REMARK_MAX}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {pendRows.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg bg-[#FFFBEB] px-3 py-2.5 text-[13px] leading-5 text-[#92400E]">
              <Icon name="pending" style={{ fontSize: 16 }} />
              ยังไม่ได้ตรวจ {pendRows.length} รายการ ({pendRows.map((r) => r.item.name).join(', ')}) — จะตรวจในรอบที่ผู้ดูแลส่งใหม่
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-3 border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="h-10 cursor-pointer rounded-lg border border-[#D1D5DB] bg-white px-[18px] text-[14px] font-semibold text-[#374151] hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="h-10 cursor-pointer rounded-lg bg-[#DC2626] px-[18px] text-[14px] font-semibold text-white hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#6B7280]"
          >
            {isLoading ? 'กำลังบันทึก...' : `ยืนยันปฏิเสธ · ${failRows.length} รายการ`}
          </button>
        </div>
      </div>
    </div>
  );
}
