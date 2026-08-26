import Icon from '../../components/ui/Icon';

// TODO: ดึงสถานะการเชื่อมต่อ/บัญชี/public key จริงจาก backend เมื่อพร้อม (ตอนนี้เป็น mock UI)
const OMISE_ACCOUNT_NAME = 'Payung Co., Ltd.';
const OMISE_MASKED_PUBLIC_KEY = 'pkey_test_••••4f2a';
const OMISE_DASHBOARD_URL = 'https://dashboard.omise.co/v2/recipients';

// PYG-320 — หน้า Payment Settings แสดงสถานะการเชื่อมต่อ Omise (แทนที่ mock transactions/disputes เดิม
// ซึ่งย้ายไปอยู่ในหน้า Dispute Review แล้ว)
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
      <section className="mx-auto max-w-328 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Icon name="account_balance" variant="outlined" size="medium" />
            </span>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">Omise Payment Gateway</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span>เชื่อมต่อแล้ว</span>
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                <div>
                  <p className="text-xs text-gray-400">บัญชี</p>
                  <p className="text-sm font-semibold text-gray-900">{OMISE_ACCOUNT_NAME}</p>
                </div>
              </div>
            </div>
          </div>

          <a
            href={OMISE_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-600"
          >
            เปิด Omise Dashboard
            <Icon name="open_in_new" size="small" color="currentColor" />
          </a>
        </div>
      </section>
    </div>
  );
}
