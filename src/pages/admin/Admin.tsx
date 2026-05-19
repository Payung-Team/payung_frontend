import { useState, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { ADMIN_DASHBOARD, ADMIN_PENDING_QUEUE } from '../../graphql/queries';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import Card from '../../components/ui/Card';
import Icon from '../../components/ui/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Summary {
  totalCaregivers: number;
  pendingKyc: number;
  verifiedKyc: number;
  rejectedKyc: number;
}

interface WeeklyPoint { week: string; count: number; approved?: number; }

interface Activity {
  caregiverName: string;
  action: string;
  timestamp: string;
}

interface DashboardData {
  adminDashboard: {
    summary: Summary;
    weeklySubmissions: WeeklyPoint[];
    avgReviewTimeHours?: number | null;
    recentActivity: Activity[];
  };
}

interface PendingItem {
  id: string;
  fullName: string;
  kycStatus: string;
  submittedAt?: string | null;
}

interface PendingData {
  list: { items: PendingItem[]; total: number };
}

type AlertVariant = 'error' | 'warning' | 'info';

interface DashAlert {
  id: string;
  variant: AlertVariant;
  title: string;
  subtitle?: string;
  cta?: { label: string; to: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins || 1} นาที`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.`;
  return `${Math.floor(hrs / 24)} วัน`;
}

function submittedAgo(isoString?: string | null): string {
  if (!isoString) return '-';
  const diff = Date.now() - new Date(isoString).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'เพิ่งสมัคร';
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  return `${Math.floor(hrs / 24)} วันที่แล้ว`;
}

function activityLabel(action: string): string {
  if (action === 'approved') return 'อนุมัติ KYC';
  if (action === 'rejected') return 'ปฏิเสธ KYC';
  return action;
}

function activityBg(action: string): string {
  if (action === 'approved') return '#ECFDF5';
  if (action === 'rejected') return '#FEF2F2';
  return '#EFF6FF';
}

function activityIconColor(action: string): string {
  if (action === 'approved') return '#10B981';
  if (action === 'rejected') return '#EF4444';
  return '#3B82F6';
}

function activityIcon(action: string): string {
  if (action === 'approved') return 'check_circle';
  if (action === 'rejected') return 'cancel';
  return 'info';
}

