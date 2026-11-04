import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLazyQuery } from '@apollo/client/react';
import { ADMIN_BOOKING_MATCH_REPORT } from '../../../graphql/adminBookings';
import Icon from '../../ui/Icon';
import { careLevelLabel } from '../../../lib/careLevels';
import { PROFESSIONS, UNKNOWN_PROFESSION, isProfession } from '../../../lib/professions';
import { userFacingErrorMessage } from '../../../lib/apolloErrors';
import { formatThaiDateTime } from './bookingMeta';

interface RequiredSkill {
  code: string;
  nameTh: string;
  sources: string[];
}

interface MatchResult {
  passed: boolean;
  checks: { level: boolean; skills: boolean; profession: boolean; evidence: boolean };
  reasons: { reason: string; skillCode: string | null }[];
  caregiver: {
    id: string;
    userId: string | null;
    fullName: string;
    caregiverNumber: string | null;
    profession: string;
    careLevel: string | null;
    serviceAreaProvince: string | null;
    serviceAreaDistrict: string | null;
  };
}

interface Props {
  bookingId: string;
  requiredLevel: string | null;
  levelFromAdl: string | null;
  levelFromFlags: string | null;
  levelFromServices: string | null;
  levelCalculatedAt: string | null;
  requiredSkills: RequiredSkill[];
  locationAddress: string;
}

const LEVEL_RANK: Record<string, number> = { BASIC: 1, INTERMEDIATE: 2, ADVANCED: 3 };
const LEVEL_TONE: Record<string, string> = {
  BASIC: 'bg-sky-50 text-sky-700 ring-sky-200',
  INTERMEDIATE: 'bg-violet-50 text-violet-700 ring-violet-200',
  ADVANCED: 'bg-amber-50 text-amber-700 ring-amber-200',
};
const SOURCE_LABEL: Record<string, string> = { adl: 'ADL', flag: 'เงื่อนไขพิเศษ', service: 'บริการที่เลือก' };
const REASON_LABEL: Record<string, string> = {
  LEVEL_NOT_SET: 'ยังไม่มีระดับ',
  LEVEL_TOO_LOW: 'ระดับต่ำกว่าที่ต้องการ',
  SKILL_MISSING: 'ขาดทักษะ',
  PROFESSION_MISMATCH: 'วิชาชีพไม่ตรง',
  EVIDENCE_NOT_APPROVED: 'ใบประกอบวิชาชีพยังไม่อนุมัติ',
  EVIDENCE_EXPIRED: 'ใบประกอบวิชาชีพหมดอายุ',
};

const up = (v: string | null) => (v ?? '').toUpperCase();

