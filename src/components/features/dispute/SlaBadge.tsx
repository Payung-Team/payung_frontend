import Icon from '../../ui/Icon';
import { cn } from '../../../lib/utils';
import { computeSla } from './disputeMeta';

interface SlaBadgeProps {
  slaDueAt?: string | null;
  status?: string;
  className?: string;
}

// PYG-317 — SLA badge สี (แดง=เกิน, เหลือง=<4ชม, เขียว=ปกติ, เทา=ปิดเรื่องแล้ว)
export default function SlaBadge({ slaDueAt, status, className }: SlaBadgeProps) {
  const sla = computeSla(slaDueAt, status);
  return (
    <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold', sla.badgeClass, className)}>
      <Icon name={sla.icon} size="small" style={{ fontSize: 14 }} />
      {sla.text}
    </span>
  );
}
