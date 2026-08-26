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

interface ColProps {
  label: string;
  value: string;
  valueColor: string;
}

function Col({ label, value, valueColor }: ColProps) {
  return (
    <div>
      <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 11, fontWeight: 700, color: '#8A8C8E', lineHeight: '17px', margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 700, color: valueColor, lineHeight: '20px', margin: '7px 0 0' }}>
        {value}
      </p>
    </div>
  );
}

export function PaymentInfoSection({ payment, onRetry }: PaymentInfoSectionProps) {
  const { paymentStatus, amount, paymentMethod, failureMessage, updatedAt } = payment;

  const isFailed = paymentStatus === 'failed';
  const isExpired = paymentStatus === 'expired';
  const showAlert = isFailed || isExpired;

  const alertCfg = isFailed
    ? { bg: '#FEF2F2', border: '#FECACA', iconColor: '#DC2626', textColor: '#991B1B', icon: 'error', message: failureMessage ?? 'ชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' }
    : { bg: '#F9FAFB', border: '#E5E7EB', iconColor: '#9CA3AF', textColor: '#6B7280', icon: 'timer_off', message: 'การชำระของคุณหมดอายุแล้ว กรุณาจองใหม่' };

  const statusCfg = isPaymentStatus(paymentStatus) ? PAYMENT_STATUS_CONFIG[paymentStatus] : null;
  const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod;
  const amountLabel = `฿${amount.toLocaleString()}`;
  const statusLabel = statusCfg?.label ?? paymentStatus;
  const statusValueColor = statusCfg?.text ?? '#1A1A1A';
  const dateLabel = updatedAt ? formatThaiDate(updatedAt) : '—';

  return (
    <div
      style={{
        background: '#FFFFFF',
        boxShadow: '0px 0px 0px rgba(0,0,0,0.12)',
        borderRadius: 16,
        padding: '23px 23px 20px',
        marginTop: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0, lineHeight: '21px' }}>
          ข้อมูลการชำระเงิน
        </p>
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      {/* 4-column data grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 16 }}>
        <Col label="ยอดชำระ"   value={amountLabel}       valueColor="#059669" />
        <Col label="วิธีชำระ"  value={methodLabel}        valueColor="#1A1A1A" />
        <Col label="สถานะ"     value={statusLabel}        valueColor={statusValueColor} />
        <Col label="วันที่ชำระ" value={dateLabel}          valueColor="#1A1A1A" />
      </div>

      {/* Alert banner (failed / expired) */}
      {showAlert && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            background: alertCfg.bg,
            border: `0.8px solid ${alertCfg.border}`,
            borderRadius: 10,
            marginTop: 16,
          }}
        >
          <span className="material-icons" style={{ fontSize: 18, color: alertCfg.iconColor, flexShrink: 0 }}>
            {alertCfg.icon}
          </span>
          <p style={{ fontFamily: "'Bai Jamjuree', sans-serif", fontSize: 13, fontWeight: 600, color: alertCfg.textColor, margin: 0, lineHeight: '20px', flex: 1 }}>
            {alertCfg.message}
          </p>
          {isFailed && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                flexShrink: 0,
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
              ลองใหม่
            </button>
          )}
        </div>
      )}
    </div>
  );
}
