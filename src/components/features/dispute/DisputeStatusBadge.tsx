import StatusBadge from '../../ui/StatusBadge';
import { STATUS_META } from './disputeMeta';

interface DisputeStatusBadgeProps {
  status: string;
  className?: string;
}

// PYG-317 — badge สถานะคำร้อง (flagged | resolved)
export default function DisputeStatusBadge({ status, className }: DisputeStatusBadgeProps) {
  const meta = STATUS_META[status as 'flagged' | 'resolved'];
  if (!meta) {
    return <StatusBadge label={status} badgeClass="bg-gray-100 text-gray-500" className={className} />;
  }
  return <StatusBadge label={meta.label} badgeClass={meta.badgeClass} dotClass={meta.dotClass} className={className} />;
}
