import FilterTabs, { type FilterTabItem } from '../../ui/FilterTabs';
import SearchInput from '../../ui/SearchInput';
import Icon from '../../ui/Icon';
import type { DisputeFiledBy, DisputeSortBy } from './disputeMeta';
import { FILED_BY_META } from './disputeMeta';

export type StatusTabKey = 'all' | 'flagged' | 'resolved';

export interface DisputeFilters {
  status: StatusTabKey;
  filedBy: DisputeFiledBy | 'all';
  dateFrom: string;
  dateTo: string;
  sortBy: DisputeSortBy;
  q: string;
}

interface DisputeFilterBarProps {
  filters: DisputeFilters;
  counts: { all: number; flagged: number; resolved: number };
  onChange: <K extends keyof DisputeFilters>(key: K, value: DisputeFilters[K]) => void;
  onClearAll: () => void;
}

const SELECT_CLASS =
  'h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#059669]';

// PYG-317 — filter bar: status tabs + filed_by + date range + sort + search + active chips
export default function DisputeFilterBar({ filters, counts, onChange, onClearAll }: DisputeFilterBarProps) {
  const statusTabs: FilterTabItem<StatusTabKey>[] = [
    { key: 'all', label: 'ทั้งหมด', count: counts.all },
    { key: 'flagged', label: 'รอตรวจสอบ', count: counts.flagged },
    { key: 'resolved', label: 'ปิดเรื่องแล้ว', count: counts.resolved },
  ];

  const hasActiveChips =
    filters.filedBy !== 'all' || filters.dateFrom !== '' || filters.dateTo !== '' || filters.sortBy !== 'sla_asc';

  return (
    <div className="flex flex-col gap-3 rounded-t-xl border-b border-gray-100 bg-white p-4">
      {/* Row 1: status tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterTabs items={statusTabs} activeKey={filters.status} onChange={(k) => onChange('status', k)} />
        <div className="relative ml-auto w-full max-w-[320px]">
          <SearchInput
            value={filters.q}
            onChange={(v) => onChange('q', v)}
            placeholder="ค้นหา Dispute ID / Booking ID / ชื่อ / อีเมล"
          />
        </div>
      </div>

      {/* Row 2: filed_by + date range + sort */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filters.filedBy}
          onChange={(e) => onChange('filedBy', e.target.value as DisputeFilters['filedBy'])}
          className={SELECT_CLASS}
          aria-label="ผู้แจ้ง"
        >
          <option value="all">ผู้แจ้ง: ทั้งหมด</option>
          <option value="customer">{FILED_BY_META.customer.label}</option>
          <option value="caregiver">{FILED_BY_META.caregiver.label}</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          จาก
          <input
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => onChange('dateFrom', e.target.value)}
            className={SELECT_CLASS}
            aria-label="วันที่ยื่นตั้งแต่"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-500">
          ถึง
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => onChange('dateTo', e.target.value)}
            className={SELECT_CLASS}
            aria-label="วันที่ยื่นถึง"
          />
        </label>

        <select
          value={filters.sortBy}
          onChange={(e) => onChange('sortBy', e.target.value as DisputeSortBy)}
          className={`${SELECT_CLASS} ml-auto`}
          aria-label="เรียงลำดับ"
        >
          <option value="sla_asc">เรียง: SLA ใกล้ครบกำหนด</option>
          <option value="sla_desc">เรียง: วันที่ยื่นใหม่สุด</option>
        </select>
      </div>

      {/* Row 3: active filter chips */}
      {hasActiveChips && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {filters.filedBy !== 'all' && (
            <Chip label={`ผู้แจ้ง: ${FILED_BY_META[filters.filedBy].label}`} onClear={() => onChange('filedBy', 'all')} />
          )}
          {filters.dateFrom && <Chip label={`ตั้งแต่ ${filters.dateFrom}`} onClear={() => onChange('dateFrom', '')} />}
          {filters.dateTo && <Chip label={`ถึง ${filters.dateTo}`} onClear={() => onChange('dateTo', '')} />}
          {filters.sortBy !== 'sla_asc' && (
            <Chip label="เรียง: วันที่ยื่นใหม่สุด" onClear={() => onChange('sortBy', 'sla_asc')} />
          )}
          <button type="button" onClick={onClearAll} className="font-semibold text-[#2563EB] hover:underline">
            ล้างทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[#E6F5ED] pl-2.5 pr-1 font-semibold text-[#1B5C48]">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
        aria-label={`ล้างตัวกรอง ${label}`}
      >
        <Icon name="close" style={{ fontSize: 12 }} />
      </button>
    </span>
  );
}
