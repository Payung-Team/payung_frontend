import { useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { ADMIN_PATIENT_PROFILE } from '../../graphql/adminPatientProfile';
import Icon from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import Avatar from '../../components/ui/Avatar';
import { userFacingErrorMessage } from '../../lib/apolloErrors';
import { serviceTypeLabel } from '../../lib/serviceTypeLabels';
import { ADL_ITEMS, ADL_MAX_TOTAL, ASSESSMENT_STRINGS, chosenFlagLabels } from '../../lib/assessmentStrings';
import { SERVICE_PACKAGE_STRINGS, careGroupLabel } from '../../lib/servicePackageStrings';
import { BookingStatusBadge } from '../../components/features/payment/BookingStatusBadges';
import { formatTHB, formatThaiDate, formatThaiDateTime } from '../../components/features/payment/bookingMeta';

interface Assessment {
  answers: { code: string; value: number | null }[];
  adlTotalScore: number;
  unsureCount: number;
  flags: string[];
  noSpecialConditions: boolean;
  hasUnsureFlag: boolean;
  dementiaSevere: boolean | null;
  careGroup: string | null;
  assessedByName: string | null;
  assessedAt: string;
}

interface Recipient {
  id: string;
  name: string;
  nickname: string | null;
  isSelf: boolean;
  dateOfBirth: string | null;
  gender: string | null;
  weightKg: number | null;
  heightCm: number | null;
  bloodType: string | null;
  mobilityLevel: string | null;
  medicalConditions: string[];
  currentMedications: string | null;
  allergies: string | null;
  hasInfectiousDisease: boolean | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRel: string | null;
  preferredHospital: string | null;
  careNotes: string | null;
  assessment: Assessment | null;
}

interface Profile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  address: string | null;
  isActive: boolean;
  isSuspended: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  bookingStats: { total: number; active: number; completed: number; cancelled: number; totalPaid: number };
  recentBookings: {
    id: string;
    status: string;
    bookingDate: string;
    serviceType: string;
    estimatedCost: number | null;
    caregiverName: string | null;
    careRecipientName: string | null;
  }[];
  careRecipients: Recipient[];
}

const AS = ASSESSMENT_STRINGS.th;
const GENDER: Record<string, string> = { male: 'ชาย', female: 'หญิง' };
const MOBILITY: Record<string, string> = {
  independent: 'เดินได้เอง',
  assisted: 'ต้องมีคนช่วยพยุง',
  wheelchair: 'ใช้รถเข็น',
  bedridden: 'ติดเตียง',
};
/** กลุ่มตามคะแนน ADL (PYG-613): social 12–20 · homebound 5–11 · bedridden 0–4 */
const GROUP_TONE: Record<string, { bar: string; chip: string; icon: string }> = {
  SOCIAL: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: 'directions_walk' },
  HOMEBOUND: { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200', icon: 'home' },
  BEDRIDDEN: { bar: 'bg-rose-500', chip: 'bg-rose-50 text-rose-700 ring-rose-200', icon: 'airline_seat_flat' },
};

const ageOf = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
};
const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('') || '?';
const adlText = (code: string) => (AS.adl as Record<string, { title: string; options: Record<number, { label: string }> }>)[code];

function Card({ title, icon, right, children, className = '' }: { title: string; icon: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#059669]">
            <Icon name={icon} variant="outlined" size="small" color="currentColor" />
          </span>
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-400">{label}</p>
      <div className="mt-0.5 break-words text-sm font-medium text-gray-900">{children || '-'}</div>
    </div>
  );
}

