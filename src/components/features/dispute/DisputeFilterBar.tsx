import { useEffect, useRef, useState } from 'react';
import FilterTabs, { type FilterTabItem } from '../../ui/FilterTabs';
import SearchInput from '../../ui/SearchInput';
import Icon from '../../ui/Icon';
import { cn } from '../../../lib/utils';
import type { DisputeFiledBy, DisputeSortOption } from './disputeMeta';
import { FILED_BY_META, SORT_OPTIONS, SORT_OPTION_LABEL } from './disputeMeta';

export type StatusTabKey = 'all' | 'flagged' | 'resolved';

export interface DisputeFilters {
  status: StatusTabKey;
  filedBy: DisputeFiledBy | 'all';
  sortBy: DisputeSortOption;
  q: string;
}

interface DisputeFilterBarProps {
  filters: DisputeFilters;
  counts: { all: number; flagged: number; resolved: number };
  onChange: <K extends keyof DisputeFilters>(key: K, value: DisputeFilters[K]) => void;
  onClearAll: () => void;
}

type SectionKey = 'filedBy' | 'sortBy';

interface DraftState {
  filedBy: DisputeFilters['filedBy'];
  sortBy: DisputeSortOption;
}

const DEFAULTS: DraftState = { filedBy: 'all', sortBy: 'sla_asc' };

const SECTION_LABEL: Record<SectionKey, string> = {
  filedBy: 'ผู้แจ้ง',
  sortBy: 'การเรียงลำดับ',
};

const PANEL_CLASS = 'rounded-xl border border-gray-200 bg-white p-2 shadow-lg';

