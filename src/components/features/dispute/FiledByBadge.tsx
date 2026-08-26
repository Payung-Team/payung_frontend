import { cn } from '../../../lib/utils';
import { FILED_BY_META, type DisputeFiledBy } from './disputeMeta';

interface FiledByBadgeProps {
  filedBy?: DisputeFiledBy | null;
  className?: string;
}

// PYG-317 — pill ผู้แจ้ง (ลูกค้า | ผู้ดูแล)
export default function FiledByBadge({ filedBy, className }: FiledByBadgeProps) {
  if (!filedBy || !FILED_BY_META[filedBy]) return null;
  const meta = FILED_BY_META[filedBy];
  return (
    <span className={cn('inline-flex h-5 items-center rounded-md px-2 text-[11px] font-semibold', meta.badgeClass, className)}>
      {meta.label}
    </span>
  );
}
