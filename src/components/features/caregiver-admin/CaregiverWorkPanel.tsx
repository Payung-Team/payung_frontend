import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import Icon from '../../ui/Icon';
import Skeleton from '../../ui/Skeleton';
import { careLevelLabel, formatCareLevelTime } from '../../../lib/careLevels';
import { getBankLabel } from '../../../features/kyc/omiseBanks';
import { serviceTypeLabel } from '../../../lib/serviceTypeLabels';
import { userFacingErrorMessage } from '../../../lib/apolloErrors';
import { ADMIN_CAREGIVER_WORK_INFO } from '../../../graphql/adminCaregiverWork';


interface WorkInfo {
  caregiverId: string;
  isAcceptingJobs: boolean;
  careLevel: string | null;
  careLevelSetAt: string | null;
  careLevelSetByName: string | null;
  availability: { dayOfWeek: number; timeSlot: string }[];
  jobTypes: string[];
  serviceLocations: string[];
  serviceAreaProvince: string | null;
  serviceAreaDistrict: string | null;
  payoutAccount: {
    bankCode: string;
    accountName: string;
    accountNumberLast4: string;
    status: string;
    recipientStatus: string;
    ready: boolean;
    notReadyReason: string | null;
    verifiedAt: string | null;
    updatedAt: string;
  } | null;
}

// day_of_week: 0 = อาทิตย์ … 6 = เสาร์ — แสดงเริ่มจันทร์
const DAYS = [
  { d: 1, label: 'จ.' }, { d: 2, label: 'อ.' }, { d: 3, label: 'พ.' }, { d: 4, label: 'พฤ.' },
  { d: 5, label: 'ศ.' }, { d: 6, label: 'ส.' }, { d: 0, label: 'อา.' },
];
const SLOTS = [
  { key: 'morning', label: 'เช้า', icon: 'wb_twilight' },
  { key: 'afternoon', label: 'บ่าย', icon: 'light_mode' },
  { key: 'evening', label: 'เย็น', icon: 'dark_mode' },
];
const LOCATION_LABEL: Record<string, string> = { at_home: 'ดูแลที่บ้าน', accompany_outside: 'พาไปนอกสถานที่' };
const LEVEL_TONE: Record<string, string> = {
  BASIC: 'bg-sky-50 text-sky-700 ring-sky-200',
  INTERMEDIATE: 'bg-violet-50 text-violet-700 ring-violet-200',
  ADVANCED: 'bg-amber-50 text-amber-700 ring-amber-200',
};
const PAYOUT_REASON: Record<string, string> = {
  NO_ACCOUNT: 'ยังไม่ได้เพิ่มบัญชี',
  PENDING: 'รอ Omise ตรวจสอบบัญชี',
  FAILED: 'Omise ปฏิเสธบัญชี — ผู้ดูแลต้องแก้ไข',
};

