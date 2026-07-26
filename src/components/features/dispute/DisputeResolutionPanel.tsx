import { useState } from 'react';
import Icon from '../../ui/Icon';
import DisputeCard, { DisputeField } from './DisputeCard';
import DisputeStatusBadge from './DisputeStatusBadge';
import { cn } from '../../../lib/utils';
import { computeSla, formatTHB, formatThaiDate, type ResolutionKind } from './disputeMeta';
import type { DisputeDetail } from './disputeDetailMapper';

export interface ResolutionPayload {
  kind: ResolutionKind;
  amount: number;
  reason: string;
}

interface DisputeResolutionPanelProps {
  readonly dispute: DisputeDetail;
  readonly isSubmitting?: boolean;
  readonly onSubmit: (payload: ResolutionPayload) => void;
}

const OPTIONS: { kind: ResolutionKind; title: string; description: string }[] = [
  { kind: 'full_refund', title: 'คืนเงินเต็มจำนวน', description: 'คืนเงินทั้งหมดที่ลูกค้าชำระ' },
  { kind: 'partial_refund', title: 'คืนเงินบางส่วน', description: 'คืนเงินเพียงบางส่วนของยอดที่ชำระ' },
  { kind: 'no_refund', title: 'ปิดเรื่องโดยไม่คืนเงิน', description: 'ไม่คืนเงิน ยืนยันว่าผู้ดูแลทำถูกต้อง' },
];

const PERCENTS = [25, 50, 75];
const REASON_MAX_LENGTH = 500;