function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]} ${parts[1].charAt(0)}.`;
  return name;
}

// ─── Alert banner styles ──────────────────────────────────────────────────────

const ALERT_STYLE: Record<AlertVariant, { bg: string; border: string; iconBg: string; titleColor: string; subtitleColor: string; ctaBg: string; xColor: string }> = {
  error:   { bg: '#FEF2F2', border: '#FEE2E2', iconBg: '#EF4444', titleColor: '#991B1B', subtitleColor: '#DC2626', ctaBg: '#DC2626', xColor: '#DC2626' },
  warning: { bg: '#FFFBEB', border: '#FEF3C7', iconBg: '#F59E0B', titleColor: '#92400E', subtitleColor: '#D97706', ctaBg: '#D97706', xColor: '#D97706' },
  info:    { bg: '#EFF6FF', border: '#DBEAFE', iconBg: '#3B82F6', titleColor: '#1E40AF', subtitleColor: '#3B82F6', ctaBg: '#3B82F6', xColor: '#3B82F6' },
};

// ─── Dual-Line Chart ─────────────────────────────────────────────────────────

function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', { day: 'numeric', month: 'short' }).format(d);
}

function LineChart({ data }: { data: WeeklyPoint[] }) {
  const W = 560;
  const H = 140;
  const padL = 28; // left padding for Y-axis labels
  const padR = 8;
  const padT = 8;
  const padB = 20; // bottom padding for X-axis labels

  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const n = data.length;
  const approvedOf = (d: WeeklyPoint) => d.approved ?? 0;
  const maxVal = Math.max(...data.map(d => Math.max(d.count, approvedOf(d))), 1);

  const xOf = (i: number) =>
    padL + (n < 2 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yOf = (v: number) =>
    padT + plotH - (v / maxVal) * plotH;

  const submissionPts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.count),        v: d.count,        label: d.week }));
  const approvedPts   = data.map((d, i) => ({ x: xOf(i), y: yOf(approvedOf(d)),  v: approvedOf(d),  label: d.week }));

  const polyOf = (pts: typeof submissionPts) => pts.map(p => `${p.x},${p.y}`).join(' ');
  const areaOf = (pts: typeof submissionPts) =>
    `${pts[0].x},${padT + plotH} ` + pts.map(p => `${p.x},${p.y}`).join(' ') + ` ${pts[pts.length - 1].x},${padT + plotH}`;

  // Y-axis grid lines at 25%, 50%, 75%, 100%
  const gridPcts = [0.25, 0.5, 0.75, 1];

  return (
    <div style={{ width: '100%' }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 8, justifyContent: 'flex-end' }}>
        {[
          { color: '#10B981', label: 'KYC Submissions' },
          { color: '#3B82F6', label: 'Verified' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 24, height: 2.5, background: color, borderRadius: 2 }} />
            <span style={{ color: '#6B7280', fontSize: 11 }}>{label}</span>
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 150 }}>
        <defs>
          <linearGradient id="gradSubmit" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines + labels */}
        {gridPcts.map((pct, i) => {
          const y = padT + plotH - pct * plotH;
          const val = Math.round(maxVal * pct);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y}
                stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 3" />
              <text x={padL - 4} y={y + 4} fontSize="8" fill="#9CA3AF" textAnchor="end">{val}</text>
            </g>
          );
        })}

        {/* Area fills */}
        {n > 1 && <polygon points={areaOf(submissionPts)} fill="url(#gradSubmit)" />}
        {n > 1 && <polygon points={areaOf(approvedPts)}   fill="url(#gradApproved)" />}

        {/* Lines */}
        {n > 1 && (
          <polyline points={polyOf(submissionPts)} fill="none" stroke="#10B981" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" />
        )}
        {n > 1 && (
          <polyline points={polyOf(approvedPts)} fill="none" stroke="#3B82F6" strokeWidth="2.5"
            strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Data points — submissions */}
        {submissionPts.map((p, i) => (
          <g key={`s${i}`}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke="#10B981" strokeWidth="2.5" />
            <title>{`สัปดาห์ ${formatWeekLabel(p.label)}: ส่งสมัคร ${p.v} ราย`}</title>
          </g>
        ))}

        {/* Data points — approvals */}
        {approvedPts.map((p, i) => (
          <g key={`a${i}`}>
            <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke="#3B82F6" strokeWidth="2.5" />
            <title>{`สัปดาห์ ${formatWeekLabel(p.label)}: ยืนยัน ${p.v} ราย`}</title>
          </g>
        ))}

        {/* X-axis week labels (show first, middle, last to avoid crowding) */}
        {data.map((d, i) => {
          const show = i === 0 || i === Math.floor((n - 1) / 2) || i === n - 1;
          if (!show) return null;
          return (
            <text key={i} x={xOf(i)} y={H - 2} fontSize="8" fill="#9CA3AF"
              textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
              {formatWeekLabel(d.week)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({ verified, pending, rejected }: { verified: number; pending: number; rejected: number }) {
  const total = verified + pending + rejected || 1;
  const vPct = (verified / total) * 100;
  const pPct = (pending / total) * 100;

  return (
    <div className="relative mx-auto" style={{ width: 100, height: 100 }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: total === 1
          ? '#E5E7EB'
          : `conic-gradient(#10B981 0% ${vPct}%, #F59E0B ${vPct}% ${vPct + pPct}%, #EF4444 ${vPct + pPct}% 100%)`,
      }} />
      <div style={{
        position: 'absolute', top: 12, left: 12,
        width: 76, height: 76, borderRadius: '50%', background: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontWeight: 700, fontSize: 20, lineHeight: 1, color: '#111827' }}>
          {verified + pending + rejected}
        </span>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  subtext: string;
  badge?: { text: string; color: string; bg: string };
  loading?: boolean;
  dim?: boolean;
}