function Section({ title, icon, children, right }: { title: string; icon: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-gray-100 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <h5 className="flex items-center gap-2 text-sm font-bold text-[#064E3B]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#059669]">
            <Icon name={icon} variant="outlined" size="small" color="currentColor" />
          </span>
          {title}
        </h5>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function CaregiverWorkPanel({ userId }: { userId: string }) {
  // mount เฉพาะตอนเปิดแท็บนี้ → request ยิงเมื่อแอดมินกดดูเท่านั้น
  const { data, loading, error } = useQuery<{ adminCaregiverWorkInfo: WorkInfo }>(ADMIN_CAREGIVER_WORK_INFO, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const w = data?.adminCaregiverWorkInfo;

  if (loading && !w) {
    return (
      <div className="space-y-4">
        <Skeleton height={96} borderRadius={12} />
        <Skeleton height={180} borderRadius={12} />
        <Skeleton height={120} borderRadius={12} />
      </div>
    );
  }
  if (error || !w) {
    return (
      <div className="flex min-h-60 flex-col items-center justify-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <Icon name="error_outline" variant="outlined" color="currentColor" />
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-900">โหลดข้อมูลการรับงานไม่สำเร็จ</p>
        <p className="mt-1 text-xs text-gray-500">{error ? userFacingErrorMessage(error, 'กรุณาลองใหม่อีกครั้ง') : 'ไม่พบผู้ดูแล'}</p>
      </div>
    );
  }

  const slotSet = new Set(w.availability.map((a) => `${a.dayOfWeek}-${a.timeSlot}`));
  const workDays = new Set(w.availability.map((a) => a.dayOfWeek)).size;
  const levelKey = (w.careLevel ?? '').toUpperCase();
  const pa = w.payoutAccount;

  return (
    <div className="space-y-5">
      {/* ── สถานะรับงาน + ระดับ ── */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <div className={`flex min-w-0 items-center gap-3 rounded-xl p-4 sm:gap-4 sm:p-5 ${w.isAcceptingJobs ? 'bg-emerald-50' : 'bg-gray-100'}`}>
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${w.isAcceptingJobs ? 'bg-[#059669] text-white' : 'bg-gray-300 text-white'}`}>
            <Icon name={w.isAcceptingJobs ? 'work' : 'work_off'} variant="outlined" color="currentColor" />
          </span>
          <div>
            <p className="text-xs text-gray-500">สถานะการรับงาน</p>
            <p className={`text-lg font-bold ${w.isAcceptingJobs ? 'text-[#047857]' : 'text-gray-600'}`}>
              {w.isAcceptingJobs ? 'เปิดรับงาน' : 'ปิดรับงาน (พัก)'}
            </p>
            <p className="text-xs text-gray-500">
              {w.isAcceptingJobs ? 'แสดงในผลค้นหา ผู้ใช้จองได้' : 'ไม่แสดงในผลค้นหา'}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-100 p-4 sm:gap-4 sm:p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Icon name="military_tech" variant="outlined" color="currentColor" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-gray-500">ระดับผู้ดูแล</p>
            {w.careLevel ? (
              <span className={`mt-0.5 inline-flex rounded-full px-3 py-0.5 text-sm font-bold ring-1 ${LEVEL_TONE[levelKey] ?? 'bg-gray-50 text-gray-700 ring-gray-200'}`}>
                {careLevelLabel(w.careLevel)}
              </span>
            ) : (
              <p className="text-sm font-semibold text-gray-400">ยังไม่มีระดับ</p>
            )}
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              {w.careLevelSetAt
                ? `กำหนดเมื่อ ${formatCareLevelTime(w.careLevelSetAt)}${w.careLevelSetByName ? ` · โดย ${w.careLevelSetByName}` : ''}`
                : w.careLevel
                  ? 'ค่าจากระบบเดิม ยังไม่ผ่านการทบทวนของแอดมิน'
                  : 'กำหนดตอนอนุมัติ KYC'}
            </p>
          </div>
        </div>
      </div>

      {/* ── ตารางวันรับงาน ── */}
      <Section
        title="วันและช่วงเวลาที่รับงาน"
        icon="calendar_month"
        right={<span className="text-xs text-gray-500">{workDays} วัน/สัปดาห์ · {w.availability.length} ช่วง</span>}
      >
        {w.availability.length === 0 ? (
          <p className="text-sm text-gray-400">ผู้ดูแลยังไม่ได้ตั้งวันรับงาน</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-72 table-fixed border-separate border-spacing-1 sm:border-spacing-1.5 text-center">
              <thead>
                <tr>
                  <th className="w-14 sm:w-16" />
                  {DAYS.map((d) => (
                    <th key={d.d} className={`text-xs font-semibold ${d.d === 0 || d.d === 6 ? 'text-rose-500' : 'text-gray-600'}`}>
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SLOTS.map((s) => (
                  <tr key={s.key}>
                    <td className="text-left text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Icon name={s.icon} variant="outlined" size="small" color="currentColor" />
                        {s.label}
                      </span>
                    </td>
                    {DAYS.map((d) => {
                      const on = slotSet.has(`${d.d}-${s.key}`);
                      return (
                        <td key={d.d}>
                          <span
                            className={`flex h-8 items-center justify-center rounded-md text-xs font-bold sm:h-9 sm:rounded-lg ${on ? 'bg-[#059669] text-white' : 'bg-gray-50 text-gray-300'}`}
                            title={`${d.label} ${s.label}: ${on ? 'รับงาน' : 'ไม่รับ'}`}
                          >
                            {on ? '✓' : '–'}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-400">ประเภทงานที่รับ</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {w.jobTypes.length ? w.jobTypes.map((j) => (
                <span key={j} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{serviceTypeLabel(j)}</span>
              )) : <span className="text-gray-400">-</span>}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400">รูปแบบการดูแล</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {w.serviceLocations.length ? w.serviceLocations.map((l) => (
                <span key={l} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{LOCATION_LABEL[l] ?? l}</span>
              )) : <span className="text-gray-400">-</span>}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400">พื้นที่ให้บริการ</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {[w.serviceAreaDistrict, w.serviceAreaProvince].filter(Boolean).join(', ') || '-'}
            </p>
          </div>
        </div>
      </Section>

      {/* ── บัญชีรับเงิน ── */}
      <Section
        title="บัญชีธนาคารรับเงิน"
        icon="account_balance"
        right={
          pa && (
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${pa.ready ? 'bg-emerald-50 text-emerald-700' : pa.notReadyReason === 'FAILED' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${pa.ready ? 'bg-emerald-500' : pa.notReadyReason === 'FAILED' ? 'bg-red-500' : 'bg-amber-500'}`} />
              {pa.ready ? 'พร้อมรับโอน' : PAYOUT_REASON[pa.notReadyReason ?? ''] ?? 'ยังไม่พร้อม'}
            </span>
          )
        }
      >
        {pa ? (
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            {/* การ์ดบัญชี */}
            <div className="w-full max-w-sm rounded-xl bg-gradient-to-br from-[#064E3B] to-[#059669] p-5 text-white shadow-sm">
              <p className="text-xs opacity-80">{getBankLabel(pa.bankCode)}</p>
              <p className="mt-4 font-mono text-lg tracking-widest">•••• •• {pa.accountNumberLast4}</p>
              <p className="mt-3 truncate text-sm font-semibold">{pa.accountName}</p>
            </div>
            <dl className="grid w-full min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-xs">
              <dt className="text-gray-500">สถานะ Omise</dt>
              <dd className="font-semibold text-gray-900">{pa.recipientStatus}</dd>
              <dt className="text-gray-500">ยืนยันเมื่อ</dt>
              <dd className="font-semibold text-gray-900">{pa.verifiedAt ? formatCareLevelTime(pa.verifiedAt) : '-'}</dd>
              <dt className="text-gray-500">แก้ไขล่าสุด</dt>
              <dd className="font-semibold text-gray-900">{formatCareLevelTime(pa.updatedAt)}</dd>
              <dt className="col-span-2 mt-1 text-[11px] text-gray-400">แสดงเลขบัญชีเฉพาะ 4 ตัวท้ายเพื่อความปลอดภัย</dt>
            </dl>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <Icon name="warning_amber" variant="outlined" color="currentColor" />
            ผู้ดูแลยังไม่ได้เพิ่มบัญชีรับเงิน — จะยังรับโอนค่าจ้างไม่ได้
          </div>
        )}
      </Section>
    </div>
  );
}