function LevelChip({ level, muted = false }: { level: string | null; muted?: boolean }) {
  if (!level) return <span className="text-xs text-gray-400">-</span>;
  const k = up(level);
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${muted ? 'bg-gray-50 text-gray-500 ring-gray-200' : LEVEL_TONE[k] ?? 'bg-gray-50 text-gray-700 ring-gray-200'}`}>
      {careLevelLabel(level)}
    </span>
  );
}

/**
 * การ์ด "การจับคู่" ในหน้ารายละเอียด booking (แอดมิน)
 * - ส่วนบน: ระดับ/ทักษะที่ booking ต้องการ — มากับ adminBookingDetail อยู่แล้ว ไม่ยิง request เพิ่ม
 * - ส่วนล่าง: ผลประเมินผู้ดูแลทั้งระบบ ณ ตอนนี้ — ยิงเมื่อกดปุ่มเท่านั้น
 * ★ การจับคู่ไม่ได้กรองตามพื้นที่ — พื้นที่ให้บริการแสดงเพื่อให้แอดมินพิจารณาเอง
 */
export default function BookingMatchingCard(props: Props) {
  const { bookingId, requiredLevel, levelCalculatedAt, requiredSkills, locationAddress } = props;
  const [showFailed, setShowFailed] = useState(false);
  const [load, { data, loading, error, called }] = useLazyQuery<{ bookingMatchReport: { evaluatedAt: string; results: MatchResult[] } }>(
    ADMIN_BOOKING_MATCH_REPORT,
    { fetchPolicy: 'network-only' },
  );
  const run = () => load({ variables: { bookingId } });

  const report = data?.bookingMatchReport;
  const passed = report?.results.filter((r) => r.passed) ?? [];
  const failed = report?.results.filter((r) => !r.passed) ?? [];
  const skillName = new Map(requiredSkills.map((s) => [s.code, s.nameTh]));
  // ระดับที่ "ชนะ" (= requiredLevel) ไฮไลต์ แหล่งอื่นเป็นสีเทา
  const sources = [
    { label: 'จากคะแนน ADL', icon: 'monitor_heart', level: props.levelFromAdl },
    { label: 'จากเงื่อนไขพิเศษ', icon: 'medical_information', level: props.levelFromFlags },
    { label: 'จากบริการที่เลือก', icon: 'medical_services', level: props.levelFromServices },
  ];
  const needRank = LEVEL_RANK[up(requiredLevel)] ?? 0;

  return (
    <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[#059669]">
            <Icon name="join_inner" variant="outlined" size="small" color="currentColor" />
          </span>
          การจับคู่ผู้ดูแล
        </h2>
      </div>

      {!levelCalculatedAt || !requiredLevel ? (
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
          <Icon name="info" variant="outlined" color="currentColor" />
          booking นี้ยังไม่ได้คำนวณระดับ (เป็น booking ก่อนมีระบบจับคู่ตามระดับ) — ระบบจึงจับคู่ไม่ได้
        </div>
      ) : (
        <>
          {/* ── ระดับที่ต้องการ ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-white p-4 ring-1 ring-emerald-100">
              <p className="text-xs text-gray-500">ต้องการผู้ดูแลระดับ</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-flex rounded-full px-3 py-1 text-base font-bold ring-1 ${LEVEL_TONE[up(requiredLevel)] ?? ''}`}>
                  {careLevelLabel(requiredLevel)}
                </span>
                <span className="text-xs text-gray-500">ขึ้นไป</span>
              </div>
              <p className="mt-3 text-[11px] text-gray-400">ใช้ระดับสูงสุดจาก 3 แหล่งทางขวา</p>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {sources.map((s) => {
                const decisive = s.level != null && LEVEL_RANK[up(s.level)] === needRank;
                return (
                  <li key={s.label} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${decisive ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50'}`}>
                    <span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-600">
                      <Icon name={s.icon} variant="outlined" size="small" color="currentColor" />
                      <span className="truncate">{s.label}</span>
                    </span>
                    <LevelChip level={s.level} muted={!decisive} />
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ── ทักษะที่ต้องมี ── */}
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-gray-500">ทักษะที่ต้องมี ({requiredSkills.length})</p>
            {requiredSkills.length === 0 ? (
              <p className="text-sm text-gray-500">ไม่มีทักษะเฉพาะที่ต้องการ</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {requiredSkills.map((s) => (
                  <span key={s.code} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-800">
                    {s.nameTh}
                    <span className="text-[10px] text-gray-400">· {s.sources.map((x) => SOURCE_LABEL[x] ?? x).join(', ')}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── ผู้ดูแลที่เข้าเกณฑ์ (โหลดเมื่อกด) ── */}
          <div className="mt-5 border-t border-gray-100 pt-4">
            {!called ? (
              <button
                type="button"
                onClick={run}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#059669] px-4 py-2.5 text-sm font-semibold text-[#047857] hover:bg-emerald-50 sm:w-auto"
              >
                <Icon name="person_search" variant="outlined" size="small" color="currentColor" />
                ตรวจผู้ดูแลที่เข้าเกณฑ์ตอนนี้
              </button>
            ) : loading && !report ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <span className="material-icons animate-spin" style={{ fontSize: 16 }}>refresh</span>
                กำลังประเมินผู้ดูแลทั้งระบบ…
              </p>
            ) : error ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {userFacingErrorMessage(error, 'ประเมินไม่สำเร็จ')}
                <button type="button" onClick={run} className="cursor-pointer font-semibold underline">ลองอีกครั้ง</button>
              </div>
            ) : report ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-gray-900">
                    เข้าเกณฑ์ <b className="text-[#047857]">{passed.length}</b> คน จากผู้ดูแลที่เปิดรับงาน {report.results.length} คน
                  </p>
                  <button type="button" onClick={run} disabled={loading} className="inline-flex cursor-pointer items-center gap-1 text-xs text-gray-500 hover:text-gray-900 disabled:opacity-50">
                    <span className={`material-icons${loading ? ' animate-spin' : ''}`} style={{ fontSize: 14 }}>refresh</span>
                    ประเมินใหม่ · {formatThaiDateTime(report.evaluatedAt)}
                  </button>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <Icon name="location_on" variant="outlined" size="small" color="currentColor" />
                  <span>
                    ระบบจับคู่<b>ไม่ได้กรองตามพื้นที่</b> — เทียบพื้นที่ให้บริการของผู้ดูแลกับที่อยู่งานเอง:{' '}
                    <span className="text-amber-900">{locationAddress}</span>
                  </span>
                </div>

                {passed.length === 0 ? (
                  <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">ไม่มีผู้ดูแลที่เข้าเกณฑ์ตอนนี้ — ผู้จองจะเห็นข้อความให้ติดต่อทีมงาน</p>
                ) : (
                  <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {passed.map((r) => (
                      <CaregiverRow key={r.caregiver.id} r={r} />
                    ))}
                  </ul>
                )}

                {failed.length > 0 && (
                  <div>
                    <button type="button" onClick={() => setShowFailed((v) => !v)} className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900">
                      <Icon name={showFailed ? 'expand_less' : 'expand_more'} size="small" color="currentColor" />
                      ไม่เข้าเกณฑ์ {failed.length} คน
                    </button>
                    {showFailed && (
                      <ul className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {failed.map((r) => (
                          <CaregiverRow key={r.caregiver.id} r={r} skillName={skillName} />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

function CaregiverRow({ r, skillName }: { r: MatchResult; skillName?: Map<string, string> }) {
  const c = r.caregiver;
  const prof = isProfession(c.profession) ? PROFESSIONS[c.profession] : UNKNOWN_PROFESSION;
  const area = [c.serviceAreaDistrict, c.serviceAreaProvince].filter(Boolean).join(', ');
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{c.fullName}</p>
          <p className="truncate text-[11px] text-gray-500">
            {c.caregiverNumber ?? '-'} · {prof.label}
          </p>
        </div>
        <LevelChip level={c.careLevel} />
      </div>
      <p className={`mt-1.5 flex items-center gap-1 text-xs ${area ? 'text-gray-600' : 'text-gray-400'}`}>
        <Icon name="location_on" variant="outlined" size="small" color="currentColor" />
        <span className="truncate">{area || 'ไม่ได้ระบุพื้นที่'}</span>
      </p>
      {!r.passed && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {r.reasons.map((x, i) => (
            <span key={i} className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
              {REASON_LABEL[x.reason] ?? x.reason}
              {x.skillCode ? `: ${skillName?.get(x.skillCode) ?? x.skillCode}` : ''}
            </span>
          ))}
        </div>
      )}
    </>
  );
  const cls = `block rounded-xl border p-3 ${r.passed ? 'border-emerald-100 bg-white' : 'border-gray-100 bg-gray-50'}`;
  return (
    <li className="min-w-0">
      {c.userId ? (
        <Link to={`/admin/users/${c.userId}`} className={`${cls} transition-colors hover:border-[#059669]`}>
          {body}
        </Link>
      ) : (
        <div className={cls}>{body}</div>
      )}
    </li>
  );
}
