import { PaymentStatusBadge } from './PaymentStatusBadge';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_CONFIG, isPaymentStatus } from './paymentStatus';

export interface PaymentInfo {
  id: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  failureMessage?: string | null;
  updatedAt: string;
}

interface PaymentInfoSectionProps {
  payment: PaymentInfo;
  onRetry?: () => void;
}

function formatThaiDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, color: '#8A8C8E', lineHeight: '20px', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: '#1A1A1A', lineHeight: '20px', textAlign: 'right' }}>
        {value}
      </span>
    </div>
  );
}

export function PaymentInfoSection({ payment, onRetry }: PaymentInfoSectionProps) {
  const { paymentStatus, amount, currency, paymentMethod, failureMessage, updatedAt } = payment;

  const isFailed = paymentStatus === 'failed';
  const isExpired = paymentStatus === 'expired';
  const showAlert = isFailed || isExpired;

  const alertCfg = isFailed
    ? { bg: '#FEF2F2', border: '#FECACA', iconColor: '#DC2626', textColor: '#991B1B', icon: 'error', message: failureMessage ?? 'ชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
    : { bg: '#FFFBEB', border: '#FDE68A', iconColor: '#D97706', textColor: '#B45309', icon: 'timer_off', message: 'การกันวงเงินหมดอายุแล้ว' };

  const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod;
  const currencyUpper = (currency ?? 'THB').toUpperCase();
  const amountLabel = `฿${amount.toLocaleString()} ${currencyUpper}`;
  const dateLabel = updatedAt ? formatThaiDate(updatedAt) : '—';

  const statusCfg = isPaymentStatus(paymentStatus) ? PAYMENT_STATUS_CONFIG[paymentStatus] : null;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '0.8px solid #E0E2E5',
        boxShadow: '0px 1px 4px rgba(0,0,0,0.03)',
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {statusCfg && (
            <span className="material-icons" style={{ fontSize: 18, color: statusCfg.iconColor }}>
              {statusCfg.icon}
            </span>
          )}
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 700, color: '#8A8C8E', margin: 0, lineHeight: '20px' }}>
            ข้อมูลการชำระเงิน
          </p>
        </div>
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      {/* Divider */}
      <div style={{ height: '0.8px', background: '#F0F1F3', marginBottom: 14 }} />

      {/* Rows */}
      <InfoRow label="จำนวนเงิน" value={amountLabel} />
      <InfoRow label="วิธีชำระเงิน" value={methodLabel} />
      <InfoRow label="อัปเดตล่าสุด" value={dateLabel} />

      {/* Alert banner */}
      {showAlert && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '10px 12px',
            background: alertCfg.bg,
            border: `0.8px solid ${alertCfg.border}`,
            borderRadius: 10,
            marginTop: 12,
          }}
        >
          <span className="material-icons" style={{ fontSize: 18, color: alertCfg.iconColor, flexShrink: 0, marginTop: 1 }}>
            {alertCfg.icon}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: alertCfg.textColor, margin: 0, lineHeight: '20px' }}>
              {alertCfg.message}
            </p>
            {isFailed && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  marginTop: 8,
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: '#DC2626',
                  fontFamily: "'Bai Jamjuree', sans-serif",
                  fontWeight: 700,
                  fontSize: 11,
                  lineHeight: '16px',
                  color: '#FFFFFF',
                }}
              >
                ลองชำระเงินใหม่
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
