export type PayoutStatus = 'scheduled' | 'processing' | 'paid' | 'failed' | 'cancelled';

export type PayoutStatusMeta = {
  label: string;
  bg: string;
  text: string;
  dot: string;
};

const PAYOUT_STATUS_META: Record<PayoutStatus, PayoutStatusMeta> = {
  scheduled: {
    label: 'รอโอนเงิน',
    bg: 'bg-[#FFF7E6]',
    text: 'text-[#B45309]',
    dot: 'bg-[#F59E0B]',
  },
  processing: {
    label: 'กำลังโอนเงิน',
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#1D4ED8]',
    dot: 'bg-[#3B82F6]',
  },
  paid: {
    label: 'โอนเงินแล้ว',
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#047857]',
    dot: 'bg-[#10B981]',
  },
  failed: {
    label: 'โอนไม่สำเร็จ',
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    dot: 'bg-[#EF4444]',
  },
  cancelled: {
    label: 'ยกเลิกรายการโอน',
    bg: 'bg-[#F3F4F6]',
    text: 'text-[#374151]',
    dot: 'bg-[#6B7280]',
  },
};

const PREPARING_META: PayoutStatusMeta = {
  label: 'กำลังเตรียมรายการโอน',
  bg: 'bg-[#F3F4F6]',
  text: 'text-[#575859]',
  dot: 'bg-[#9CA3AF]',
};

export function getPayoutStatusMeta(status?: string | null): PayoutStatusMeta {
  if (status && status in PAYOUT_STATUS_META) {
    return PAYOUT_STATUS_META[status as PayoutStatus];
  }
  return PREPARING_META;
}
