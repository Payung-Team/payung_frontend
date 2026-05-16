import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { ADMIN_KYC_LIST } from '../../graphql/queries';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';

type KycStatusFilter = 'all' | 'pending' | 'verified' | 'rejected';

type KycStatus = 'pending' | 'verified' | 'rejected' | 'none' | string;

interface KycSummary {
  id: string;
  caregiverNumber?: string;
  fullName: string;
  email: string;
  kycStatus: KycStatus;
  submittedAt?: string | null;
  documentCount: number;
}

interface AdminKycListResponse {
  list: {
    items: KycSummary[];
    total: number;
    page: number;
    totalPages: number;
  };
  allCount: { total: number };
  pendingCount: { total: number };
  verifiedCount: { total: number };
  rejectedCount: { total: number };
}

const PAGE_SIZE = 20;

const FILTERS: Array<{ key: KycStatusFilter; label: string; emptyTitle: string; emptyBody: string }> = [
  {
    key: 'all',
    label: 'ทั้งหมด',
    emptyTitle: 'ยังไม่มีรายการ KYC',
    emptyBody: 'เมื่อผู้ดูแลส่งเอกสาร KYC รายการจะแสดงที่นี่',
  },
  {
    key: 'pending',
    label: 'รอตรวจสอบ',
    emptyTitle: 'ไม่มีรายการรอตรวจสอบ',
    emptyBody: 'ตอนนี้ไม่มีเอกสาร KYC ที่รอการตรวจสอบ',
  },
  {
    key: 'verified',
    label: 'อนุมัติแล้ว',
    emptyTitle: 'ยังไม่มีรายการที่อนุมัติ',
    emptyBody: 'รายการที่ผ่านการตรวจสอบจะแสดงในแท็บนี้',
  },
  {
    key: 'rejected',
    label: 'ปฏิเสธ',
    emptyTitle: 'ยังไม่มีรายการที่ถูกปฏิเสธ',
    emptyBody: 'รายการที่ไม่ผ่านการตรวจสอบจะแสดงในแท็บนี้',
  },
];

const statusMeta: Record<string, { label: string; badgeClass: string; dotClass: string }> = {
  pending: {
    label: 'รอตรวจสอบ',
    badgeClass: 'bg-[#FFF1E8] text-[#B4532A]',
    dotClass: 'bg-[#C65A3A]',
  },
  verified: {
    label: 'อนุมัติแล้ว',
    badgeClass: 'bg-[#ECFDF5] text-[#0D9488]',
    dotClass: 'bg-[#0D9488]',
  },
  rejected: {
    label: 'ปฏิเสธ',
    badgeClass: 'bg-[#FEF2F2] text-[#DC2626]',
    dotClass: 'bg-[#DC2626]',
  },
  none: {
    label: 'ยังไม่ส่ง',
    badgeClass: 'bg-gray-100 text-gray-600',
    dotClass: 'bg-gray-400',
  },
};

function formatSubmittedDate(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) return [1, 2, 3, '...', totalPages] as const;
  if (currentPage >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages] as const;

  return [1, '...', currentPage, '...', totalPages] as const;
}

