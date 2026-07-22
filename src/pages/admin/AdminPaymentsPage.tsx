import { useMemo, useState, useCallback } from 'react';
import Icon from '../../components/ui/Icon';
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable';
import FilterTabs, { type FilterTabItem } from '../../components/ui/FilterTabs';
import Pagination from '../../components/ui/Pagination';
import DisputeResolveModal, { type DisputeResolveMode } from '../../components/ui/DisputeResolveModal';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
// TODO: uncomment when backend is ready
// import { useQuery, useMutation } from '@apollo/client/react';
// import { ADMIN_PENDING_TRANSFERS, ADMIN_DISPUTES, ADMIN_REFUND_HISTORY, RESOLVE_DISPUTE } from '../../graphql/queries';

// ─── Types ─────────────────────────────────────────────────────────────────

type PaymentTabKey = 'pending_transfers' | 'disputes' | 'refund_history';

interface PendingTransfer {
  id: string;
  caregiverName: string;
  bookingId: string;
  amount: number;
  serviceDate: string;
  status: 'pending' | 'processing';
}

interface Dispute {
  id: string;
  bookingId: string;
  patientName: string;
  caregiverName: string;
  reason: string;
  flaggedAt: string;
  paymentAmount: number;
  serviceType: string;
  bookingDate: string;
  disputeReason: string;
}

