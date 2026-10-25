import { useState } from 'react';
import Icon from '../../ui/Icon';
import { cn } from '../../../lib/utils';
import { FILED_BY_META, formatTHB, type ResolutionKind } from './disputeMeta';
import type { DisputeDetail, DisputePartyInfo } from './disputeDetailMapper';
import type { ResolutionPayload } from './DisputeResolutionPanel';

interface DisputeResolveConfirmModalProps {
  readonly dispute: DisputeDetail;
  readonly payload: ResolutionPayload;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

// TODO: แทนที่ด้วยค่าธรรมเนียมจริงจาก Omise/ระบบบัญชีเมื่อ backend พร้อม (PYG-320)
const MOCK_PLATFORM_FEE_RATE = 0.15;

const KIND_CONFIG: Record<ResolutionKind, {
  title: string;
  recipientLabel: string;
  resultLabel: string;
  amountClass: string;
  confirmLabel: string;
  confirmClass: string;
}> = {
  full_refund: {
    title: 'ยืนยันคืนเงินเต็มจำนวน',
    recipientLabel: 'คืนเงินให้กับ',
    resultLabel: 'ยอดที่จะคืน',
    amountClass: 'text-[#059669]',
    confirmLabel: 'ยืนยันคืนเงิน',
    confirmClass: 'bg-[#059669] hover:bg-[#047857]',
  },
  partial_refund: {
    title: 'ยืนยันคืนเงินบางส่วน',
    recipientLabel: 'คืนเงินให้กับ',
    resultLabel: 'ยอดที่จะคืน',
    amountClass: 'text-[#C2410C]',
    confirmLabel: 'ยืนยันคืนเงิน',
    confirmClass: 'bg-[#C2410C] hover:bg-[#9A3412]',
  },
  no_refund: {
    title: 'ยืนยันปิดเรื่องโดยไม่คืนเงิน',
    recipientLabel: 'จ่ายเต็มจำนวนให้',
    resultLabel: 'ผลการดำเนินการ',
    amountClass: 'text-[#575859]',
    confirmLabel: 'ยืนยันปิดเรื่อง',
    confirmClass: 'bg-[#575859] hover:bg-[#3F4041]',
  },
};

function getPartyByRole(dispute: DisputeDetail, role: DisputePartyInfo['role']): DisputePartyInfo {
  return dispute.filer.role === role ? dispute.filer : dispute.respondent;
}

// PYG-320 — โมดัลยืนยันก่อนยิง resolveDispute จริง (คืนเงินเต็ม/บางส่วน/ไม่คืนเงิน)
export default function DisputeResolveConfirmModal({ dispute, payload, onCancel, onConfirm }: DisputeResolveConfirmModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const config = KIND_CONFIG[payload.kind];
  const isNoRefund = payload.kind === 'no_refund';

  const recipient = getPartyByRole(dispute, isNoRefund ? 'caregiver' : 'customer');
  const recipientMeta = FILED_BY_META[recipient.role];

  const holdRemaining = Math.max(dispute.amount - payload.amount, 0);
  const platformFee = isNoRefund ? Math.round(dispute.amount * MOCK_PLATFORM_FEE_RATE) : 0;
  const caregiverNet = isNoRefund ? dispute.amount - platformFee : holdRemaining;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(14,25,20,0.5)] px-4" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
      <div className="w-full max-w-[560px] rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#F0F1F3] px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-[#1A1A1A]">{config.title}</h2>
            <p className="mt-1 font-[Inter] text-xs text-[#8A8C8E]">{dispute.displayId}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="ปิด"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#8A8C8E] hover:bg-[#F6FAF9]"
          >
            <Icon name="close" style={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#8A8C8E]">{config.recipientLabel}</p>
              <div className="mt-3 flex items-center gap-3">
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white', recipientMeta.avatarClass)}>
                  {recipient.name.charAt(0)}
                </span>
                <div>
                  <p className="text-[15px] font-bold text-[#1A1A1A]">{recipient.name}</p>
                  <p className="text-[11px] text-[#8A8C8E]">{recipientMeta.label}</p>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-[#8A8C8E]">{config.resultLabel}</p>
              <p className={cn('mt-2 font-[Inter] text-[30px] font-bold leading-none', config.amountClass)}>
                {isNoRefund ? 'ไม่คืนเงิน' : formatTHB(payload.amount)}
              </p>
              {!isNoRefund && (
                <p className="mt-2 font-[Inter] text-[11px] text-[#8A8C8E]">จากยอดที่เกี่ยวข้อง {formatTHB(dispute.amount)}</p>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#F0F1F3] bg-[#F9FAFB] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A8C8E]">รายละเอียด</p>
            <dl className="mt-3 flex flex-col gap-3 text-[13px]">
              {isNoRefund ? (
                <div className="flex items-center justify-between">
                  <dt className="text-[#8A8C8E]">การเงิน</dt>
                  <dd className="font-[Inter] font-bold text-[#575859]">capture ยอดเต็มให้ผู้ดูแล</dd>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#8A8C8E]">ช่องทาง</dt>
                    <dd className="font-[Inter] font-bold text-[#575859]">Omise refund (charge เดิม)</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#8A8C8E]">ค่าธรรมเนียมคืนเงิน (Omise)</dt>
                    <dd className="font-[Inter] font-bold text-[#575859]">฿0 · แพลตฟอร์มรับผิดชอบ</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#8A8C8E]">ยอดคงเหลือใน Hold</dt>
                    <dd className="font-[Inter] font-bold text-[#575859]">{formatTHB(holdRemaining)}</dd>
                  </div>
                </>
              )}
              {isNoRefund && (
                <div className="flex items-center justify-between">
                  <dt className="text-[#8A8C8E]">หักค่าบริการ+ค่าธรรมเนียม</dt>
                  <dd className="font-[Inter] font-bold text-[#575859]">-{formatTHB(platformFee)}</dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-[#8A8C8E]">ผู้ดูแลจะได้รับสุทธิ</dt>
                <dd className="font-[Inter] font-bold text-[#1A1A1A]">{formatTHB(caregiverNet)}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 rounded-xl border border-[#F0F1F3] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#8A8C8E]">เหตุผลการดำเนินการ</p>
            <p className="mt-2 text-sm text-[#1A1A1A]">{payload.reason}</p>
          </div>
        </div>

        <div className="rounded-b-2xl border-t border-[#F0F1F3] bg-[#F6FAF9] px-5 py-4">
          <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-[#575859]">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded-[5px] border-[#C6C8CB] accent-[#059669]"
            />
            ย้อนกลับไม่ได้ — ยืนยันแล้วระบบจะดำเนินการทันทีและไม่สามารถแก้ไขได้
          </label>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="h-11 flex-1 cursor-pointer rounded-xl border border-[#E0E2E5] text-sm font-bold text-[#575859] hover:bg-white"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!acknowledged}
              className={cn(
                'h-11 flex-1 rounded-xl text-sm font-bold text-white transition-opacity',
                acknowledged ? cn('cursor-pointer', config.confirmClass) : cn('cursor-not-allowed opacity-40', config.confirmClass),
              )}
            >
              {config.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