function StatCard({ label, value, subtext, badge, loading, dim }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-2 py-4! px-5! flex-1 min-w-0">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#6B7280', fontSize: 10, fontWeight: 500, textTransform: 'uppercase' }}>
          {label}
        </span>
        {!dim && badge && (
          <span style={{ background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
            {badge.text}
          </span>
        )}
      </div>
      {loading
        ? <Skeleton height={28} width={82} borderRadius={6} />
        : <span style={{ color: dim ? '#D1D5DB' : '#111827', fontWeight: 700, fontSize: 28, letterSpacing: -1, lineHeight: 1 }}>{value}</span>
      }
      {loading
        ? <Skeleton height={10} width={163} />
        : <span style={{ color: dim ? '#D1D5DB' : '#9CA3AF', fontSize: 10 }}>{dim ? 'ยังไม่มีข้อมูล' : subtext}</span>
      }
    </Card>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

function MetricCard({ label, value, subtext, color, loading }: { label: string; value: string | number; subtext: string; color: string; loading?: boolean }) {
  return (
    <Card className="flex flex-col gap-2 py-4! px-5! flex-1 min-w-0">
      <span style={{ color: '#6B7280', fontSize: 11, fontWeight: 500 }}>{label}</span>
      {loading
        ? <Skeleton height={24} width={80} />
        : <span style={{ color, fontWeight: 700, fontSize: 20 }}>{value}</span>
      }
      <span style={{ color: '#9CA3AF', fontSize: 10 }}>{subtext}</span>
    </Card>
  );
}

// ─── Empty placeholder boxes ─────────────────────────────────────────────────

function EmptyBox({ height, title, subtitle }: { height: number; title: string; subtitle: string }) {
  return (
    <div style={{
      height,
      background: '#F9FAFB',
      border: '1px dashed #D1D5DB',
      borderRadius: 12,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E5E7EB' }} />
      <span style={{ color: '#9CA3AF', fontSize: 13, fontWeight: 500 }}>{title}</span>
      <span style={{ color: '#D1D5DB', fontSize: 11 }}>{subtitle}</span>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Admin() {
  const navigate = useNavigate();
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const { data: dashData, loading: dashLoading } = useQuery<DashboardData>(ADMIN_DASHBOARD, {
    fetchPolicy: 'network-only',
  });
  const { data: queueData, loading: queueLoading } = useQuery<PendingData>(ADMIN_PENDING_QUEUE, {
    fetchPolicy: 'cache-and-network',
  });

  const summary = dashData?.adminDashboard?.summary;
  const weeklySubmissions = dashData?.adminDashboard?.weeklySubmissions ?? [];
  const avgHours = dashData?.adminDashboard?.avgReviewTimeHours;
  const recentActivity = dashData?.adminDashboard?.recentActivity ?? [];
  const pendingItems = queueData?.list?.items ?? [];
  const pendingTotal = queueData?.list?.total ?? 0;
  const currentWeekCount = weeklySubmissions.length > 0
    ? weeklySubmissions[weeklySubmissions.length - 1].count
    : 0;

  const skeletonMode = dashLoading && !dashData;
  const isEmpty = !skeletonMode && summary !== undefined && summary.totalCaregivers === 0;

  const dismiss = (id: string) =>
    setDismissedAlerts(prev => new Set([...prev, id]));

  const alerts = useMemo<DashAlert[]>(() => {
    if (!summary) return [];
    const list: DashAlert[] = [];
    if (summary.pendingKyc >= 5) {
      list.push({
        id: 'kyc-backlog',
        variant: 'error',
        title: `⚠️ KYC Backlog สูง! — มี ${summary.pendingKyc} รายการรอตรวจสอบ`,
        subtitle: 'กรุณาตรวจสอบให้เสร็จโดยเร็ว',
        cta: { label: 'ตรวจสอบเลย', to: '/admin/kyc' },
      });
    }
    if (summary.rejectedKyc > 0) {
      list.push({
        id: 'rejected-pending',
        variant: 'warning',
        title: `มี ${summary.rejectedKyc} รายการถูกปฏิเสธ รอ Caregiver ส่งเอกสารใหม่`,
        cta: { label: 'ดูรายการ →', to: '/admin/kyc?status=rejected' },
      });
    }
    return list.filter(a => !dismissedAlerts.has(a.id));
  }, [summary, dismissedAlerts]);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:px-8 lg:py-6">

      {/* ── Notification Banners ─────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {alerts.map(alert => {
            const s = ALERT_STYLE[alert.variant];
            return (
              <div
                key={alert.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderRadius: 10,
                }}
              >
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: s.iconBg, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: s.titleColor, fontSize: 13, fontWeight: 600 }}>{alert.title}</div>
                  {alert.subtitle && (
                    <div style={{ color: s.subtitleColor, fontSize: 11, marginTop: 2 }}>{alert.subtitle}</div>
                  )}
                </div>
                {alert.cta && (
                  <button
                    type="button"
                    onClick={() => navigate(alert.cta!.to)}
                    style={{
                      background: s.ctaBg, color: 'white',
                      border: 'none', borderRadius: 8,
                      padding: '5px 14px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    {alert.cta.label}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismiss(alert.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.xColor, fontSize: 14, flexShrink: 0, padding: 0, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Loading indicator text ───────────────────────────────────── */}
      {skeletonMode && (
        <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, fontWeight: 500, marginTop: -8 }}>
          กำลังโหลดข้อมูล...
        </div>
      )}

      {/* ── Stat Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Caregivers ทั้งหมด"
          value={summary?.totalCaregivers ?? 0}
          subtext="จากเดือนที่แล้ว"
          badge={summary ? { text: `${summary.totalCaregivers} คน`, color: '#059669', bg: 'rgba(5,150,105,0.1)' } : undefined}
          loading={skeletonMode}
          dim={isEmpty}
        />
        <StatCard
          label="รอตรวจ KYC"
          value={summary?.pendingKyc ?? 0}
          subtext="ต้องตรวจสอบ"
          badge={summary ? { text: `${summary.pendingKyc} รายการ`, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' } : undefined}
          loading={skeletonMode}
          dim={isEmpty}
        />
        <StatCard
          label="อนุมัติแล้ว"
          value={summary?.verifiedKyc ?? 0}
          subtext="อัตราอนุมัติ"
          badge={summary && summary.totalCaregivers > 0
            ? { text: `▲ ${Math.round((summary.verifiedKyc / summary.totalCaregivers) * 100)}%`, color: '#10B981', bg: 'rgba(16,185,129,0.1)' }
            : undefined}
          loading={skeletonMode}
          dim={isEmpty}
        />
        <StatCard
          label="ปฏิเสธ KYC"
          value={summary?.rejectedKyc ?? 0}
          subtext="รอ Caregiver ส่งใหม่"
          badge={summary ? { text: `${summary.rejectedKyc} รายการ`, color: '#0D9488', bg: 'rgba(13,148,136,0.1)' } : undefined}
          loading={skeletonMode}
          dim={isEmpty}
        />
      </div>

      {/* ── Charts Row ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Area Chart */}
        <Card className="flex flex-col gap-2 py-4! px-5! min-w-0" style={{ flex: '1 1 60%' }}>
          <div>
            <div style={{ color: '#064E3B', fontWeight: 600, fontSize: 15 }}>KYC Submissions</div>
            {!skeletonMode && <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>Submissions vs Verified รายสัปดาห์</div>}
          </div>
          <div style={{ height: 200, minHeight: 200 }}>
            {skeletonMode ? (
              /* Loading: solid gray block with faint horizontal lines */
              <div style={{ height: '100%', background: '#F3F4F6', borderRadius: 8, position: 'relative', overflow: 'hidden' }} className="animate-pulse">
                {[0.25, 0.5, 0.75].map((pct, i) => (
                  <div key={i} style={{ position: 'absolute', top: `${pct * 100}%`, left: 0, right: 0, height: 1, background: '#E5E7EB', opacity: 0.5 }} />
                ))}
              </div>
            ) : weeklySubmissions.length === 0 ? (
              /* Empty state */
              <EmptyBox
                height={200}
  
                title="ยังไม่มีข้อมูลสำหรับแสดงผล"
                subtitle="ข้อมูลจะแสดงเมื่อมี Caregiver สมัครเข้ามา"
              />
            ) : (
              <LineChart data={weeklySubmissions} />
            )}
          </div>
        </Card>

        {/* Donut Chart */}
        <Card className="flex flex-col gap-3 py-4! px-5! min-w-0" style={{ flex: '1 1 36%' }}>
          <div style={{ color: '#064E3B', fontWeight: 600, fontSize: 15 }}>สถานะ KYC</div>

          {skeletonMode ? (
            /* Loading: gray ring + row skeletons */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', paddingTop: 8 }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                border: '12px solid #E5E7EB',
                flexShrink: 0,
              }} />
              {[1, 2, 3].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                  <Skeleton width={10} height={10} borderRadius={3} />
                  <Skeleton height={10} style={{ flex: 1 }} />
                  <Skeleton width={30} height={10} />
                </div>
              ))}
            </div>
          ) : isEmpty || (summary?.verifiedKyc === 0 && summary?.pendingKyc === 0 && summary?.rejectedKyc === 0) ? (
            /* Empty state: dashed ring */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 8 }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                border: '12px dashed #E5E7EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontWeight: 700, fontSize: 24, color: '#D1D5DB' }}>—</span>
              </div>
              <span style={{ color: '#9CA3AF', fontSize: 12 }}>ยังไม่มีข้อมูล KYC</span>
            </div>
          ) : (
            <>
              <DonutChart
                verified={summary?.verifiedKyc ?? 0}
                pending={summary?.pendingKyc ?? 0}
                rejected={summary?.rejectedKyc ?? 0}
              />
              {[
                { color: '#10B981', label: 'Verified', count: summary?.verifiedKyc ?? 0 },
                { color: '#F59E0B', label: 'Pending', count: summary?.pendingKyc ?? 0 },
                { color: '#EF4444', label: 'Rejected', count: summary?.rejectedKyc ?? 0 },
              ].map(({ color, label, count }) => {
                const total = (summary?.verifiedKyc ?? 0) + (summary?.pendingKyc ?? 0) + (summary?.rejectedKyc ?? 0) || 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                    <span style={{ color: '#4B5563', fontSize: 12, flex: 1 }}>{label} ({count})</span>
                    <span style={{ color: '#1F2937', fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                  </div>
                );
              })}
            </>
          )}
        </Card>
      </div>

      {/* ── Pending Queue + Activity Feed ──────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Pending Queue */}
        <Card className="flex flex-col gap-2 py-4! px-5! min-w-0" style={{ flex: '1 1 50%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#064E3B', fontWeight: 600, fontSize: 15 }}>รายการรอตรวจสอบ</span>
            <NavLink to="/admin/kyc" style={{ color: '#059669', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              ดูทั้งหมด →
            </NavLink>
          </div>

          {queueLoading && !queueData ? (
            /* Loading: 5 skeleton rows */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#F3F4F6', borderRadius: 8 }}>
                  <Skeleton width={28} height={28} circle />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <Skeleton height={10} width={120} />
                    <Skeleton height={8} width={80} />
                  </div>
                  <Skeleton height={20} width={60} borderRadius={99} style={{ opacity: 0.4 }} />
                </div>
              ))}
            </div>
          ) : pendingItems.length === 0 ? (
            /* Empty state */
            <EmptyBox
              height={180}

              title="ไม่มีรายการรอตรวจสอบ"
              subtitle="คิวว่าง! 🎉"
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {pendingItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/admin/kyc/${item.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: '#F9FAFB', cursor: 'pointer' }}
                >
                  <Avatar name={item.fullName || 'K'} size={28} fallbackColor="#D97706" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#111827', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.fullName || '-'}
                    </div>
                    <div style={{ color: '#9CA3AF', fontSize: 11 }}>{submittedAgo(item.submittedAt)}</div>
                  </div>
                  <StatusBadge
                    label="Pending"
                    badgeClass="bg-[#FFFBEB] text-[#92400E]"
                    dotClass="bg-[#F59E0B]"
                    className="shrink-0"
                  />
                </div>
              ))}
              {pendingTotal > 5 && (
                <div style={{ textAlign: 'center', paddingTop: 4 }}>
                  <button onClick={() => navigate('/admin/kyc')} style={{ color: '#059669', fontSize: 12, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    + อีก {pendingTotal - 5} รายการ
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Activity Feed */}
        <Card className="flex flex-col gap-1 py-4! px-5! min-w-0" style={{ flex: '1 1 50%' }}>
          <span style={{ color: '#064E3B', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>กิจกรรมล่าสุด</span>

          {skeletonMode ? (
            /* Loading: 5 skeleton rows with dividers */
            [1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                <Skeleton width={24} height={24} circle />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Skeleton height={10} width={160} />
                  <Skeleton height={8} width={80} />
                </div>
              </div>
            ))
          ) : recentActivity.length === 0 ? (
            /* Empty state */
            <EmptyBox
              height={180}

              title="ยังไม่มีกิจกรรม"
              subtitle="กิจกรรมจะแสดงเมื่อมีการดำเนินการ"
            />
          ) : (
            recentActivity.slice(0, 7).map((activity, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0',
                borderBottom: i < Math.min(recentActivity.length, 7) - 1 ? '1px solid #F3F4F6' : 'none',
              }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: activityBg(activity.action), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon
                    name={activityIcon(activity.action)}
                    variant="outlined"
                    size="small"
                    color={activityIconColor(activity.action)}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#1F2937', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activityLabel(activity.action)} — {abbreviateName(activity.caregiverName)}
                  </div>
                  <div style={{ color: '#9CA3AF', fontSize: 10 }}>โดย Admin</div>
                </div>
                <span style={{ color: '#9CA3AF', fontSize: 10, flexShrink: 0 }}>{relativeTime(activity.timestamp)}</span>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* ── Bottom Metrics ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="เวลาตรวจสอบเฉลี่ย"
          value={avgHours != null ? `${avgHours} ชม.` : 'N/A'}
          subtext={avgHours != null ? 'เฉลี่ยจาก KYC ที่อนุมัติแล้ว' : 'ยังไม่มีข้อมูล'}
          color="#059669"
          loading={skeletonMode}
        />
        <MetricCard
          label="Submissions สัปดาห์นี้"
          value={currentWeekCount}
          subtext="จำนวน KYC ที่ส่งเข้ามาสัปดาห์นี้"
          color="#2563EB"
          loading={skeletonMode}
        />
        <MetricCard
          label="ปฏิเสธ KYC"
          value={`${summary?.rejectedKyc ?? 0} รายการ`}
          subtext="รอ Caregiver ส่งเอกสารใหม่"
          color="#0D9488"
          loading={skeletonMode}
        />
      </div>

    </div>
  );
}