function KycStatusBadge({ status }: { status: KycStatus }) {
  const meta = statusMeta[status] ?? statusMeta.none;

  return (
    <span className={`inline-flex h-6 items-center gap-2 rounded-full px-3 text-xs font-semibold ${meta.badgeClass}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
      {meta.label}
    </span>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <div key={index} className="grid min-w-[1000px] grid-cols-[130px_minmax(180px,1.4fr)_200px_130px_140px_120px_100px] items-center gap-4 px-5 py-4">
          <Skeleton width={80} height={16} />
          <div className="flex items-center gap-3">
            <Skeleton circle width={32} height={32} />
            <Skeleton width={120} height={16} />
          </div>
          <Skeleton width={150} height={16} />
          <Skeleton width={90} height={16} />
          <Skeleton width={92} height={24} borderRadius={999} />
          <Skeleton width={60} height={16} />
          <Skeleton width={78} height={28} borderRadius={6} />
        </div>
      ))}
    </div>
  );
}

export default function KycReviewListPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<KycStatusFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const trimmedSearch = search.trim();

  const { data, loading, error } = useQuery<AdminKycListResponse>(ADMIN_KYC_LIST, {
    variables: {
      status: activeFilter,
      search: trimmedSearch || undefined,
      countSearch: trimmedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    },
    fetchPolicy: 'cache-and-network',
  });

  const items = data?.list.items ?? [];
  const total = data?.list.total ?? 0;
  const totalPages = data?.list.totalPages ?? 1;
  const isInitialLoading = loading && !data;
  const selectedFilter = FILTERS.find((filter) => filter.key === activeFilter) ?? FILTERS[0];

  const counts = useMemo(
    () => ({
      all: data?.allCount.total ?? 0,
      pending: data?.pendingCount.total ?? 0,
      verified: data?.verifiedCount.total ?? 0,
      rejected: data?.rejectedCount.total ?? 0,
    }),
    [data],
  );

  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#F9FAFB] text-gray-900">
      <section className="border-b border-gray-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1312px] items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#064E3B]">ตรวจสอบเอกสาร KYC</h1>
            <p className="mt-1 text-xs text-gray-500">ตรวจสอบและจัดการเอกสาร KYC ของผู้ดูแล</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1312px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="overflow-x-auto rounded-[10px] border border-gray-200 bg-white p-1 shadow-sm">
            <div className="flex min-w-max gap-1">
              {FILTERS.map((filter) => {
                const isActive = activeFilter === filter.key;

                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => {
                      setActiveFilter(filter.key);
                      setPage(1);
                    }}
                    className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors cursor-pointer ${isActive
                        ? 'bg-[#059669] text-white'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-[#064E3B]'
                      }`}
                  >
                    {filter.label}
                    <span
                      className={`min-w-6 rounded-full px-2 py-0.5 text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                        }`}
                    >
                      {counts[filter.key]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex h-11 w-full items-center gap-3 rounded-[10px] border border-gray-200 bg-white px-4 shadow-sm xl:max-w-[411px]">
            <Icon name="search" variant="outlined" size="small" className="text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อ caregiver"
              className="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              aria-label="ค้นหาชื่อ caregiver"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="grid min-w-[1000px] grid-cols-[130px_minmax(180px,1.4fr)_200px_130px_140px_120px_100px] gap-4 border-b border-gray-200 bg-[#F9FAFB] px-5 py-3 text-xs font-semibold text-gray-500">
              <div>เลขประจำตัว</div>
              <div>ชื่อผู้ดูแล</div>
              <div>อีเมล</div>
              <div>วันที่สมัคร</div>
              <div>สถานะ</div>
              <div>จำนวนเอกสาร</div>
              <div>การจัดการ</div>
            </div>

            {isInitialLoading ? (
              <TableSkeleton />
            ) : error ? (
              <div className="flex min-h-[320px] min-w-[1000px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <Icon name="error" variant="outlined" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-gray-900">โหลดรายการ KYC ไม่สำเร็จ</h2>
                <p className="mt-1 max-w-md text-sm text-gray-500">{error.message}</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[320px] min-w-[1000px] flex-col items-center justify-center px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#0D9488]">
                  <Icon name="verified_user" variant="outlined" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-gray-900">{selectedFilter.emptyTitle}</h2>
                <p className="mt-1 max-w-md text-sm text-gray-500">
                  {trimmedSearch
                    ? `ไม่พบ caregiver ที่ตรงกับ "${trimmedSearch}" ในแท็บนี้`
                    : selectedFilter.emptyBody}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className={`grid min-w-[1000px] grid-cols-[130px_minmax(180px,1.4fr)_200px_130px_140px_120px_100px] items-center gap-4 px-5 py-3.5 text-sm ${index % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'
                      }`}
                  >
                    <div className="text-gray-900">{item.caregiverNumber || item.id.substring(0, 8)}</div>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-xs font-bold text-[#0D9488]">
                        {item.fullName.charAt(0) || 'K'}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-gray-900">{item.fullName || '-'}</div>
                      </div>
                    </div>
                    <div className="truncate text-gray-500">{item.email}</div>
                    <div className="text-gray-500">{formatSubmittedDate(item.submittedAt)}</div>
                    <div>
                      <KycStatusBadge status={item.kycStatus} />
                    </div>
                    <div className="text-gray-600">{item.documentCount} ไฟล์</div>
                    <div>
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/kyc/${item.id}`)}
                        className="inline-flex h-8 items-center rounded-md bg-[#059669] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#047857] cursor-pointer"
                      >
                        ตรวจสอบ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              แสดง {firstItem}-{lastItem} จาก {total} รายการ
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="หน้าก่อนหน้า"
              >
                <Icon name="arrow_back" size="small" />
              </button>
              {visiblePages.map((pageNumber, index) =>
                pageNumber === '...' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-500"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium ${page === pageNumber
                        ? 'bg-[#059669] text-white'
                        : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="หน้าถัดไป"
              >
                <Icon name="arrow_forward" size="small" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