// PYG-320/321 — ฟอร์มดำเนินการแก้ไข (mock: validate ครบแต่ยังไม่ยิง mutation)
export default function DisputeResolutionPanel({ dispute, isSubmitting = false, onSubmit }: DisputeResolutionPanelProps) {
  const [kind, setKind] = useState<ResolutionKind | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [reason, setReason] = useState('');

  // resolve ได้เฉพาะ dispute ที่ยัง flagged (backend throw ถ้าไม่ใช่) → ปิดฟอร์มทั้งใบ
  const isResolvable = dispute.status === 'flagged';

  const sla = computeSla(dispute.slaDueAt, dispute.status);
  const parsedAmount = Number(partialAmount);
  const partialValid = Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= dispute.amount;
  const canSubmit =
    isResolvable && kind !== null && reason.trim() !== '' && (kind !== 'partial_refund' || partialValid);
  const partialActive = kind === 'partial_refund';
  const partialPercent = partialValid ? Math.round((parsedAmount / dispute.amount) * 100) : null;

  const resolvedAmount = kind === 'full_refund' ? dispute.amount : kind === 'partial_refund' ? parsedAmount : 0;

  const handleSubmit = () => {
    if (!kind || !canSubmit || isSubmitting) return;
    onSubmit({ kind, amount: resolvedAmount, reason: reason.trim() });
  };

  return (
    <DisputeCard title="ดำเนินการแก้ไข (Resolution)">
      <dl className="grid grid-cols-2 gap-5 border-b border-[#F0F1F3] pb-5">
        <DisputeField label="Dispute ID">
          <span className="font-[Inter]">{dispute.displayId}</span>
        </DisputeField>
        <DisputeField label="แจ้งเมื่อ">
          <span className="font-[Inter]">{formatThaiDate(dispute.filedAt)}</span>
        </DisputeField>
        <DisputeField label="SLA คงเหลือ">
          <span className={sla.urgent ? 'text-[#DC2626]' : 'text-[#047857]'}>{sla.text}</span>
        </DisputeField>
        <DisputeField label="สถานะ">
          <DisputeStatusBadge status={dispute.status} />
        </DisputeField>
      </dl>

      {!isResolvable ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg bg-[#ECFDF5] px-4 py-3 text-sm text-[#047857]">
          <Icon name="check_circle" style={{ fontSize: 18 }} />
          คำร้องนี้ปิดเรื่องแล้ว
        </div>
      ) : (
        <>
      <fieldset className="mt-5" disabled={isSubmitting}>

        <legend className="text-xs font-bold text-[#575859]">
          เลือกวิธีแก้ไข <span className="text-[#DC2626]">*</span>
        </legend>

        <div className="mt-3 flex flex-col gap-3">
          {OPTIONS.map((option) => {
            const selected = kind === option.kind;

            return (
              <label
                key={option.kind}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition-colors',
                  selected ? 'border-[#059669] bg-[#F0FDF7]' : 'border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#C6C8CB]',
                )}
              >
                <input
                  type="radio"
                  name="resolution-kind"
                  checked={selected}
                  onChange={() => setKind(option.kind)}
                  className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#059669]"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1A1A1A]">{option.title}</p>
                      <p className="mt-0.5 text-xs text-[#8A8C8E]">{option.description}</p>
                    </div>

                    {option.kind === 'full_refund' && (
                      <span className="font-[Inter] text-sm font-bold text-[#8A8C8E]">{formatTHB(dispute.amount)}</span>
                    )}

                    {option.kind === 'partial_refund' && (
                      <div className="relative w-[124px] shrink-0">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-[#8A8C8E]">
                          ฿
                        </span>
                        <input
                          id="partialAmt"
                          type="number"
                          min={1}
                          max={dispute.amount}
                          value={partialAmount}
                          onChange={(e) => setPartialAmount(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'h-10 w-full rounded-lg border bg-white pl-7 pr-3 text-sm text-[#1A1A1A] outline-none',
                            partialActive ? 'border-[#F59E0B]' : 'border-[#E5E7EB] focus:border-[#059669]',
                          )}
                          aria-label="ยอดคืนเงินบางส่วน"
                        />
                      </div>
                    )}
                  </div>

                  {option.kind === 'partial_refund' && (
                    <>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {PERCENTS.map((percent) => (
                          <button
                            key={percent}
                            type="button"
                            onClick={() => {
                              setKind('partial_refund');
                              setPartialAmount(String(Math.round((dispute.amount * percent) / 100)));
                            }}
                            className={cn(
                              'h-7 cursor-pointer rounded-md border px-3 text-xs font-bold transition-colors',
                              partialActive && partialPercent === percent
                                ? 'border-[#F59E0B] bg-[#FFFBEB] text-[#F59E0B]'
                                : 'border-[#E5E7EB] bg-white text-[#575859] hover:border-[#059669] hover:text-[#059669]',
                            )}
                          >
                            {percent}%
                          </button>
                        ))}

                        {partialActive && partialPercent !== null && (
                          <span className="font-[Inter] text-[11px] text-[#8A8C8E]">
                            คิดเป็น {partialPercent}% ของยอดที่เกี่ยวข้อง
                          </span>
                        )}
                      </div>

                      {selected && partialAmount !== '' && !partialValid && (
                        <p className="mt-2 text-xs text-[#DC2626]">
                          ระบุยอดระหว่าง 1 ถึง {formatTHB(dispute.amount)}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="resReason" className="text-xs font-bold text-[#575859]">
            เหตุผล / หมายเหตุ <span className="text-[#DC2626]">*</span>
          </label>
          <span
            className={cn(
              'font-[Inter] text-[11px]',
              reason.length >= REASON_MAX_LENGTH ? 'text-[#DC2626]' : 'text-[#C6C8CB]',
            )}
          >
            {reason.length}/{REASON_MAX_LENGTH}
          </span>
        </div>
        <textarea
          id="resReason"
          value={reason}
          onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX_LENGTH))}
          maxLength={REASON_MAX_LENGTH}
          rows={3}
          disabled={isSubmitting}
          className="mt-2 w-full resize-y rounded-lg border border-[#E5E7EB] bg-white p-3 text-sm text-[#1A1A1A] outline-none focus:border-[#059669] disabled:cursor-not-allowed disabled:bg-[#F9FAFB]"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className={cn(
          'mt-5 h-11 w-full rounded-xl text-sm font-bold text-white transition-colors',
          canSubmit && !isSubmitting ? 'cursor-pointer bg-[#52B69A] hover:bg-[#3F9C83]' : 'cursor-not-allowed bg-[#C6C8CB]',
        )}
      >
        {isSubmitting ? 'กำลังดำเนินการ...' : 'ยืนยันการดำเนินการ'}
      </button>
        </>
      )}
    </DisputeCard>
  );
}