interface RefundRecord {
  id: string;
  bookingId: string;
  patientName: string;
  amount: number;
  resolution: 'refund_full' | 'refund_partial' | 'no_refund';
  resolvedBy: string;
  resolvedAt: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────

const MOCK_PENDING_TRANSFERS: PendingTransfer[] = [
  { id: 'TRF-001', caregiverName: 'พรพิมล รักษ์ดี', bookingId: 'BK-2024-0891', amount: 1350, serviceDate: '2024-06-20', status: 'pending' },
  { id: 'TRF-002', caregiverName: 'สมหญิง ใจงาม', bookingId: 'BK-2024-0895', amount: 1800, serviceDate: '2024-06-21', status: 'pending' },
  { id: 'TRF-003', caregiverName: 'วิไล สุขใจ', bookingId: 'BK-2024-0902', amount: 2250, serviceDate: '2024-06-22', status: 'processing' },
  { id: 'TRF-004', caregiverName: 'นภา แสงทอง', bookingId: 'BK-2024-0908', amount: 1500, serviceDate: '2024-06-23', status: 'pending' },
  { id: 'TRF-005', caregiverName: 'กมล ศรีสุข', bookingId: 'BK-2024-0915', amount: 2700, serviceDate: '2024-06-24', status: 'pending' },
];

const MOCK_DISPUTES: Dispute[] = [
  {
    id: 'DSP-001', bookingId: 'BK-2024-0870', patientName: 'สมชาย ใจดี', caregiverName: 'พรพิมล รักษ์ดี',
    reason: 'บริการไม่ตรงตามที่ตกลง', flaggedAt: '2024-06-18T10:30:00Z',
    paymentAmount: 1500, serviceType: 'ดูแลผู้สูงอายุ', bookingDate: '2024-06-15',
    disputeReason: 'ผู้ดูแลมาสาย 45 นาที และไม่ได้ทำกิจกรรมตามที่ระบุไว้ในการจอง ขอคืนเงินเต็มจำนวน',
  },
  {
    id: 'DSP-002', bookingId: 'BK-2024-0875', patientName: 'วิภา สุขสันต์', caregiverName: 'สมหญิง ใจงาม',
    reason: 'ผู้ดูแลไม่มาตามนัด', flaggedAt: '2024-06-19T14:15:00Z',
    paymentAmount: 2000, serviceType: 'ดูแลผู้ป่วยติดเตียง', bookingDate: '2024-06-17',
    disputeReason: 'ผู้ดูแลไม่มาตามนัดหมายเลย โทรหาไม่รับสาย ต้องการคืนเงิน',
  },
  {
    id: 'DSP-003', bookingId: 'BK-2024-0880', patientName: 'ประเสริฐ มั่นคง', caregiverName: 'วิไล สุขใจ',
    reason: 'คุณภาพบริการไม่ดี', flaggedAt: '2024-06-20T09:00:00Z',
    paymentAmount: 1800, serviceType: 'ดูแลผู้สูงอายุ', bookingDate: '2024-06-18',
    disputeReason: 'ผู้ดูแลทำงานไม่ครบเวลา ออกก่อนเวลา 1 ชั่วโมง ขอคืนเงินบางส่วน',
  },
  {
    id: 'DSP-004', bookingId: 'BK-2024-0885', patientName: 'นิภา รักดี', caregiverName: 'นภา แสงทอง',
    reason: 'เรียกเก็บเงินเกินจริง', flaggedAt: '2024-06-21T16:45:00Z',
    paymentAmount: 2500, serviceType: 'ดูแลผู้ป่วยติดเตียง', bookingDate: '2024-06-19',
    disputeReason: 'ถูกเรียกเก็บเงินเพิ่มเติมนอกเหนือจากที่ตกลงไว้ในแอป',
  },
  {
    id: 'DSP-005', bookingId: 'BK-2024-0890', patientName: 'อรุณ แสงจันทร์', caregiverName: 'กมล ศรีสุข',
    reason: 'พฤติกรรมไม่เหมาะสม', flaggedAt: '2024-06-22T11:20:00Z',
    paymentAmount: 1200, serviceType: 'ดูแลผู้สูงอายุ', bookingDate: '2024-06-20',
    disputeReason: 'ผู้ดูแลมีพฤติกรรมไม่เหมาะสมกับผู้สูงอายุ ขอคืนเงินเต็มจำนวน',
  },
];

const MOCK_REFUND_HISTORY: RefundRecord[] = [
  { id: 'RFD-001', bookingId: 'BK-2024-0850', patientName: 'สุดา มีสุข', amount: 1500, resolution: 'refund_full', resolvedBy: 'Admin สมศักดิ์', resolvedAt: '2024-06-10T15:00:00Z' },
  { id: 'RFD-002', bookingId: 'BK-2024-0855', patientName: 'ชัยวัฒน์ ดีงาม', amount: 750, resolution: 'refund_partial', resolvedBy: 'Admin สมศักดิ์', resolvedAt: '2024-06-12T10:30:00Z' },
  { id: 'RFD-003', bookingId: 'BK-2024-0860', patientName: 'มาลี รุ่งเรือง', amount: 0, resolution: 'no_refund', resolvedBy: 'Super Admin วิชัย', resolvedAt: '2024-06-14T09:15:00Z' },
  { id: 'RFD-004', bookingId: 'BK-2024-0865', patientName: 'ธนา สว่างใจ', amount: 2000, resolution: 'refund_full', resolvedBy: 'Admin สมศักดิ์', resolvedAt: '2024-06-16T14:45:00Z' },
  { id: 'RFD-005', bookingId: 'BK-2024-0868', patientName: 'พิมพ์ใจ อ่อนหวาน', amount: 500, resolution: 'refund_partial', resolvedBy: 'Admin นภา', resolvedAt: '2024-06-17T11:00:00Z' },
];

// ─── Constants ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const TRANSFER_GRID = '120px minmax(140px,1.2fr) 130px 100px 120px 110px minmax(100px,auto)';
const DISPUTE_GRID = '130px minmax(120px,1fr) minmax(120px,1fr) minmax(160px,1.5fr) 130px minmax(110px,auto)';
const REFUND_GRID = '110px 130px minmax(120px,1fr) 100px 130px minmax(120px,1fr) 130px';

const RESOLUTION_LABELS: Record<RefundRecord['resolution'], string> = {
  refund_full: 'คืนเงินเต็ม',
  refund_partial: 'คืนเงินบางส่วน',
  no_refund: 'ไม่คืนเงิน',
};

const TRANSFER_STATUS_META: Record<PendingTransfer['status'], { label: string; badgeClass: string; dotClass: string }> = {
  pending: { label: 'รอดำเนินการ', badgeClass: 'bg-[#FFF1E8] text-[#B4532A]', dotClass: 'bg-[#C65A3A]' },
  processing: { label: 'กำลังดำเนินการ', badgeClass: 'bg-[#EFF6FF] text-[#2563EB]', dotClass: 'bg-[#2563EB]' },
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

function formatCurrency(amount: number) {
  if (amount === 0) return '-';
  return `฿${amount.toLocaleString()}`;
}

function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total, totalPages };
}

