import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { ADMIN_DISPUTE_QUEUE } from '../../graphql/queries';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import DataTableSkeleton from '../../components/ui/DataTableSkeleton';
import Pagination from '../../components/ui/Pagination';
import Icon from '../../components/ui/Icon';
import { useDebounce } from '../../hooks/useDebounce';
import DisputeKpiCards from '../../components/features/dispute/DisputeKpiCards';
import DisputeFilterBar, { type DisputeFilters } from '../../components/features/dispute/DisputeFilterBar';
import SlaBadge from '../../components/features/dispute/SlaBadge';
import DisputeStatusBadge from '../../components/features/dispute/DisputeStatusBadge';
import FiledByBadge from '../../components/features/dispute/FiledByBadge';
import { formatTHB, formatThaiDate, toSortBy, type DisputeFiledBy } from '../../components/features/dispute/disputeMeta';

// ─── Types (ตรงกับ ADMIN_DISPUTE_QUEUE) ──────────────────────────────────────

interface PartyBrief {
  id: string;
  displayName?: string | null;
  email?: string | null;
}

interface DisputeRow {
  id: string;
  bookingId: string;
  filedBy?: DisputeFiledBy | null;
  amount?: number | null;
  currency?: string | null;
  filedAt?: string | null;
  slaDueAt?: string | null;
  status: string;
  patient: PartyBrief;
  caregiver?: PartyBrief | null;
}

interface QueueData {
  list: {
    nodes: DisputeRow[];
    totalCount: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
  };
  allCount: { totalCount: number };
  flaggedCount: { totalCount: number };
  resolvedCount: { totalCount: number };
}

const PAGE_SIZE = 10;
// คอลัมน์ข้อความยืดตามพื้นที่ (fr) / คอลัมน์ค่าคงที่ (เงิน วันที่ SLA สถานะ ปุ่ม) ตรึงความกว้างไว้
const GRID = 'minmax(140px,1.2fr) minmax(120px,1fr) minmax(150px,1.1fr) 110px 120px 180px 130px 120px';
const TABLE_MIN_WIDTH = 'min-w-[1220px]';

const INITIAL_FILTERS: DisputeFilters = {
  status: 'all',
  filedBy: 'all',
  sortBy: 'sla_asc',
  q: '',
};

// filer = ผู้แจ้ง (patient เมื่อ filedBy=customer, caregiver เมื่อ filedBy=caregiver)
function filerName(row: DisputeRow): string {
  const party = row.filedBy === 'caregiver' ? row.caregiver : row.patient;
  return party?.displayName || party?.email || '-';
}

export default function AdminDisputesPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DisputeFilters>(INITIAL_FILTERS);
  const [page, setPage] = useState(1);

  const debouncedQ = useDebounce(filters.q, 400);

  const setFilter = <K extends keyof DisputeFilters>(key: K, value: DisputeFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearAll = () => {
    setFilters((prev) => ({ ...INITIAL_FILTERS, status: prev.status, q: prev.q }));
    setPage(1);
  };

  const variables = useMemo(
    () => ({
      disputeStatus: filters.status === 'all' ? undefined : filters.status,
      filedBy: filters.filedBy === 'all' ? undefined : filters.filedBy,
      sortBy: toSortBy(filters.sortBy),
      q: debouncedQ.trim() || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [filters.status, filters.filedBy, filters.sortBy, debouncedQ, page],
  );

  const { data, loading, error } = useQuery<QueueData>(ADMIN_DISPUTE_QUEUE, {
    variables,
    fetchPolicy: 'cache-and-network',
  });

  const nodes = data?.list?.nodes ?? [];
  const total = data?.list?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const counts = {
    all: data?.allCount?.totalCount ?? 0,
    flagged: data?.flaggedCount?.totalCount ?? 0,
    resolved: data?.resolvedCount?.totalCount ?? 0,
  };

  const columns: DataTableColumn<DisputeRow>[] = [
    { key: 'id', header: 'Dispute ID', className: 'text-sm font-semibold text-[#2563EB] truncate', render: (r) => r.id },
    { key: 'bookingId', header: 'Booking', className: 'text-xs text-gray-500 truncate', render: (r) => r.bookingId },
    {
      key: 'filer',
      header: 'ผู้แจ้ง',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-gray-900">{filerName(r)}</span>
          <FiledByBadge filedBy={r.filedBy} />
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'จำนวนเงิน',
      className: 'text-sm font-bold text-gray-900',
      render: (r) => formatTHB(r.amount),
    },
    { key: 'filedAt', header: 'วันที่ยื่น', className: 'text-xs text-gray-500', render: (r) => formatThaiDate(r.filedAt) },
    { key: 'sla', header: 'SLA คงเหลือ', render: (r) => <SlaBadge slaDueAt={r.slaDueAt} status={r.status} /> },
    { key: 'status', header: 'สถานะ', render: (r) => <DisputeStatusBadge status={r.status} /> },
    {
      key: 'actions',
      header: 'การดำเนินการ',
      align: 'center',
      render: (r) => (
        <button
          type="button"
          onClick={() => navigate(`/admin/disputes/${r.id}`)}
          className="inline-flex h-8 cursor-pointer items-center rounded-md bg-[#059669] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#047857]"
        >
          ตรวจสอบ
        </button>
      ),
    },
  ];

  const showSkeleton = loading && !data;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8 lg:py-6">
      <DisputeKpiCards
        flaggedCount={counts.flagged}
        resolvedCount={counts.resolved}
        allCount={counts.all}
        loading={showSkeleton}
      />

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <DisputeFilterBar filters={filters} counts={counts} onChange={setFilter} onClearAll={clearAll} />

        <DataTable
          columns={columns}
          items={nodes}
          getRowKey={(r) => r.id}
          gridTemplateColumns={GRID}
          minWidthClassName={TABLE_MIN_WIDTH}
          loading={showSkeleton}
          loadingContent={
            <DataTableSkeleton
              rows={PAGE_SIZE}
              gridTemplateColumns={GRID}
              minWidthClassName={TABLE_MIN_WIDTH}
              cells={[
                { width: 120 }, { width: 100 }, { width: 160 }, { width: 80 },
                { width: 100 }, { width: 130, height: 24, borderRadius: 99 }, { width: 90, height: 24, borderRadius: 99 },
                { width: 80, height: 32, borderRadius: 6 },
              ]}
            />
          }
          error={error ?? undefined}
          renderError={(err) => (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
                <Icon name="error_outline" variant="outlined" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">โหลดคำร้องไม่สำเร็จ</h2>
              <p className="mt-1 max-w-md text-sm text-gray-500">{err.message}</p>
            </div>
          )}
          renderEmpty={
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                <Icon name="gavel" variant="outlined" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">ไม่พบคำร้อง</h2>
              <p className="mt-1 max-w-md text-sm text-gray-500">ลองปรับตัวกรองหรือคำค้นหาใหม่อีกครั้ง</p>
            </div>
          }
          footer={
            total > 0 ? (
              <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  แสดง {firstItem}-{lastItem} จาก {total} รายการ
                </p>
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            ) : null
          }
        />
      </div>
    </div>
  );
}
