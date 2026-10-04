import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { ADMIN_KYC_LIST, ADMIN_PROFILE_PHOTO_QUEUE } from '../../graphql/queries';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import DataTableSkeleton from '../../components/ui/DataTableSkeleton';
import FilterTabs, { type FilterTabItem } from '../../components/ui/FilterTabs';
import Pagination from '../../components/ui/Pagination';
import SearchInput from '../../components/ui/SearchInput';
import StatusBadge, { type StatusBadgeMeta } from '../../components/ui/StatusBadge';

type KycStatusFilter = 'all' | 'pending' | 'verified' | 'rejected';

/** PYG-511: แท็บ "รูปโปรไฟล์รออนุมัติ" อ่านจากคิวรูป ไม่ใช่ kycStatus */
type KycTab = KycStatusFilter | 'profile_photo';

interface ProfilePhotoQueueItem {
  documentId: string;
  caregiverId: string;
  caregiverNumber?: string | null;
  fullName: string;
  email: string;
  kycStatus: KycStatus;
  uploadedAt: string;
  hasApprovedPhoto: boolean;
}

interface AdminProfilePhotoQueueResponse {
  adminProfilePhotoQueue: {
    items: ProfilePhotoQueueItem[];
    total: number;
    page: number;
    totalPages: number;
  };
}

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
const TABLE_GRID_COLUMNS = '130px minmax(180px, 1.4fr) 200px 130px 140px 120px 100px';
const PHOTO_TABLE_GRID_COLUMNS = '130px minmax(180px, 1.4fr) 200px 150px 140px 140px 100px';

const FILTERS: Array<{ key: KycTab; label: string; emptyTitle: string; emptyBody: string }> = [
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
  {
    key: 'profile_photo',
    label: 'รูปโปรไฟล์รออนุมัติ',
    emptyTitle: 'ไม่มีรูปโปรไฟล์รออนุมัติ',
    emptyBody: 'เมื่อผู้ดูแลอัปโหลดหรือเปลี่ยนรูปโปรไฟล์ รายการจะแสดงที่นี่',
  },
];

function parseTab(value: string | null): KycTab {
  return FILTERS.some((filter) => filter.key === value) ? (value as KycTab) : 'all';
}