// ─── Dispute Detail Panel ──────────────────────────────────────────────────

interface DisputeDetailPanelProps {
  dispute: Dispute;
  onResolve: (mode: DisputeResolveMode) => void;
  onClose: () => void;
}

function DisputeDetailPanel({ dispute, onResolve, onClose }: DisputeDetailPanelProps) {
  return (
    <div className="border-t border-gray-200 bg-[#F9FAFB] px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#064E3B]">
          รายละเอียดข้อพิพาท — {dispute.bookingId}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-600"
          aria-label="ปิดรายละเอียด"
        >
          <span className="material-icons" style={{ fontSize: 18 }}>close</span>
        </button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">ผู้ป่วย</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">{dispute.patientName}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">ผู้ดูแล</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">{dispute.caregiverName}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">ประเภทบริการ</p>
          <p className="mt-0.5 text-sm font-semibold text-gray-900">{dispute.serviceType}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">ยอดชำระ</p>
          <p className="mt-0.5 text-sm font-bold text-[#059669]">{formatCurrency(dispute.paymentAmount)}</p>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="mb-1 text-xs font-semibold text-amber-700">เหตุผลจากผู้ป่วย</p>
        <p className="text-sm leading-relaxed text-gray-700">{dispute.disputeReason}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onResolve('refund_full')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#059669] px-4 py-2 text-xs font-semibold text-white hover:bg-[#047857]"
        >
          <span className="material-icons" style={{ fontSize: 14 }}>payments</span>
          คืนเงินเต็ม
        </button>
        <button
          type="button"
          onClick={() => onResolve('refund_partial')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#D97706] bg-white px-4 py-2 text-xs font-semibold text-[#D97706] hover:bg-amber-50"
        >
          <span className="material-icons" style={{ fontSize: 14 }}>price_change</span>
          คืนเงินบางส่วน
        </button>
        <button
          type="button"
          onClick={() => onResolve('no_refund')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
        >
          <span className="material-icons" style={{ fontSize: 14 }}>block</span>
          ไม่คืนเงิน
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const { toasts, removeToast, success } = useToast();

  const [activeTab, setActiveTab] = useState<PaymentTabKey>('pending_transfers');
  const [page, setPage] = useState(1);
  const [transfers] = useState(MOCK_PENDING_TRANSFERS);
  const [disputes, setDisputes] = useState(MOCK_DISPUTES);
  const [refunds] = useState(MOCK_REFUND_HISTORY);
  const [expandedDisputeId, setExpandedDisputeId] = useState<string | null>(null);
  const [resolveModal, setResolveModal] = useState<{
    dispute: Dispute;
    mode: DisputeResolveMode;
  } | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);

  const filterTabs = useMemo<FilterTabItem<PaymentTabKey>[]>(() => [
    { key: 'pending_transfers', label: 'Pending Transfers', count: transfers.length },
    { key: 'disputes', label: 'Disputes', count: disputes.length },
    { key: 'refund_history', label: 'Refund History', count: refunds.length },
  ], [transfers.length, disputes.length, refunds.length]);

  const activeData = useMemo(() => {
    if (activeTab === 'pending_transfers') return paginate(transfers, page, PAGE_SIZE);
    if (activeTab === 'disputes') return paginate(disputes, page, PAGE_SIZE);
    return paginate(refunds, page, PAGE_SIZE);
  }, [activeTab, transfers, disputes, refunds, page]);

  const { items, total, totalPages } = activeData;
  const firstItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastItem = Math.min(page * PAGE_SIZE, total);

  const expandedDispute = expandedDisputeId
    ? disputes.find((d) => d.id === expandedDisputeId) ?? null
    : null;

  const handleTabChange = useCallback((tab: PaymentTabKey) => {
    setActiveTab(tab);
    setPage(1);
    setExpandedDisputeId(null);
  }, []);

  const handleResolveConfirm = useCallback(async (data: { amount?: number; notes?: string }) => {
    if (!resolveModal) return;
    setResolveLoading(true);

    // Simulate mutation — replace with RESOLVE_DISPUTE when backend is ready
    await new Promise((r) => setTimeout(r, 800));

    const { dispute, mode } = resolveModal;
    const messages: Record<DisputeResolveMode, string> = {
      refund_full: `คืนเงินเต็มจำนวน ฿${dispute.paymentAmount.toLocaleString()} เรียบร้อยแล้ว`,
      refund_partial: `คืนเงินบางส่วน ฿${(data.amount ?? 0).toLocaleString()} เรียบร้อยแล้ว`,
      no_refund: 'ตัดสินไม่คืนเงินเรียบร้อยแล้ว',
    };

    setDisputes((prev) => prev.filter((d) => d.id !== dispute.id));
    setResolveLoading(false);
    setResolveModal(null);
    setExpandedDisputeId(null);
    success(messages[mode]);
  }, [resolveModal, success]);

  const transferColumns = useMemo<DataTableColumn<PendingTransfer>[]>(() => [
    { key: 'id', header: 'Transfer ID', className: 'text-sm font-medium text-gray-700', render: (item) => item.id },
    { key: 'caregiverName', header: 'Caregiver Name', className: 'text-sm text-gray-900', render: (item) => item.caregiverName },
    { key: 'bookingId', header: 'Booking ID', className: 'text-sm text-gray-500', render: (item) => item.bookingId },
    { key: 'amount', header: 'Amount', className: 'text-sm font-semibold text-[#059669]', render: (item) => formatCurrency(item.amount) },
    { key: 'serviceDate', header: 'Service Date', className: 'text-sm text-gray-500', render: (item) => formatDate(item.serviceDate) },
    {
      key: 'status',
      header: 'Status',
      render: (item) => {
        const meta = TRANSFER_STATUS_META[item.status];
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} aria-hidden="true" />
            {meta.label}
          </span>
        );
      },
    },
    // การโอนเงินจริงย้ายไปที่ transferPaymentToCaregiver mutation ผ่านหน้า
    // Admin Exception Controls / payout engine ในรอบถัดไป
  ], []);

  const disputeColumns = useMemo<DataTableColumn<Dispute>[]>(() => [
    { key: 'bookingId', header: 'Booking ID', className: 'text-sm font-medium text-gray-700', render: (item) => item.bookingId },
    { key: 'patientName', header: 'Patient', className: 'text-sm text-gray-900', render: (item) => item.patientName },
    { key: 'caregiverName', header: 'Caregiver', className: 'text-sm text-gray-500', render: (item) => item.caregiverName },
    { key: 'reason', header: 'Reason', className: 'truncate text-sm text-gray-600', render: (item) => item.reason },
    { key: 'flaggedAt', header: 'Flagged At', className: 'text-sm text-gray-500', render: (item) => formatDate(item.flaggedAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (item) => (
        <button
          type="button"
          onClick={() => setExpandedDisputeId((prev) => (prev === item.id ? null : item.id))}
          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold ${
            expandedDisputeId === item.id
              ? 'border-[#059669] bg-emerald-50 text-[#059669]'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="material-icons" style={{ fontSize: 13 }}>
            {expandedDisputeId === item.id ? 'expand_less' : 'visibility'}
          </span>
          ดูรายละเอียด
        </button>
      ),
    },
  ], [expandedDisputeId]);

  const refundColumns = useMemo<DataTableColumn<RefundRecord>[]>(() => [
    { key: 'id', header: 'Refund ID', className: 'text-sm font-medium text-gray-700', render: (item) => item.id },
    { key: 'bookingId', header: 'Booking ID', className: 'text-sm text-gray-500', render: (item) => item.bookingId },
    { key: 'patientName', header: 'Patient', className: 'text-sm text-gray-900', render: (item) => item.patientName },
    { key: 'amount', header: 'Amount', className: 'text-sm font-semibold text-[#059669]', render: (item) => formatCurrency(item.amount) },
    {
      key: 'resolution',
      header: 'Resolution',
      render: (item) => (
        <span className="text-xs font-semibold text-gray-700">{RESOLUTION_LABELS[item.resolution]}</span>
      ),
    },
    { key: 'resolvedBy', header: 'Resolved By', className: 'text-sm text-gray-500', render: (item) => item.resolvedBy },
    { key: 'resolvedAt', header: 'Resolved At', className: 'text-sm text-gray-500', render: (item) => formatDate(item.resolvedAt) },
  ], []);

  const tableConfig = useMemo(() => {
    if (activeTab === 'pending_transfers') {
      return {
        columns: transferColumns as DataTableColumn<PendingTransfer | Dispute | RefundRecord>[],
        grid: TRANSFER_GRID,
        getRowKey: (item: PendingTransfer | Dispute | RefundRecord) => item.id,
        emptyTitle: 'ไม่มีรายการโอนเงินรอดำเนินการ',
        emptyBody: 'รายการโอนเงินให้ผู้ดูแลจะแสดงที่นี่',
        icon: 'account_balance',
      };
    }
    if (activeTab === 'disputes') {
      return {
        columns: disputeColumns as DataTableColumn<PendingTransfer | Dispute | RefundRecord>[],
        grid: DISPUTE_GRID,
        getRowKey: (item: PendingTransfer | Dispute | RefundRecord) => item.id,
        emptyTitle: 'ไม่มีข้อพิพาท',
        emptyBody: 'ข้อพิพาทจากผู้ป่วยจะแสดงที่นี่',
        icon: 'gavel',
      };
    }
    return {
      columns: refundColumns as DataTableColumn<PendingTransfer | Dispute | RefundRecord>[],
      grid: REFUND_GRID,
      getRowKey: (item: PendingTransfer | Dispute | RefundRecord) => item.id,
      emptyTitle: 'ไม่มีประวัติการคืนเงิน',
      emptyBody: 'ประวัติการตัดสินข้อพิพาทจะแสดงที่นี่',
      icon: 'history',
    };
  }, [activeTab, transferColumns, disputeColumns, refundColumns]);

  return (
    <div className="bg-[#F9FAFB] text-gray-900">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <section className="mx-auto max-w-328 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-3">
          <FilterTabs
            items={filterTabs}
            activeKey={activeTab}
            onChange={handleTabChange}
          />
        </div>

        <DataTable
          columns={tableConfig.columns}
          items={items}
          getRowKey={tableConfig.getRowKey}
          gridTemplateColumns={tableConfig.grid}
          renderEmpty={
            <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#0D9488]">
                <Icon name={tableConfig.icon} variant="outlined" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-gray-900">{tableConfig.emptyTitle}</h2>
              <p className="mt-1 max-w-md text-sm text-gray-500">{tableConfig.emptyBody}</p>
            </div>
          }
          footer={
            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-gray-500">
                แสดง {firstItem}-{lastItem} จาก {total} รายการ
              </p>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          }
        />

        {activeTab === 'disputes' && expandedDispute && (
          <div className="mt-0 overflow-hidden rounded-b-xl border border-t-0 border-gray-200 bg-white shadow-sm">
            <DisputeDetailPanel
              dispute={expandedDispute}
              onResolve={(mode) => setResolveModal({ dispute: expandedDispute, mode })}
              onClose={() => setExpandedDisputeId(null)}
            />
          </div>
        )}
      </section>

      <DisputeResolveModal
        isOpen={resolveModal !== null}
        mode={resolveModal?.mode ?? null}
        originalAmount={resolveModal?.dispute.paymentAmount ?? 0}
        isLoading={resolveLoading}
        onClose={() => setResolveModal(null)}
        onConfirm={handleResolveConfirm}
      />
    </div>
  );
}
