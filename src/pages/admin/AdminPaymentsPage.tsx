import { useEffect, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import Icon from '../../components/ui/Icon';
import AdminBookingsTable from '../../components/features/payment/AdminBookingsTable';

// TODO: ดึงสถานะการเชื่อมต่อ/บัญชี/public key จริงจาก backend เมื่อพร้อม (ตอนนี้เป็น mock UI)
const OMISE_ACCOUNT_NAME = 'Payung Co., Ltd.';
const OMISE_DASHBOARD_URL = 'https://dashboard.omise.co/v2/recipients';

// PYG-320 — หน้า Payment Settings แสดงสถานะการเชื่อมต่อ Omise (แทนที่ mock transactions/disputes เดิม
// ซึ่งย้ายไปอยู่ในหน้า Dispute Review แล้ว)
// เวลาที่ดึงรายการจองจาก server ล่าสุด — อยู่ระดับ module เพื่อให้อายุเท่ากับ Apollo cache
// (หายพร้อมกันตอนรีโหลดหน้า) ออกไปหน้ารายละเอียดแล้วกลับมาเวลายังถูกต้อง
let lastFetchedAt: Date | null = null;

export default function AdminPaymentsPage() {
  const client = useApolloClient();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(lastFetchedAt);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // เข้าหน้าครั้งแรกของ session — ตารางกำลังดึงจาก server
  useEffect(() => {
    if (!lastFetchedAt) {
      lastFetchedAt = new Date();
      setLastUpdated(lastFetchedAt);
    }
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // ล้าง adminBookings ทุกหน้า/ตัวกรองที่จำไว้ แล้วดึงใหม่เฉพาะ query ที่แสดงอยู่ (1 request)
      await client.refetchQueries({
        updateCache(cache) {
          cache.evict({ id: 'ROOT_QUERY', fieldName: 'adminBookings' });
        },
      });
      lastFetchedAt = new Date();
      setLastUpdated(lastFetchedAt);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="bg-[#F9FAFB] text-gray-900">
      <section className="mx-auto flex max-w-328 flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* Refresh bar — แบบเดียวกับหน้า Dashboard */}
        <div className="-mb-1 flex items-center justify-end gap-2.5">
          {lastUpdated && (
            <span className="text-[11px] text-gray-400">
              อัปเดตล่าสุด{' '}
              {lastUpdated.toLocaleTimeString('th-TH-u-ca-gregory', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={`material-icons${isRefreshing ? ' animate-spin' : ''}`} style={{ fontSize: 14 }}>
              refresh
            </span>
            {isRefreshing ? 'กำลังโหลด...' : 'Refresh'}
          </button>
        </div>

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

        <AdminBookingsTable />
      </section>
    </div>
  );
}
