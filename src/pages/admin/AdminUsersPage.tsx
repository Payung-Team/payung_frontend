import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  ADMIN_USER_LIST,
  INVITE_ADMIN,
  TOGGLE_ADMIN_STATUS,
  CANCEL_SCHEDULED_DELETE,
  SUSPEND_USER,
  ACTIVATE_USER,
} from '../../graphql/queries';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import DataTableSkeleton from '../../components/ui/DataTableSkeleton';
import FilterTabs, { type FilterTabItem } from '../../components/ui/FilterTabs';
import SearchInput from '../../components/ui/SearchInput';
import Pagination from '../../components/ui/Pagination';

// ─── Types ─────────────────────────────────────────────────────────────────

type RoleFilterKey = 'all' | 'super_admin' | 'admin' | 'caregiver' | 'patient';
type ActionType = 'none' | 'user' | 'admin';

interface UserSummary {
  id: string;
  email: string;
  displayName?: string;
  role: number;
  isActive: boolean;
  isSuspended: boolean;
  createdAt: string;
}

interface AdminUserListResponse {
  list: {
    items: UserSummary[];
    total: number;
    page: number;
    totalPages: number;
  };
  allCount: { total: number };
  superAdminCount: { total: number };
  adminCount: { total: number };
  caregiverCount: { total: number };
  patientCount: { total: number };
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const TABLE_GRID_COLUMNS = 'minmax(160px,1.5fr) minmax(180px,2fr) 140px 200px 140px minmax(130px,auto)';

const ROLE_LABELS: Record<number, { label: string; badgeClass: string; textClass: string }> = {
  1: { label: 'ผู้ใช้', badgeClass: 'bg-gray-100', textClass: 'text-gray-600' },
  2: { label: 'ผู้ดูแล', badgeClass: 'bg-[#FEF3C7]', textClass: 'text-amber-700' },
  3: { label: 'Admin', badgeClass: 'bg-[#C8DBFF]', textClass: 'text-[#4472C4]' },
  4: { label: 'Super Admin', badgeClass: 'bg-[#E8D8FF]', textClass: 'text-[#793DCD]' },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function getInitial(displayName?: string, email?: string) {
  const name = displayName || email || '';
  return name.charAt(0).toUpperCase() || 'A';
}

function getActionType(viewerRole: number, targetRole: number): ActionType {
  if (targetRole >= 3) return viewerRole === 4 ? 'admin' : 'none';
  return viewerRole >= 3 ? 'user' : 'none';
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function UsersTableSkeleton() {
  return (
    <DataTableSkeleton
      rows={8}
      gridTemplateColumns={TABLE_GRID_COLUMNS}
      cells={[
        {
          content: (
            <div className="flex items-center gap-3">
              <Skeleton circle width={28} height={28} />
              <Skeleton width={100} height={14} />
            </div>
          ),
        },
        { width: 140, height: 14 },
        { width: 80, height: 20, borderRadius: 999 },
        { width: 90, height: 20, borderRadius: 999 },
        { width: 80, height: 14 },
        { width: 100, height: 23, borderRadius: 6 },
      ]}
    />
  );
}

// ─── Invite Modal ──────────────────────────────────────────────────────────

interface InviteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function InviteAdminModal({ onClose, onSuccess }: Readonly<InviteModalProps>) {
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', role: 3 });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const [inviteAdmin, { loading }] = useMutation(INVITE_ADMIN, {
    onCompleted: () => { onSuccess(); },
    onError: (err) => { setSubmitError(err.message); },
  });

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = 'กรุณากรอกอีเมล';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    if (!form.firstName.trim()) errs.firstName = 'กรุณากรอกชื่อ';
    if (!form.lastName.trim()) errs.lastName = 'กรุณากรอกนามสกุล';
    return errs;
  }

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    inviteAdmin({
      variables: {
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      },
    });
  }

  return (
    <dialog open className="fixed inset-0 z-50 m-0 flex h-screen w-screen max-w-none items-center justify-center p-0">
      <button type="button" aria-label="ปิด" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-[#064E3B]" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
              เชิญ Admin ใหม่
            </h2>
            <p className="mt-0.5 text-xs text-gray-500" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
              ระบบจะส่งรหัสผ่านชั่วคราวไปยังอีเมลที่กรอก
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="invite-firstName" className="mb-1 block text-xs font-semibold text-gray-600" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
                ชื่อ
              </label>
              <input
                id="invite-firstName"
                type="text"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#059669]/40 ${fieldErrors.firstName ? 'border-red-400' : 'border-gray-200'}`}
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
                placeholder="ชื่อ"
              />
              {fieldErrors.firstName && <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>}
            </div>
            <div>
              <label htmlFor="invite-lastName" className="mb-1 block text-xs font-semibold text-gray-600" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
                นามสกุล
              </label>
              <input
                id="invite-lastName"
                type="text"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#059669]/40 ${fieldErrors.lastName ? 'border-red-400' : 'border-gray-200'}`}
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
                placeholder="นามสกุล"
              />
              {fieldErrors.lastName && <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="invite-email" className="mb-1 block text-xs font-semibold text-gray-600" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
              อีเมล
            </label>
            <input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#059669]/40 ${fieldErrors.email ? 'border-red-400' : 'border-gray-200'}`}
              style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              placeholder="admin@example.com"
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="invite-role" className="mb-1 block text-xs font-semibold text-gray-600" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
              บทบาท
            </label>
            <select
              id="invite-role"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: Number.parseInt(e.target.value, 10) }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#059669]/40"
              style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
            >
              <option value={3}>Admin</option>
              <option value={4}>Super Admin</option>
            </select>
          </div>

          {submitError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
              {submitError}
            </div>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-[#059669] px-4 py-2 text-xs font-semibold text-white hover:bg-[#047857] disabled:opacity-60"
              style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
            >
              {loading && <span className="material-icons animate-spin text-sm">refresh</span>}
              ส่งคำเชิญ
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

// ─── Confirm Deactivate Modal ──────────────────────────────────────────────

interface ConfirmDeactivateProps {
  user: UserSummary;
  isAdminTarget: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}

function ConfirmDeactivateModal({ user, isAdminTarget, onClose, onConfirm, loading }: Readonly<ConfirmDeactivateProps>) {
  const name = user.displayName || user.email;
  return (
    <dialog open className="fixed inset-0 z-50 m-0 flex h-screen w-screen max-w-none items-center justify-center p-0">
      <button type="button" aria-label="ปิด" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <span className="material-icons text-red-500">person_off</span>
        </div>
        <h2 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
          ปิดการใช้งานบัญชี
        </h2>
        <p className="mt-1 text-xs text-gray-500" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
          คุณต้องการปิดการใช้งานบัญชีของ <span className="font-semibold text-gray-700">{name}</span> หรือไม่?{' '}
          {isAdminTarget
            ? 'บัญชีจะถูกระงับทันทีและจะถูกลบถาวรหลังจากสิ้นสุด grace period'
            : 'บัญชีจะถูกระงับทันที'}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
            style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
          >
            {loading && <span className="material-icons animate-spin text-sm">refresh</span>}
            ปิดการใช้งาน
          </button>
        </div>
      </div>
    </dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const viewerRole = userRole ?? 3;
  const isSuperAdmin = viewerRole === 4;

  const [activeFilter, setActiveFilter] = useState<RoleFilterKey>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<UserSummary | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const trimmedSearch = search.trim();
  const roleVariable = activeFilter === 'all' ? undefined : activeFilter;

  const { data, loading: queryLoading, error: queryError, refetch } = useQuery<AdminUserListResponse>(
    ADMIN_USER_LIST,
    {
      variables: {
        role: roleVariable,
        search: trimmedSearch || undefined,
        page,
        limit: PAGE_SIZE,
        countSearch: trimmedSearch || undefined,
      },
      fetchPolicy: 'cache-and-network',
    },
  );

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const [toggleStatus, { loading: toggleLoading }] = useMutation(TOGGLE_ADMIN_STATUS, {
    onCompleted: () => { showToast('อัปเดตสถานะเรียบร้อย', 'success'); setConfirmDeactivate(null); refetch(); },
    onError: (err) => { showToast(err.message, 'error'); setConfirmDeactivate(null); },
  });

  const [cancelDelete, { loading: cancelLoading }] = useMutation(CANCEL_SCHEDULED_DELETE, {
    onCompleted: () => { showToast('เปิดใช้งานบัญชีเรียบร้อย', 'success'); refetch(); },
    onError: (err) => { showToast(err.message, 'error'); },
  });

  const [suspendUser, { loading: suspendLoading }] = useMutation(SUSPEND_USER, {
    onCompleted: () => { showToast('ปิดการใช้งานบัญชีเรียบร้อย', 'success'); setConfirmDeactivate(null); refetch(); },
    onError: (err) => { showToast(err.message, 'error'); setConfirmDeactivate(null); },
  });

  const [activateUser, { loading: activateLoading }] = useMutation(ACTIVATE_USER, {
    onCompleted: () => { showToast('เปิดใช้งานบัญชีเรียบร้อย', 'success'); refetch(); },
    onError: (err) => { showToast(err.message, 'error'); },
  });

  const handleDeactivate = useCallback((target: UserSummary) => {
    if (target.role >= 3) {
      toggleStatus({ variables: { adminId: target.id, isActive: false } });
    } else {
      suspendUser({ variables: { userId: target.id } });
    }
  }, [toggleStatus, suspendUser]);

  const handleActivate = useCallback((target: UserSummary) => {
    if (target.role >= 3) {
      cancelDelete({ variables: { adminId: target.id } });
    } else {
      activateUser({ variables: { userId: target.id } });
    }
  }, [cancelDelete, activateUser]);

  const items = data?.list.items ?? [];
  const totalItems = data?.list.total ?? 0;
  const totalPages = data?.list.totalPages ?? 1;
  const firstItem = totalItems === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, totalItems);

  const filterTabs = useMemo<FilterTabItem<RoleFilterKey>[]>(() => [
    { key: 'all', label: 'ทั้งหมด', count: data?.allCount.total ?? 0 },
    { key: 'super_admin', label: 'Super Admin', count: data?.superAdminCount.total ?? 0 },
    { key: 'admin', label: 'Admin', count: data?.adminCount.total ?? 0 },
    { key: 'caregiver', label: 'ผู้ดูแล', count: data?.caregiverCount.total ?? 0 },
    { key: 'patient', label: 'ผู้ใช้', count: data?.patientCount.total ?? 0 },
  ], [data]);

  const isLoading = queryLoading && !data;
  const actionLoading = toggleLoading || cancelLoading || suspendLoading || activateLoading;

  const columns = useMemo<DataTableColumn<UserSummary>[]>(() => [
    {
      key: 'displayName',
      header: 'ชื่อ',
      render: (item) => (
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#D1FAE5] text-xs font-bold text-[#0D9488]">
            {getInitial(item.displayName, item.email)}
          </div>
          <span className="truncate text-sm font-medium text-gray-900">
            {item.displayName || '-'}
          </span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'อีเมล',
      className: 'truncate text-sm text-gray-500',
      render: (item) => item.email,
    },
    {
      key: 'role',
      header: 'บทบาท',
      render: (item) => {
        const meta = ROLE_LABELS[item.role];
        if (!meta) return <span className="text-xs text-gray-400">-</span>;
        return (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass} ${meta.textClass}`}
            style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'สถานะ',
      render: (item) => {
        const isActive = item.isActive && !item.isSuspended;
        if (isActive) {
          return (
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-xs font-semibold text-[#1B6B3A]"
              style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#059669]" aria-hidden="true"></span>
              {'เปิดใช้งาน'}
            </span>
          );
        }
        return (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500"
            style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" aria-hidden="true"></span>
            {'ถูกปิดใช้งาน'}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'วันที่สร้าง',
      className: 'text-sm text-gray-500',
      render: (item) => formatDate(item.createdAt),
    },
    {
      key: 'actions',
      header: 'จัดการ',
      render: (item) => {
        const action = getActionType(viewerRole, item.role);
        if (action === 'none') return <span className="text-xs text-gray-400">-</span>;

        const isActive = item.isActive && !item.isSuspended;
        const isCaregiver = item.role === 2;

        return (
          <div className="flex items-center gap-2">
            {isCaregiver && (
              <button
                type="button"
                onClick={() => navigate(`/admin/users/${item.id}`)}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              >
                แก้ไข
              </button>
            )}
            {isActive ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmDeactivate(item)}
                className="inline-flex items-center gap-1 rounded-md border border-[#F7C1C1] px-2.5 py-1 text-xs font-semibold text-red-500 hover:bg-red-50 disabled:opacity-50"
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              >
                ปิดใช้งาน
              </button>
            ) : (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleActivate(item)}
                className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              >
                เปิดใช้งาน
              </button>
            )}
          </div>
        );
      },
    },
  ], [viewerRole, actionLoading, handleActivate, navigate]);

  return (
    <div className="bg-[#F9FAFB] text-gray-900">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-5 top-5 z-60 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-[#059669]' : 'bg-red-500'}`}
          style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
        >
          <span className="material-icons text-base">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}

      <section className="mx-auto max-w-328 px-4 py-6 sm:px-6 lg:px-8">
        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <FilterTabs
            items={filterTabs}
            activeKey={activeFilter}
            onChange={(filter) => {
              setActiveFilter(filter);
              setPage(1);
            }}
          />

          <div className="flex items-center gap-2">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อ, อีเมล..."
              ariaLabel="ค้นหาชื่อหรืออีเมล"
              className="xl:max-w-102.75"
            />

            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-[#059669] px-3 py-2 text-xs font-semibold text-white hover:bg-[#047857]"
                style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}
              >
                <span className="material-icons text-base" aria-hidden="true">person_add</span>
                {'เชิญ Admin ใหม่'}
              </button>
            )}
          </div>
        </div>

        <DataTable
          columns={columns}
          items={items}
          getRowKey={(item) => item.id}
          gridTemplateColumns={TABLE_GRID_COLUMNS}
          loading={isLoading}
          loadingContent={<UsersTableSkeleton />}
          error={queryError}
          renderError={(err) => (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Icon name="error" variant="outlined" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">โหลดรายการผู้ใช้ไม่สำเร็จ</h2>
              <p className="mt-1 max-w-md text-sm text-gray-500">{err.message}</p>
            </div>
          )}
          renderEmpty={
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#0D9488]">
                <Icon name="people" variant="outlined" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">ไม่พบรายการผู้ใช้</h2>
              <p className="mt-1 max-w-md text-sm text-gray-500">
                {trimmedSearch
                  ? `ไม่พบผู้ใช้ที่ตรงกับ "${trimmedSearch}"`
                  : 'ยังไม่มีผู้ใช้ในแท็บนี้'}
              </p>
            </div>
          }
          footer={
            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500" style={{ fontFamily: 'Bai Jamjuree, sans-serif' }}>
                แสดง {firstItem}-{lastItem} จาก {totalItems} รายการ
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          }
        />
      </section>

      {/* Modals */}
      {showInviteModal && (
        <InviteAdminModal
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            showToast('ส่งคำเชิญเรียบร้อยแล้ว', 'success');
            refetch();
          }}
        />
      )}

      {confirmDeactivate && (
        <ConfirmDeactivateModal
          user={confirmDeactivate}
          isAdminTarget={confirmDeactivate.role >= 3}
          onClose={() => setConfirmDeactivate(null)}
          onConfirm={() => handleDeactivate(confirmDeactivate)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
