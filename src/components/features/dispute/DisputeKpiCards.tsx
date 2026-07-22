import Icon from '../../ui/Icon';

interface KpiItem {
  icon: string;
  tint: string;
  ink: string;
  label: string;
  value: number;
}

interface DisputeKpiCardsProps {
  flaggedCount: number;
  resolvedCount: number;
  allCount: number;
  loading?: boolean;
}

// PYG-317 — KPI row 3 ใบ (รอตรวจสอบ / ปิดเรื่องแล้ว / ทั้งหมด) จาก aliased count query
export default function DisputeKpiCards({ flaggedCount, resolvedCount, allCount, loading }: DisputeKpiCardsProps) {
  const items: KpiItem[] = [
    { icon: 'gavel',    tint: '#FEF2F2', ink: '#DC2626', label: 'คำร้องรอตรวจสอบ', value: flaggedCount },
    { icon: 'verified', tint: '#ECFDF5', ink: '#059669', label: 'ปิดเรื่องแล้ว',     value: resolvedCount },
    { icon: 'inbox',    tint: '#EFF6FF', ink: '#3B82F6', label: 'คำร้องทั้งหมด',     value: allCount },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3.5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ background: item.tint, color: item.ink }}
          >
            <Icon name={item.icon} style={{ fontSize: 24 }} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-gray-500">{item.label}</div>
            <div className="flex items-baseline gap-1">
              <span className="text-[22px] font-bold text-gray-900">{loading ? '—' : item.value.toLocaleString('en-US')}</span>
              <span className="text-[11px] text-gray-400">รายการ</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
