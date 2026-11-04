import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { ADMIN_BOOKINGS } from '../../../graphql/adminBookings';
import DataTable, { type DataTableColumn } from '../../ui/DataTable';
import DataTableSkeleton from '../../ui/DataTableSkeleton';
import Pagination from '../../ui/Pagination';
import Icon from '../../ui/Icon';
import { useDebounce } from '../../../hooks/useDebounce';
import { userFacingErrorMessage } from '../../../lib/apolloErrors';
import { formatDurationHours } from '../../../lib/bookingTime';
import { useNavigate } from 'react-router-dom';
import { BOOKING_STATUS_META as STATUS_META, formatTHB, formatThaiDate as formatDate } from './bookingMeta';
import { BookingStatusBadge as StatusBadge, PaymentStatusText } from './BookingStatusBadges';

interface BookingRow {
  id: string;
  status: string;
  bookingDate: string;
  startTime: string;
  durationHours: number;
  serviceType: string;
  estimatedCost: number | null;
  paymentStatus: string | null;
  disputeStatus: string;
  createdAt: string;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  caregiverId: string | null;
  caregiverName: string | null;
  caregiverNumber: string | null;
}

interface QueryData {
  adminBookings: { nodes: BookingRow[]; totalCount: number };
}

const PAGE_SIZE = 10;
const GRID = 'minmax(110px,0.8fr) minmax(160px,1.2fr) minmax(170px,1.2fr) 150px 110px 130px 130px 120px';
const TABLE_MIN_WIDTH = 'min-w-[1220px]';

const STATUS_FILTERS = ['', ...Object.keys(STATUS_META)];

export default function AdminBookingsTable() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search, 400);
  const navigate = useNavigate();

  const { data, loading, error } = useQuery<QueryData>(ADMIN_BOOKINGS, {
    variables: {
      input: { status: status || undefined, search: debounced.trim() || undefined, page, limit: PAGE_SIZE },
    },
    // จำผลไว้ใน Apollo cache — กลับมาหน้านี้ / เปลี่ยนหน้า-ตัวกรองที่เคยโหลดแล้วไม่ยิง request ซ้ำ
    // ต้องการข้อมูลล่าสุดให้กดปุ่ม Refresh บนหัวหน้า (AdminPaymentsPage)
    fetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: true,
  });

  const nodes = data?.adminBookings.nodes ?? [];
  const total = data?.adminBookings.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const columns: DataTableColumn<BookingRow>[] = [
    {
      key: 'id',
      mobile: 'subtitle',
      header: 'Booking',
      className: 'truncate text-sm font-semibold text-[#2563EB]',
      render: (r) => (
        <button type="button" title={r.id} onClick={() => navigate(`/admin/payments/bookings/${r.id}`)} className="cursor-pointer hover:underline">
          #{r.id.slice(0, 8).toUpperCase()}
        </button>
      ),
    },
    {
      key: 'patient',
      mobile: 'title',
      header: 'ผู้จอง',
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">{r.patientName}</p>
          {r.patientPhone && <p className="truncate text-xs text-gray-500">{r.patientPhone}</p>}
        </div>
      ),
    },
    {
      key: 'caregiver',
      header: 'ผู้ดูแล',
      render: (r) =>
        r.caregiverName ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{r.caregiverName}</p>
            {r.caregiverNumber && <p className="truncate text-xs text-gray-500">{r.caregiverNumber}</p>}
          </div>
        ) : (
          <span className="text-sm text-gray-400">ยังไม่มีผู้ดูแล</span>
        ),
    },
    {
      key: 'date',
      header: 'วันที่ดูแล',
      className: 'text-xs text-gray-600',
      render: (r) => (
        <div>
          <p>{formatDate(r.bookingDate)}</p>
          <p className="text-gray-400">
            {r.startTime} · {formatDurationHours(r.durationHours)}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'ยอดเงิน',
      align: 'right',
      className: 'text-sm font-bold text-gray-900',
      render: (r) => formatTHB(r.estimatedCost),
    },
    {
      key: 'payment',
      header: 'การชำระเงิน',
      className: 'text-xs font-semibold',
      render: (r) => <PaymentStatusText status={r.paymentStatus} />,
    },
    {
      key: 'status',
      mobile: 'badge',
      header: 'สถานะ',
      render: (r) => (
        <div className="flex flex-wrap items-center gap-1">
          <StatusBadge status={r.status} />
          {r.disputeStatus !== 'none' && (
            <span className="inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
              Dispute
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      mobile: 'action',
      header: '',
      align: 'center',
      render: (r) => (
        <button
          type="button"
          onClick={() => navigate(`/admin/payments/bookings/${r.id}`)}
          className="inline-flex h-8 cursor-pointer items-center rounded-md bg-[#059669] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#047857]"
        >
          ดูรายละเอียด
        </button>
      ),
    },
  ];

  const showSkeleton = loading && !data;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-900">รายการจอง (Booking)</h2>
          <p className="text-xs text-gray-500">ติดตามสถานะการจอง ผู้จอง และผู้ดูแลที่ถูกจอง</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
              <Icon name="search" size="small" />
            </span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="ค้นหาชื่อผู้จอง / ผู้ดูแล / รหัส"
              className="h-9 w-full rounded-lg border border-gray-200 pl-9 pr-3 text-sm outline-none focus:border-[#059669] sm:w-64"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-[#059669]"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s || 'all'} value={s}>
                {s ? STATUS_META[s].label : 'ทุกสถานะ'}
              </option>
            ))}
          </select>
        </div>
      </div>

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
              { width: 80 }, { width: 140 }, { width: 140 }, { width: 100 },
              { width: 70 }, { width: 80 }, { width: 90, height: 24, borderRadius: 99 }, { width: 90, height: 32, borderRadius: 6 },
            ]}
          />
        }
        error={error ?? undefined}
        renderError={(err) => (
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
              <Icon name="error_outline" variant="outlined" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">โหลดรายการจองไม่สำเร็จ</h3>
            <p className="mt-1 max-w-md text-sm text-gray-500">{userFacingErrorMessage(err, 'กรุณาลองใหม่อีกครั้ง')}</p>
          </div>
        )}
        renderEmpty={
          <div className="flex min-h-60 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <Icon name="event_busy" variant="outlined" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-900">ไม่พบรายการจอง</h3>
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
  );
}
