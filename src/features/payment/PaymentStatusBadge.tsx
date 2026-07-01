import { PAYMENT_STATUS_CONFIG, isPaymentStatus } from './paymentStatus';
import type { PaymentStatus } from './paymentStatus';

interface PaymentStatusBadgeProps {
  status: string;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const cfg = isPaymentStatus(status)
    ? PAYMENT_STATUS_CONFIG[status as PaymentStatus]
    : { label: status, dot: '#9CA3AF', bg: '#F9FAFB', text: '#6B7280' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
        height: 24,
        background: cfg.bg,
        borderRadius: 9999,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          background: cfg.dot,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "'Bai Jamjuree', sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: cfg.text,
          lineHeight: '18px',
        }}
      >
        {cfg.label}
      </span>
    </span>
  );
}
