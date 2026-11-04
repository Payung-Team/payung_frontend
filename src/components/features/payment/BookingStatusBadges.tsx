import { BOOKING_STATUS_META, PAYMENT_STATUS_META } from './bookingMeta';

export function BookingStatusBadge({ status }: { status: string }) {
  const m = BOOKING_STATUS_META[status] ?? { label: status, cls: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}

export function PaymentStatusText({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-gray-400">-</span>;
  const m = PAYMENT_STATUS_META[status] ?? { label: status, cls: 'text-gray-600' };
  return <span className={m.cls}>{m.label}</span>;
}
