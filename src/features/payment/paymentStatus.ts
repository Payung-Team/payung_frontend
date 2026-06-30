export type PaymentStatus =
  | 'pending'
  | 'held'
  | 'captured'
  | 'transferred'
  | 'voided'
  | 'refunded'
  | 'partially_refunded'
  | 'failed'
  | 'expired';

export interface PaymentStatusConfig {
  label: string;
  dot: string;
  bg: string;
  text: string;
  icon: string;
  iconColor: string;
}

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, PaymentStatusConfig> = {
  pending:            { label: 'รอดำเนินการ',          dot: '#F59E0B', bg: '#FFFBEB', text: '#B45309', icon: 'schedule',         iconColor: '#F59E0B' },
  held:               { label: 'กันวงเงินแล้ว (Held)', dot: '#F59E0B', bg: '#FFFBEB', text: '#D97706', icon: 'lock',             iconColor: '#D97706' },
  captured:           { label: 'ตัดเงินแล้ว',          dot: '#10B981', bg: '#ECFDF5', text: '#047857', icon: 'check_circle',     iconColor: '#10B981' },
  transferred:        { label: 'โอนให้ผู้ดูแลแล้ว',   dot: '#6366F1', bg: '#EEF2FF', text: '#4338CA', icon: 'payments',         iconColor: '#6366F1' },
  voided:             { label: 'ยกเลิกการกันวงเงิน',  dot: '#9CA3AF', bg: '#F9FAFB', text: '#6B7280', icon: 'cancel',           iconColor: '#9CA3AF' },
  refunded:           { label: 'คืนเงินแล้ว',          dot: '#0EA5E9', bg: '#F0F9FF', text: '#0369A1', icon: 'undo',             iconColor: '#0EA5E9' },
  partially_refunded: { label: 'คืนเงินบางส่วน',      dot: '#F97316', bg: '#FFF7ED', text: '#C2410C', icon: 'currency_exchange', iconColor: '#F97316' },
  failed:             { label: 'ชำระเงินไม่สำเร็จ',   dot: '#EF4444', bg: '#FEF2F2', text: '#991B1B', icon: 'error',            iconColor: '#EF4444' },
  expired:            { label: 'หมดอายุ',              dot: '#6B7280', bg: '#F9FAFB', text: '#374151', icon: 'timer_off',        iconColor: '#6B7280' },
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card:      'บัตรเครดิต/เดบิต',
  promptpay:        'พร้อมเพย์',
  internet_banking: 'อินเทอร์เน็ตแบงก์กิ้ง',
  truemoney:        'ทรูมันนี่วอลเล็ต',
  rabbit_linepay:   'LINE Pay',
  mobile_banking:   'โมบายแบงก์กิ้ง',
};

export function isPaymentStatus(value: string): value is PaymentStatus {
  return value in PAYMENT_STATUS_CONFIG;
}