const statusMeta: Record<string, StatusBadgeMeta> = {
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

function renderKycStatusBadge(status: KycStatus) {
  const meta = statusMeta[status] ?? statusMeta.none;

  return <StatusBadge label={meta.label} badgeClass={meta.badgeClass} dotClass={meta.dotClass} />;
}

function KycReviewTableSkeleton() {
  return (
    <DataTableSkeleton
      rows={PAGE_SIZE}
      gridTemplateColumns={TABLE_GRID_COLUMNS}
      cells={[
        { width: 80, height: 16 },
        {
          content: (
            <div className="flex items-center gap-3">
              <Skeleton circle width={32} height={32} />
              <Skeleton width={120} height={16} />
            </div>
          ),
        },
        { width: 150, height: 16 },
        { width: 90, height: 16 },
        { width: 92, height: 24, borderRadius: 999 },
        { width: 60, height: 16 },
        { width: 78, height: 28, borderRadius: 6 },
      ]}
    />
  );
}

export default function KycReviewListPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeFilter, setActiveFilter] = useState<KycTab>(() =>
    parseTab(searchParams.get('tab') ?? searchParams.get('status')),
  );
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const trimmedSearch = search.trim();
  const isPhotoTab = activeFilter === 'profile_photo';

  const { data, loading, error } = useQuery<AdminKycListResponse>(ADMIN_KYC_LIST, {
    variables: {
      status: isPhotoTab ? 'all' : activeFilter,
      search: trimmedSearch || undefined,
      countSearch: trimmedSearch || undefined,
      page: isPhotoTab ? 1 : page,
      limit: PAGE_SIZE,
    },
    fetchPolicy: 'cache-and-network',
  });

  // นอกแท็บรูปใช้แค่ total ไปโชว์บนแท็บ จึงขอแค่ 1 แถว
  const {
    data: photoData,
    loading: photoLoading,
    error: photoError,
  } = useQuery<AdminProfilePhotoQueueResponse>(ADMIN_PROFILE_PHOTO_QUEUE, {
    variables: {
      search: trimmedSearch || undefined,
      page: isPhotoTab ? page : 1,
      limit: isPhotoTab ? PAGE_SIZE : 1,
    },
    fetchPolicy: 'cache-and-network',
  });

  const items = data?.list.items ?? [];
  const photoItems = photoData?.adminProfilePhotoQueue.items ?? [];
  const total = (isPhotoTab ? photoData?.adminProfilePhotoQueue.total : data?.list.total) ?? 0;
  const totalPages = (isPhotoTab ? photoData?.adminProfilePhotoQueue.totalPages : data?.list.totalPages) ?? 1;
  const isInitialLoading = loading && !data;
  const isPhotoInitialLoading = photoLoading && !photoData;
  const selectedFilter = FILTERS.find((filter) => filter.key === activeFilter) ?? FILTERS[0];

  const counts = useMemo<Record<KycTab, number>>(
    () => ({
      all: data?.allCount.total ?? 0,
      pending: data?.pendingCount.total ?? 0,
      verified: data?.verifiedCount.total ?? 0,
      rejected: data?.rejectedCount.total ?? 0,
      profile_photo: photoData?.adminProfilePhotoQueue.total ?? 0,
    }),
    [data, photoData],
  );

  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const filterTabs = useMemo<FilterTabItem<KycTab>[]>(
    () =>
      FILTERS.map((filter) => ({
        key: filter.key,
        label: filter.label,
        count: counts[filter.key],
      })),
    [counts],
  );

  const columns = useMemo<DataTableColumn<KycSummary>[]>(
    () => [
      {
        key: 'caregiverNumber',
        header: 'เลขประจำตัว',
        render: (item) => <div className="text-gray-900">{item.caregiverNumber || item.id.substring(0, 8)}</div>,
      },
      {
        key: 'fullName',
        header: 'ชื่อผู้ดูแล',
        render: (item) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-xs font-bold text-[#0D9488]">
              {item.fullName.charAt(0) || 'K'}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{item.fullName || '-'}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'email',
        header: 'อีเมล',
        className: 'truncate text-gray-500',
        render: (item) => item.email,
      },
      {
        key: 'submittedAt',
        header: 'วันที่สมัคร',
        className: 'text-gray-500',
        render: (item) => formatSubmittedDate(item.submittedAt),
      },
      {
        key: 'kycStatus',
        header: 'สถานะ',
        render: (item) => renderKycStatusBadge(item.kycStatus),
      },
      {
        key: 'documentCount',
        header: 'จำนวนเอกสาร',
        className: 'text-gray-600',
        render: (item) => `${item.documentCount} ไฟล์`,
      },
      {
        key: 'actions',
        header: 'การจัดการ',
        render: (item) => (
          <button
            type="button"
            onClick={() => navigate(`/admin/kyc/${item.id}`)}
            className="inline-flex h-8 cursor-pointer items-center rounded-md bg-[#059669] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#047857]"
          >
            ตรวจสอบ
          </button>
        ),
      },
    ],
    [navigate],
  );

  const photoColumns = useMemo<DataTableColumn<ProfilePhotoQueueItem>[]>(
    () => [
      {
        key: 'caregiverNumber',
        header: 'เลขประจำตัว',
        render: (item) => <div className="text-gray-900">{item.caregiverNumber || item.caregiverId.substring(0, 8)}</div>,
      },
      {
        key: 'fullName',
        header: 'ชื่อผู้ดูแล',
        render: (item) => (
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-xs font-bold text-[#0D9488]">
              {item.fullName.charAt(0) || 'K'}
            </div>
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{item.fullName || '-'}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'email',
        header: 'อีเมล',
        className: 'truncate text-gray-500',
        render: (item) => item.email,
      },
      {
        key: 'uploadedAt',
        header: 'อัปโหลดเมื่อ',
        className: 'text-gray-500',
        render: (item) => formatSubmittedDate(item.uploadedAt),
      },
      {
        key: 'requestType',
        header: 'ประเภทคำขอ',
        render: (item) =>
          item.hasApprovedPhoto ? (
            <StatusBadge label="เปลี่ยนรูป" badgeClass="bg-[#EFF6FF] text-[#1D4ED8]" dotClass="bg-[#2563EB]" />
          ) : (
            <StatusBadge label="รูปแรก" badgeClass="bg-[#FFF1E8] text-[#B4532A]" dotClass="bg-[#C65A3A]" />
          ),
      },
      {
        key: 'kycStatus',
        header: 'สถานะ KYC',
        render: (item) => renderKycStatusBadge(item.kycStatus),
      },
      {
        key: 'actions',
        header: 'การจัดการ',
        render: (item) => (
          <button
            type="button"
            onClick={() => navigate(`/admin/kyc/${item.caregiverId}/profile-photo`)}
            className="inline-flex h-8 cursor-pointer items-center rounded-md bg-[#059669] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#047857]"
          >
            ตรวจสอบ
          </button>
        ),
      },
    ],
    [navigate],
  );

  const renderTableError = (tableError: Error) => (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <Icon name="error" variant="outlined" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">
        {isPhotoTab ? 'โหลดคิวรูปโปรไฟล์ไม่สำเร็จ' : 'โหลดรายการ KYC ไม่สำเร็จ'}
      </h2>
      <p className="mt-1 max-w-md text-sm text-gray-500">{tableError.message}</p>
    </div>
  );

  const tableEmpty = (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#0D9488]">
        <Icon name={isPhotoTab ? 'face' : 'verified_user'} variant="outlined" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-gray-900">{selectedFilter.emptyTitle}</h2>
      <p className="mt-1 max-w-md text-sm text-gray-500">
        {trimmedSearch ? `ไม่พบ caregiver ที่ตรงกับ "${trimmedSearch}" ในแท็บนี้` : selectedFilter.emptyBody}
      </p>
    </div>
  );

  const tableFooter = (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-gray-500">
        แสดง {firstItem}-{lastItem} จาก {total} รายการ
      </p>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );

  return (
    <div className="bg-[#F9FAFB] text-gray-900">
      <section className="mx-auto max-w-[1312px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <FilterTabs
            items={filterTabs}
            activeKey={activeFilter}
            onChange={(filter) => {
              setActiveFilter(filter);
              setPage(1);
            }}
          />

          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="ค้นหาชื่อ caregiver"
            ariaLabel="ค้นหาชื่อ caregiver"
            className="xl:max-w-[411px]"
          />
        </div>

        {isPhotoTab ? (
          <DataTable
            columns={photoColumns}
            items={photoItems}
            getRowKey={(item) => item.documentId}
            gridTemplateColumns={PHOTO_TABLE_GRID_COLUMNS}
            loading={isPhotoInitialLoading}
            loadingContent={<KycReviewTableSkeleton />}
            error={photoError}
            renderError={renderTableError}
            renderEmpty={tableEmpty}
            footer={tableFooter}
          />
        ) : (
          <DataTable
            columns={columns}
            items={items}
            getRowKey={(item) => item.id}
            gridTemplateColumns={TABLE_GRID_COLUMNS}
            loading={isInitialLoading}
            loadingContent={<KycReviewTableSkeleton />}
            error={error}
            renderError={renderTableError}
            renderEmpty={tableEmpty}
            footer={tableFooter}
          />
        )}
      </section>
    </div>
  );
}