// PYG-317 — filter bar: status tabs + search + ตัวกรองที่เหลืออยู่ใน popover (ผู้แจ้ง / การเรียงลำดับ)
export default function DisputeFilterBar({ filters, counts, onChange, onClearAll }: DisputeFilterBarProps) {
  const [open, setOpen] = useState(false);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);
  const [draft, setDraft] = useState<DraftState>({ filedBy: filters.filedBy, sortBy: filters.sortBy });
  const popoverRef = useRef<HTMLDivElement>(null);

  const statusTabs: FilterTabItem<StatusTabKey>[] = [
    { key: 'all', label: 'ทั้งหมด', count: counts.all },
    { key: 'flagged', label: 'รอตรวจสอบ', count: counts.flagged },
    { key: 'resolved', label: 'ปิดเรื่องแล้ว', count: counts.resolved },
  ];

  const activeCount = (filters.filedBy !== 'all' ? 1 : 0) + (filters.sortBy !== 'sla_asc' ? 1 : 0);

  // เปิดเมนู = sync draft จากค่าจริงเสมอ (ทิ้ง draft ที่ยังไม่ได้ Apply รอบก่อน)
  const openMenu = () => {
    setDraft({ filedBy: filters.filedBy, sortBy: filters.sortBy });
    setOpenSection(null);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    setOpenSection(null);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const onOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        closeMenu();
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEscape);

    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  const applySection = (section: SectionKey) => {
    if (draft[section] !== filters[section]) {
      onChange(section, draft[section]);
    }
    closeMenu();
  };

  return (
    <div className="flex flex-col gap-3 rounded-t-xl border-b border-gray-100 bg-white p-4">
      {/* Row 1: ปุ่มตัวกรอง + status tabs + search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative" ref={popoverRef}>
          <button
            type="button"
            onClick={() => (open ? closeMenu() : openMenu())}
            aria-expanded={open}
            aria-haspopup="menu"
            className={cn(
              'inline-flex h-9 cursor-pointer items-center gap-2 rounded-[10px] border bg-white px-3 text-sm font-semibold shadow-sm transition-colors',
              open || activeCount > 0
                ? 'border-[#059669] text-[#059669]'
                : 'border-gray-200 text-gray-600 hover:text-[#064E3B]',
            )}
          >
            <Icon name="filter_list" style={{ fontSize: 18 }} />
            ตัวกรอง
            {activeCount > 0 && (
              <span className="min-w-5 rounded-full bg-[#E6F5ED] px-1.5 text-xs text-[#1B5C48]">{activeCount}</span>
            )}
          </button>

          {open && (
            <div className={cn('absolute left-0 top-full z-20 mt-2 w-56', PANEL_CLASS)} role="menu">
              <p className="px-2 py-1 text-xs text-gray-400">เพิ่มตัวกรอง</p>

              {(['filedBy', 'sortBy'] as SectionKey[]).map((section) => (
                <button
                  key={section}
                  type="button"
                  onClick={() => setOpenSection((prev) => (prev === section ? null : section))}
                  className={cn(
                    'flex w-full cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors',
                    openSection === section ? 'bg-gray-50 text-[#064E3B]' : 'text-gray-700 hover:bg-gray-50',
                  )}
                >
                  {SECTION_LABEL[section]}
                  <Icon name="chevron_right" style={{ fontSize: 18 }} />
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  closeMenu();
                }}
                className="mt-1 w-full cursor-pointer rounded-lg px-2 py-2 text-left text-sm font-semibold text-[#2563EB] hover:bg-gray-50"
              >
                ล้างตัวกรองทั้งหมด
              </button>

              {openSection && (
                <div className={cn('absolute left-full top-0 ml-1 w-60', PANEL_CLASS)}>
                  <p className="px-2 py-1 text-sm font-semibold text-gray-900">{SECTION_LABEL[openSection]}</p>

                  <div className="flex flex-col py-1">
                    {openSection === 'filedBy' ? (
                      <>
                        <RadioRow
                          name="dispute-filed-by"
                          label="ทั้งหมด"
                          checked={draft.filedBy === 'all'}
                          onSelect={() => setDraft((prev) => ({ ...prev, filedBy: 'all' }))}
                        />
                        <RadioRow
                          name="dispute-filed-by"
                          label={FILED_BY_META.customer.label}
                          checked={draft.filedBy === 'customer'}
                          onSelect={() => setDraft((prev) => ({ ...prev, filedBy: 'customer' }))}
                        />
                        <RadioRow
                          name="dispute-filed-by"
                          label={FILED_BY_META.caregiver.label}
                          checked={draft.filedBy === 'caregiver'}
                          onSelect={() => setDraft((prev) => ({ ...prev, filedBy: 'caregiver' }))}
                        />
                      </>
                    ) : (
                      SORT_OPTIONS.map((value) => (
                        <RadioRow
                          key={value}
                          name="dispute-sort-by"
                          label={SORT_OPTION_LABEL[value]}
                          checked={draft.sortBy === value}
                          onSelect={() => setDraft((prev) => ({ ...prev, sortBy: value }))}
                        />
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, [openSection]: DEFAULTS[openSection] }))}
                      className="h-9 cursor-pointer rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => applySection(openSection)}
                      className="h-9 cursor-pointer rounded-lg bg-[#059669] px-4 text-sm font-semibold text-white hover:bg-[#047857]"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <FilterTabs items={statusTabs} activeKey={filters.status} onChange={(k) => onChange('status', k)} />

        <div className="relative ml-auto w-full max-w-[320px]">
          <SearchInput
            value={filters.q}
            onChange={(v) => onChange('q', v)}
            placeholder="ค้นหา Dispute ID / Booking ID / ชื่อ / อีเมล"
          />
        </div>
      </div>

      {/* Row 2: active filter chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {filters.filedBy !== 'all' && (
            <Chip label={`ผู้แจ้ง: ${FILED_BY_META[filters.filedBy].label}`} onClear={() => onChange('filedBy', 'all')} />
          )}
          {filters.sortBy !== 'sla_asc' && (
            <Chip
              label={`เรียง: ${SORT_OPTION_LABEL[filters.sortBy]}`}
              onClear={() => onChange('sortBy', 'sla_asc')}
            />
          )}
          <button type="button" onClick={onClearAll} className="font-semibold text-[#2563EB] hover:underline">
            ล้างทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}

function RadioRow({
  name,
  label,
  checked,
  onSelect,
}: {
  name: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
        checked ? 'bg-[#E6F5ED] font-semibold text-[#1B5C48]' : 'text-gray-700 hover:bg-gray-50',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="h-4 w-4 accent-[#059669]"
      />
      {label}
    </label>
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