/** คะแนน ADL รวม + แถบกลุ่ม + รายข้อ */
function AdlBlock({ a }: { a: Assessment }) {
  const group = (a.careGroup ?? '').toUpperCase();
  const tone = GROUP_TONE[group] ?? { bar: 'bg-gray-400', chip: 'bg-gray-50 text-gray-700 ring-gray-200', icon: 'help_outline' };
  const pct = Math.min(100, (a.adlTotalScore / ADL_MAX_TOTAL) * 100);
  const flagLabels = chosenFlagLabels(AS, a.flags, a.dementiaSevere);
  const maxOf = Object.fromEntries(ADL_ITEMS.map((i) => [i.code, i.maxScore])) as Record<string, number>;

  return (
    <div className="space-y-5">
      {/* คะแนนรวม */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900">{a.adlTotalScore}</span>
          <span className="text-sm text-gray-400">/ {ADL_MAX_TOTAL} คะแนน</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${tone.chip}`}>
              <Icon name={tone.icon} variant="outlined" size="small" color="currentColor" />
              {a.careGroup ? careGroupLabel(SERVICE_PACKAGE_STRINGS.th, group) : 'ยังไม่ได้จัดกลุ่ม'}
            </span>
            {a.hasUnsureFlag && (
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                ตอบ "ไม่แน่ใจ" {a.unsureCount} ข้อ — ควรประเมินซ้ำ
              </span>
            )}
          </div>
          {/* แถบคะแนนพร้อมช่วงกลุ่ม 0–4 / 5–11 / 12–20 */}
          <div className="relative h-3 overflow-hidden rounded-full bg-gray-100">
            <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${pct}%` }} />
            <span className="absolute inset-y-0 w-px bg-white" style={{ left: `${(5 / ADL_MAX_TOTAL) * 100}%` }} />
            <span className="absolute inset-y-0 w-px bg-white" style={{ left: `${(12 / ADL_MAX_TOTAL) * 100}%` }} />
          </div>
          <div className="mt-1 grid text-[10px] text-gray-400" style={{ gridTemplateColumns: '5fr 7fr 9fr' }}>
            <span>ติดเตียง 0–4</span>
            <span>ติดบ้าน 5–11</span>
            <span className="text-right">ติดสังคม 12–20</span>
          </div>
        </div>
      </div>

      {/* รายข้อ */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {a.answers.map((ans) => {
          const t = adlText(ans.code);
          const max = maxOf[ans.code] ?? 1;
          const unsure = ans.value == null;
          const full = !unsure && ans.value === max;
          return (
            <div key={ans.code} className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">{t?.title ?? ans.code}</p>
                <p className={`truncate text-xs ${unsure ? 'text-orange-600' : 'text-gray-500'}`}>
                  {unsure ? 'ไม่แน่ใจ' : t?.options[ans.value!]?.label ?? '-'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1" title={`${ans.value ?? 0}/${max}`}>
                {Array.from({ length: max }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 w-4 rounded-full ${!unsure && i < (ans.value ?? 0) ? (full ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-gray-200'}`}
                  />
                ))}
                <span className="ml-1 w-7 text-right text-xs font-bold text-gray-700">
                  {ans.value ?? 0}/{max}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* เงื่อนไขพิเศษ */}
      <div>
        <p className="mb-2 text-xs font-semibold text-gray-500">เงื่อนไขพิเศษ</p>
        {flagLabels.length ? (
          <div className="flex flex-wrap gap-1.5">
            {flagLabels.map((l) => (
              <span key={l} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                <Icon name="priority_high" size="small" color="currentColor" />
                {l}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">{a.noSpecialConditions ? 'ไม่มีเงื่อนไขพิเศษ' : '-'}</p>
        )}
      </div>

      <p className="text-[11px] text-gray-400">
        ประเมินเมื่อ {formatThaiDateTime(a.assessedAt)}
        {a.assessedByName ? ` · โดย ${a.assessedByName}` : ''} · ญาติเป็นผู้ประเมิน ไม่ใช่การวินิจฉัยทางการแพทย์
      </p>
    </div>
  );
}

function RecipientCard({ r }: { r: Recipient }) {
  const age = ageOf(r.dateOfBirth);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Info label="อายุ / เพศ">{[age != null ? `${age} ปี` : null, r.gender ? GENDER[r.gender] ?? r.gender : null].filter(Boolean).join(' · ')}</Info>
        <Info label="น้ำหนัก / ส่วนสูง">
          {r.weightKg || r.heightCm ? `${r.weightKg ?? '-'} กก. / ${r.heightCm ?? '-'} ซม.` : null}
        </Info>
        <Info label="กรุ๊ปเลือด">{r.bloodType}</Info>
        <Info label="การเคลื่อนไหว">{r.mobilityLevel ? MOBILITY[r.mobilityLevel] ?? r.mobilityLevel : null}</Info>
        <div className="col-span-2">
          <Info label="โรคประจำตัว">
            {r.medicalConditions.length ? (
              <div className="flex flex-wrap gap-1">
                {r.medicalConditions.map((c) => (
                  <span key={c} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-700">{c}</span>
                ))}
              </div>
            ) : null}
          </Info>
        </div>
        <Info label="ยาที่ใช้ประจำ">{r.currentMedications}</Info>
        <Info label="แพ้ยา / อาหาร">{r.allergies && <span className="text-rose-600">{r.allergies}</span>}</Info>
        <Info label="โรคติดเชื้อ">
          {r.hasInfectiousDisease == null ? 'ยังไม่ได้ระบุ' : r.hasInfectiousDisease ? <span className="text-rose-600">มี</span> : 'ไม่มี'}
        </Info>
        <Info label="โรงพยาบาลที่ใช้ประจำ">{r.preferredHospital}</Info>
        <div className="col-span-2">
          <Info label="ผู้ติดต่อฉุกเฉิน">
            {r.emergencyContactName
              ? `${r.emergencyContactName}${r.emergencyContactRel ? ` (${r.emergencyContactRel})` : ''}${r.emergencyContactPhone ? ` · ${r.emergencyContactPhone}` : ''}`
              : null}
          </Info>
        </div>
        {r.careNotes && (
          <div className="col-span-2 sm:col-span-4">
            <Info label="หมายเหตุการดูแล">{r.careNotes}</Info>
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
          <Icon name="monitor_heart" variant="outlined" size="small" color="#059669" />
          ระดับ ADL (Barthel)
        </p>
        {r.assessment ? (
          <AdlBlock a={r.assessment} />
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <Icon name="assignment_late" variant="outlined" color="currentColor" />
            ยังไม่ได้ทำแบบประเมิน ADL
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPatientProfilePage() {
  const { userId = '' } = useParams<{ userId: string }>();
  const [selected, setSelected] = useState(0);
  const { data, loading, error } = useQuery<{ adminPatientProfile: Profile }>(ADMIN_PATIENT_PROFILE, {
    variables: { userId },
    skip: !userId,
    fetchPolicy: 'cache-and-network',
  });
  const p = data?.adminPatientProfile;

  const back = (
    <Link to="/admin/users" className="inline-flex w-fit items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900">
      <Icon name="arrow_back" size="small" color="currentColor" />
      กลับไปหน้าจัดการผู้ใช้
    </Link>
  );
  const shell = (children: ReactNode) => (
    <div className="bg-[#F9FAFB] text-gray-900">
      <div className="mx-auto flex max-w-328 flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6 lg:px-8">
        {back}
        {children}
      </div>
    </div>
  );

  if (loading && !p) {
    return shell(
      <>
        <Skeleton height={150} borderRadius={16} />
        <Skeleton height={420} borderRadius={16} />
      </>,
    );
  }
  if (error || !p) {
    return shell(
      <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500">
          <Icon name="error_outline" variant="outlined" color="currentColor" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-gray-900">โหลดโปรไฟล์ผู้ใช้ไม่สำเร็จ</h2>
        <p className="mt-1 max-w-md text-sm text-gray-500">{error ? userFacingErrorMessage(error, 'กรุณาลองใหม่อีกครั้ง') : 'ไม่พบผู้ใช้'}</p>
      </div>,
    );
  }

  const status = p.isSuspended || !p.isActive
    ? { label: 'ระงับการใช้งาน', cls: 'bg-red-50 text-red-600', dot: 'bg-red-400' }
    : { label: 'เปิดใช้งาน', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  const recipients = p.careRecipients;
  const current = recipients[Math.min(selected, recipients.length - 1)];
  const s = p.bookingStats;

  return shell(
    <>
      {/* ── หัวโปรไฟล์ ── */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 bg-gradient-to-r from-emerald-50 to-white p-5 sm:flex-row sm:items-center">
          {/* Avatar: signed URL จาก BE · โหลดไม่ขึ้น (หมดอายุ/ถูกลบ) → ตัวอักษรแรกแทน */}
          <Avatar name={p.name} src={p.avatarUrl ?? undefined} size={64} className="shrink-0 ring-4 ring-white" fallbackColor="#3B82F6" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold text-gray-900">{p.name}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <div className="mt-1.5 flex flex-col gap-1 text-sm text-gray-600 sm:flex-row sm:flex-wrap sm:gap-x-5">
              {p.phone && <span className="inline-flex items-center gap-1.5"><Icon name="call" size="small" color="#9CA3AF" />{p.phone}</span>}
              {p.email && <span className="inline-flex min-w-0 items-center gap-1.5"><Icon name="mail" variant="outlined" size="small" color="#9CA3AF" /><span className="truncate">{p.email}</span></span>}
            </div>
            {p.address && (
              <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-500">
                <Icon name="location_on" variant="outlined" size="small" color="#9CA3AF" />
                {p.address}
              </p>
            )}
          </div>
          <div className="shrink-0 text-xs text-gray-500 sm:text-right">
            <p>สมัครเมื่อ {formatThaiDate(p.createdAt)}</p>
            <p>เข้าใช้ล่าสุด {p.lastLoginAt ? formatThaiDateTime(p.lastLoginAt) : '-'}</p>
          </div>
        </div>

        {/* สถิติการจอง */}
        <div className="grid grid-cols-2 divide-gray-100 border-t border-gray-100 sm:grid-cols-5 sm:divide-x">
          {[
            { label: 'การจองทั้งหมด', value: s.total, cls: 'text-gray-900' },
            { label: 'กำลังดำเนินการ', value: s.active, cls: 'text-blue-600' },
            { label: 'เสร็จสิ้น', value: s.completed, cls: 'text-emerald-600' },
            { label: 'ยกเลิก/ไม่สำเร็จ', value: s.cancelled, cls: 'text-gray-500' },
            { label: 'ยอดชำระรวม', value: formatTHB(s.totalPaid), cls: 'text-gray-900' },
          ].map((x, i) => (
            <div key={x.label} className={`px-5 py-3 ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}>
              <p className="text-xs text-gray-500">{x.label}</p>
              <p className={`text-lg font-bold ${x.cls}`}>{x.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ผู้รับการดูแล + ADL ── */}
      <Card
        title="ผู้รับการดูแล & ระดับ ADL"
        icon="elderly"
        right={<span className="text-xs text-gray-500">{recipients.length} คน</span>}
      >
        {recipients.length === 0 ? (
          <p className="text-sm text-gray-400">ผู้ใช้ยังไม่ได้เพิ่มข้อมูลผู้รับการดูแล</p>
        ) : (
          <>
            {recipients.length > 1 && (
              <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
                {recipients.map((r, i) => {
                  const on = r.id === current.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelected(i)}
                      className={`flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${on ? 'border-[#059669] bg-emerald-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${on ? 'bg-[#059669] text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {initials(r.name)}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{r.name}</span>
                        <span className="block text-[11px] text-gray-500">
                          {r.isSelf ? 'ตัวผู้ใช้เอง' : 'ญาติ'} · {r.assessment ? `ADL ${r.assessment.adlTotalScore}/${ADL_MAX_TOTAL}` : 'ยังไม่ประเมิน'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {recipients.length === 1 && (
              <p className="mb-4 text-base font-bold text-gray-900">
                {current.name}
                {current.nickname && <span className="font-normal text-gray-500"> ({current.nickname})</span>}
                <span className="ml-2 text-xs font-normal text-gray-500">{current.isSelf ? 'ตัวผู้ใช้เอง' : 'ญาติ'}</span>
              </p>
            )}
            <RecipientCard key={current.id} r={current} />
          </>
        )}
      </Card>

      {/* ── การจองล่าสุด ── */}
      <Card
        title="การจองล่าสุด"
        icon="event_note"
        right={<Link to="/admin/payments" className="text-xs font-semibold text-[#059669] hover:underline">ดูทั้งหมดในหน้า Transaction</Link>}
      >
        {p.recentBookings.length === 0 ? (
          <p className="text-sm text-gray-400">ยังไม่มีการจอง</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {p.recentBookings.map((b) => (
              <li key={b.id}>
                <Link
                  to={`/admin/payments/bookings/${b.id}`}
                  className="-mx-2 flex flex-col gap-1 rounded-lg px-2 py-3 hover:bg-gray-50 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {serviceTypeLabel(b.serviceType)}
                      <span className="ml-2 text-xs font-normal text-[#2563EB]">#{b.id.slice(0, 8).toUpperCase()}</span>
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {formatThaiDate(b.bookingDate)}
                      {b.careRecipientName ? ` · ดูแล ${b.careRecipientName}` : ''}
                      {` · ผู้ดูแล ${b.caregiverName ?? 'ยังไม่มี'}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-900">{formatTHB(b.estimatedCost)}</span>
                    <BookingStatusBadge status={b.status} />
                    <Icon name="chevron_right" size="small" color="#9CA3AF" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>,
  );
}
