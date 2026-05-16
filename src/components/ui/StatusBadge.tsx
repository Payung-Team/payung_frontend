import { cn } from '../../lib/utils';

export interface StatusBadgeMeta {
  label: string;
  badgeClass: string;
  dotClass?: string;
}

interface StatusBadgeProps {
  label: string;
  badgeClass: string;
  dotClass?: string;
  className?: string;
}

export default function StatusBadge({ label, badgeClass, dotClass, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex h-6 items-center gap-2 rounded-full px-3 text-xs font-semibold', badgeClass, className)}>
      {dotClass && <span className={cn('h-1.5 w-1.5 rounded-full', dotClass)} />}
      {label}
    </span>
  );
}
