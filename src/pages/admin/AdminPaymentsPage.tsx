import Icon from '../../components/ui/Icon';

// TODO: ดึงสถานะการเชื่อมต่อ/บัญชี/public key จริงจาก backend เมื่อพร้อม (ตอนนี้เป็น mock UI)
const OMISE_ACCOUNT_NAME = 'Payung Co., Ltd.';
const OMISE_MASKED_PUBLIC_KEY = 'pkey_test_••••4f2a';
const OMISE_DASHBOARD_URL = 'https://dashboard.omise.co/v2/recipients';

// PYG-320 — หน้า Payment Settings แสดงสถานะการเชื่อมต่อ Omise (แทนที่ mock transactions/disputes เดิม
// ซึ่งย้ายไปอยู่ในหน้า Dispute Review แล้ว)
export default function AdminPaymentsPage() {
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
