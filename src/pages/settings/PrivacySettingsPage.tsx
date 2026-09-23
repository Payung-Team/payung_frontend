import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Icon } from '../../components/ui/Icon';
import Skeleton from '../../components/ui/Skeleton';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import {
  CONSENT_POLICY,
  GRANT_CONSENT,
  MY_CONSENTS,
  WITHDRAW_CONSENT,
  type ConsentItem,
  type ConsentPolicyData,
  type ConsentStatus,
  type GrantConsentData,
  type GrantConsentVars,
  type MyConsentsData,
  type WithdrawConsentData,
  type WithdrawConsentVars,
} from '../../graphql/consent';
import {
  PRIVACY_EMAIL,
  consentErrorMessage,
  isPolicyVersionMismatch,
} from '../../lib/consentErrors';
import { FONT, ModalShell } from '../family/components/familyUi';
import { formatDate, formatTime } from '../family/familyStrings';
import { ALWAYS_KEEPS, consequencesFor } from './privacy/consentCopy';
import { PrivacyNoticeModal } from './privacy/PrivacyNoticeModal';

/**
 * หน้า "ความเป็นส่วนตัว" — PYG-540 (สิทธิ์ของเจ้าของข้อมูลตาม PDPA)
 *
 * ผู้ใช้ทำได้ 4 อย่าง:
 *   1. ดูว่าให้ความยินยอมอะไรไว้บ้าง + เปลี่ยนล่าสุดเมื่อไหร่
 *   2. ถอนความยินยอม (ต้องเห็น "ผลที่ตามมา" ก่อนยืนยันทุกครั้ง)
 *   3. ให้ความยินยอม (กลับ) — ต้องเห็นข้อความเต็มของข้อนั้นก่อนยืนยัน
 *   4. อ่านประกาศความเป็นส่วนตัวฉบับเต็ม + ช่องทางใช้สิทธิ์อื่น (ขอดู/แก้/ลบข้อมูล)
 *
 * ★ ข้อมูลมาจาก 2 query แล้วจับคู่ด้วย type:
 *     myConsents    → รายการข้อ + สถานะ (ลำดับตามที่ BE กำหนดต่อ role)
 *     consentPolicy → ข้อความ label / คำอธิบาย (ฉบับเดียวกับที่ BE ใช้บันทึกหลักฐาน)
 *   FE ไม่เขียนข้อความทางกฎหมายเอง — เขียนแค่ "ผลที่ตามมา" (privacy/consentCopy.ts)
 *
 * Design: ไม่มีเฟรมใน Figma สำหรับหน้านี้ → ใช้โทน Sprint 8 ฝั่งผู้รับบริการ
 * (พื้น #F6FAF9, การ์ดขาวมุม 12, เขียวหลัก #009265) และขนาดตัวอักษร/ปุ่มใหญ่พอสำหรับผู้สูงอายุ
 */

/** หนึ่งแถวที่หน้าเว็บแสดง = สถานะจาก myConsents + ข้อความจาก consentPolicy */
interface ConsentRow {
  status: ConsentStatus;
  item: ConsentItem;
}

/** dialog ที่เปิดอยู่ — เก็บแค่ type แล้วหาแถวล่าสุดตอน render (ข้อความอัปเดตตามนโยบายใหม่ได้) */
type Pending = { kind: 'withdraw' | 'grant'; type: string } | null;

export default function PrivacySettingsPage() {
  const policyQuery = useQuery<ConsentPolicyData>(CONSENT_POLICY, {
    fetchPolicy: 'cache-and-network',
  });
  const consentsQuery = useQuery<MyConsentsData>(MY_CONSENTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [withdrawConsent] = useMutation<WithdrawConsentData, WithdrawConsentVars>(
    WITHDRAW_CONSENT,
  );
  const [grantConsent] = useMutation<GrantConsentData, GrantConsentVars>(GRANT_CONSENT);

  const { toasts, removeToast, success, error: toastError } = useToast();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const policy = policyQuery.data?.consentPolicy;

  const rows = useMemo<ConsentRow[]>(() => {
    const statuses = consentsQuery.data?.myConsents ?? [];
    const items = new Map((policy?.items ?? []).map((item) => [item.type, item]));
    // ★ ข้อที่ไม่มีข้อความใน consentPolicy → ข้าม (แสดงชื่อ type ดิบ ๆ ให้ผู้ใช้อ่านไม่รู้เรื่อง)
    return statuses.flatMap((status) => {
      const item = items.get(status.type);
      return item ? [{ status, item }] : [];
    });
  }, [consentsQuery.data, policy]);

  const pendingRow = pending ? rows.find((r) => r.status.type === pending.type) : undefined;

  // ห้ามปิด dialog ระหว่างกำลังบันทึก — ไม่งั้นผู้ใช้ไม่รู้ว่าสำเร็จหรือไม่
  const closeDialog = useCallback(() => {
    if (!busy) setPending(null);
  }, [busy]);
  const closeNotice = useCallback(() => setNoticeOpen(false), []);

  /**
   * เขียนสถานะที่ BE คืนมาลง cache ของ myConsents ทันที
   * ★ ConsentStatus ไม่มี id → Apollo ผูกผลของ mutation กับรายการเดิมเองไม่ได้ ต้องแทนที่เอง
   *   (ดีกว่า refetch ทั้งรายการ — ไม่ต้องยิงคำขอเพิ่ม และหน้าจอเปลี่ยนทันที)
   */
  const replaceInList = (list: MyConsentsData | null, next: ConsentStatus) =>
    list
      ? { myConsents: list.myConsents.map((s) => (s.type === next.type ? next : s)) }
      : list;

  const handleConfirm = async () => {
    if (!pending || !pendingRow) return;
    setBusy(true);
    try {
      if (pending.kind === 'withdraw') {
        await withdrawConsent({
          variables: { type: pending.type },
          update: (cache, { data }) => {
            const next = data?.withdrawConsent;
            if (next) {
              cache.updateQuery<MyConsentsData>({ query: MY_CONSENTS }, (prev) =>
                replaceInList(prev, next),
              );
            }
          },
        });
        success('ถอนความยินยอมแล้ว มีผลตั้งแต่ตอนนี้');
      } else {
        if (!policy) return;
        await grantConsent({
          // ★ เวอร์ชันที่ผู้ใช้เห็นอยู่บนจอ — ไม่ hardcode (BE ใช้พิสูจน์ว่ายินยอมฉบับไหน)
          variables: { type: pending.type, policyVersion: policy.version },
          update: (cache, { data }) => {
            const next = data?.grantConsent;
            if (next) {
              cache.updateQuery<MyConsentsData>({ query: MY_CONSENTS }, (prev) =>
                replaceInList(prev, next),
              );
            }
          },
        });
        success('บันทึกความยินยอมแล้ว');
      }
      setPending(null);
    } catch (err) {
      if (isPolicyVersionMismatch(err)) {
        // นโยบายเพิ่งขึ้นฉบับใหม่ → โหลดข้อความใหม่ แต่ "เปิด dialog ค้างไว้"
        // ให้ผู้ใช้อ่านข้อความฉบับใหม่ในกล่องเดิมก่อนกดยืนยันอีกครั้ง
        void policyQuery.refetch();
      }
      toastError(consentErrorMessage(err), 6000);
    } finally {
      setBusy(false);
    }
  };

  const loading =
    (policyQuery.loading && !policyQuery.data) || (consentsQuery.loading && !consentsQuery.data);
  const failed = !loading && (!policyQuery.data || !consentsQuery.data);

  const retry = () => {
    void policyQuery.refetch();
    void consentsQuery.refetch();
  };

  return (
    <div className="min-h-full bg-[#F6FAF9]" style={{ fontFamily: FONT }}>
      <div className="mx-auto w-full max-w-[880px] px-4 pb-24 pt-6 md:px-6 md:pb-10">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-[24px] font-bold text-[#1A1A1A]">
            <Icon name="privacy_tip" className="text-[#009265]" />
            ความเป็นส่วนตัว
          </h1>
          <p className="mt-1 text-[15px] text-[#6B7280]">
            ดูและจัดการความยินยอมที่คุณให้ไว้กับ Payung
          </p>
        </header>

        {loading ? (
          <LoadingState />
        ) : failed ? (
          <ErrorState onRetry={retry} />
        ) : (
          <div className="space-y-6">
            <section aria-labelledby="consents-heading">
              <h2 id="consents-heading" className="mb-3 text-[18px] font-bold text-[#064E3B]">
                ความยินยอมของฉัน
              </h2>
              {rows.length === 0 ? (
                <Card>
                  <p className="text-[15px] text-[#6B7280]">
                    บัญชีนี้ไม่มีรายการความยินยอมที่ต้องจัดการ
                  </p>
                </Card>
              ) : (
                <ul className="space-y-3">
                  {rows.map((row) => (
                    <li key={row.status.type}>
                      <ConsentCard
                        row={row}
                        disabled={busy}
                        onWithdraw={() => setPending({ kind: 'withdraw', type: row.status.type })}
                        onGrant={() => setPending({ kind: 'grant', type: row.status.type })}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {policy && (
              <NoticeCard
                version={policy.version}
                effectiveDate={policy.effectiveDate}
                onOpen={() => setNoticeOpen(true)}
              />
            )}

            <RightsCard note={policy?.rightsNoteTh ?? ''} />
          </div>
        )}
      </div>

      {pending?.kind === 'withdraw' && pendingRow && (
        <WithdrawDialog row={pendingRow} busy={busy} onClose={closeDialog} onConfirm={handleConfirm} />
      )}
      {pending?.kind === 'grant' && pendingRow && policy && (
        <GrantDialog
          row={pendingRow}
          version={policy.version}
          effectiveDate={policy.effectiveDate}
          busy={busy}
          onClose={closeDialog}
          onConfirm={handleConfirm}
        />
      )}
      {noticeOpen && policy && (
        <PrivacyNoticeModal markdown={policy.privacyNoticeTh} onClose={closeNotice} />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} position="bottom-right" variant="booking-toast" />
    </div>
  );
}

// ─── สถานะของแต่ละข้อ ─────────────────────────────────────────────────────────

type StatusKind = 'granted' | 'outdated' | 'withdrawn' | 'declined' | 'unanswered';

/**
 * ★ แยก "ถอนแล้ว" ออกจาก "ไม่ได้ยินยอม": แถวล่าสุด granted = false มาได้สองทาง
 *   - ตอบ "ไม่" ตั้งแต่ตอนสมัคร (เช่นไม่ติ๊กรับข่าวสาร) → ไม่ได้ยินยอม
 *   - เคยให้แล้วมากดถอนที่หน้านี้ (source = settings) → ถอนความยินยอมแล้ว
 *   ถ้าเขียนว่า "ถอนแล้ว" กับคนที่ไม่เคยให้ จะอ่านแล้วงงว่าไปถอนตอนไหน
 */
function statusKind(s: ConsentStatus): StatusKind {
  if (s.granted) return s.isCurrentVersion ? 'granted' : 'outdated';
  if (!s.answered) return 'unanswered';
  return s.source === 'settings' ? 'withdrawn' : 'declined';
}

// ★ ทุกสถานะมีข้อความในป้ายเสมอ — ไม่สื่อด้วยสีอย่างเดียว (ผู้ใช้ตาบอดสี/สายตาไม่ดีอ่านได้)
const PILL: Record<StatusKind, { label: string; className: string; dot: string }> = {
  granted: { label: 'ยินยอมแล้ว', className: 'bg-[#ECFDF5] text-[#047857]', dot: 'bg-[#10B981]' },
  outdated: {
    label: 'ยินยอมไว้กับนโยบายฉบับเก่า',
    className: 'bg-[#FFFBEB] text-[#B45309]',
    dot: 'bg-[#F59E0B]',
  },
  withdrawn: { label: 'ถอนความยินยอมแล้ว', className: 'bg-[#FEF2F2] text-[#B91C1C]', dot: 'bg-[#EF4444]' },
  declined: { label: 'ไม่ได้ยินยอม', className: 'bg-[#F9FAFB] text-[#6B7280]', dot: 'bg-[#9CA3AF]' },
  unanswered: { label: 'ไม่ได้ยินยอม', className: 'bg-[#F9FAFB] text-[#6B7280]', dot: 'bg-[#9CA3AF]' },
};

function StatusPill({ kind }: { kind: StatusKind }) {
  const pill = PILL[kind];
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold ${pill.className}`}
    >
      <span className={`h-2 w-2 rounded-full ${pill.dot}`} aria-hidden="true" />
      {pill.label}
    </span>
  );
}

function Badge({ children, tone }: { children: string; tone: 'rose' | 'slate' | 'teal' }) {
  const cls =
    tone === 'rose'
      ? 'bg-[#FFF1F2] text-[#BE123C]'
      : tone === 'teal'
        ? 'bg-[#F0FDFA] text-[#0F766E]'
        : 'bg-[#F1F5F9] text-[#475569]';
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[#F3F4F6] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] md:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function lastChangedText(s: ConsentStatus): string {
  if (!s.answeredAt) return 'ยังไม่เคยตอบ';
  return `เปลี่ยนแปลงล่าสุด: ${formatDate(s.answeredAt)} ${formatTime(s.answeredAt)} น.`;
}

function ConsentCard({
  row,
  disabled,
  onWithdraw,
  onGrant,
}: {
  row: ConsentRow;
  disabled: boolean;
  onWithdraw: () => void;
  onGrant: () => void;
}) {
  const { status, item } = row;
  const kind = statusKind(status);
  const canWithdraw = status.withdrawable && status.granted;
  // ยังไม่ยินยอม หรือยินยอมไว้กับฉบับเก่า → เสนอให้ยินยอมกับฉบับปัจจุบัน
  const canGrant = !status.granted || !status.isCurrentVersion;
  const titleId = `consent-${status.type}-title`;

  return (
    <Card>
      <article aria-labelledby={titleId}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 id={titleId} className="text-[16px] font-semibold leading-6 text-[#1A1A1A]">
              {item.labelTh}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.sensitive && <Badge tone="rose">ข้อมูลอ่อนไหว</Badge>}
              {status.required && status.withdrawable && <Badge tone="teal">จำเป็นต่อการจอง</Badge>}
              {!status.withdrawable && <Badge tone="slate">เงื่อนไขการใช้บัญชี</Badge>}
            </div>
          </div>
          <StatusPill kind={kind} />
        </div>

        <p className="mt-3 text-[15px] leading-7 text-[#4B5563]">{item.descriptionTh}</p>
        <p className="mt-2 text-[13px] text-[#6B7280]">{lastChangedText(status)}</p>

        {!status.withdrawable && (
          <p className="mt-3 rounded-lg bg-[#F9FAFB] px-4 py-3 text-[14px] leading-6 text-[#4B5563]">
            ข้อนี้เป็นเงื่อนไขของการมีบัญชี หากไม่ต้องการใช้บริการต่อ ติดต่อขอลบบัญชีได้ที่{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} className="font-semibold text-[#009265] underline underline-offset-2">
              {PRIVACY_EMAIL}
            </a>
          </p>
        )}

        {(canWithdraw || canGrant) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {canGrant && (
              <button
                type="button"
                onClick={onGrant}
                disabled={disabled}
                className="h-11 rounded-lg bg-[#009265] px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#007C55] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status.granted ? 'ให้ความยินยอมกับฉบับปัจจุบัน' : 'ให้ความยินยอม'}
              </button>
            )}
            {canWithdraw && (
              <button
                type="button"
                onClick={onWithdraw}
                disabled={disabled}
                className="h-11 rounded-lg border border-[#FECACA] bg-white px-5 text-[15px] font-semibold text-[#DC2626] transition-colors hover:bg-[#FEF2F2] disabled:cursor-not-allowed disabled:opacity-60"
              >
                ถอนความยินยอม
              </button>
            )}
          </div>
        )}
      </article>
    </Card>
  );
}

// ─── Dialogs ─────────────────────────────────────────────────────────────────

function DialogButtons({
  busy,
  onClose,
  onConfirm,
  confirmText,
  confirmClass,
}: {
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  confirmClass: string;
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="h-12 min-w-[140px] rounded-lg border border-[#E5E7EB] px-5 text-[15px] font-semibold text-[#374151] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60"
      >
        ยกเลิก
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className={`h-12 min-w-[180px] rounded-lg px-5 text-[15px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${confirmClass}`}
      >
        {busy ? 'กำลังบันทึก...' : confirmText}
      </button>
    </div>
  );
}

/**
 * ยืนยันการถอน — แสดง "สิ่งที่จะหยุด" (แดง) และ "สิ่งที่ยังเหมือนเดิม" (เขียว) ทุกครั้ง
 * ★ ข้อที่ถอนแล้วจองไม่ได้ (severe) ใช้กรอบเตือนสีแดงเข้ม — การ์ดกำหนดว่าต้องเตือนก่อนถอนข้อบังคับ
 */
function WithdrawDialog({
  row,
  busy,
  onClose,
  onConfirm,
}: {
  row: ConsentRow;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const c = consequencesFor(row.status.type);
  const keeps = [...c.keeps, ALWAYS_KEEPS];

  return (
    <ModalShell onClose={onClose} maxWidth={540} labelledBy="withdraw-title">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FEE2E2] text-[#DC2626]">
          <Icon name={c.severe ? 'warning' : 'remove_circle_outline'} size="large" />
        </span>
        <h2 id="withdraw-title" className="mt-4 text-[20px] font-bold text-[#064E3B]">
          ถอนความยินยอม{c.shortLabel}?
        </h2>
        <p className="mt-1 text-[15px] text-[#6B7280]">{row.item.labelTh}</p>
      </div>

      <div
        className={`mt-5 rounded-xl p-4 ${c.severe ? 'border-2 border-[#FCA5A5] bg-[#FEF2F2]' : 'bg-[#FEF2F2]'}`}
      >
        <p className="text-[14px] font-semibold text-[#991B1B]">
          {c.severe ? 'สำคัญ: ถอนแล้วจะมีผลต่อการจองของคุณ' : 'เมื่อถอนแล้ว'}
        </p>
        <ul className="mt-2 space-y-2">
          {c.stops.map((text) => (
            <li key={text} className="flex items-start gap-2 text-[15px] leading-6 text-[#991B1B]">
              <Icon name="close" size="small" className="mt-1 shrink-0" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="mt-3 space-y-2 rounded-xl bg-[#ECFDF5] p-4">
        {keeps.map((text) => (
          <li key={text} className="flex items-start gap-2 text-[15px] leading-6 text-[#047857]">
            <Icon name="check" size="small" className="mt-1 shrink-0" />
            <span>{text}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[13px] leading-6 text-[#6B7280]">
        เปลี่ยนใจภายหลังได้ โดยกด “ให้ความยินยอม” ที่หน้านี้อีกครั้ง
      </p>

      <DialogButtons
        busy={busy}
        onClose={onClose}
        onConfirm={onConfirm}
        confirmText="ยืนยันถอนความยินยอม"
        confirmClass="bg-[#DC2626] hover:bg-[#B91C1C]"
      />
    </ModalShell>
  );
}

/** ยืนยันการให้ความยินยอม — แสดงข้อความเต็มของข้อนั้น ผู้ใช้ต้องได้อ่านสิ่งที่กำลังยินยอม */
function GrantDialog({
  row,
  version,
  effectiveDate,
  busy,
  onClose,
  onConfirm,
}: {
  row: ConsentRow;
  version: string;
  effectiveDate: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell onClose={onClose} maxWidth={540} labelledBy="grant-title">
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#009265] text-white">
          <Icon name="verified_user" />
        </span>
        <div className="min-w-0">
          <h2 id="grant-title" className="text-[20px] font-bold text-[#064E3B]">
            ให้ความยินยอม
          </h2>
          <p className="mt-1 text-[14px] text-[#6B7280]">กรุณาอ่านข้อความด้านล่างก่อนยืนยัน</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-[#D1FAE5] bg-[#F0FDF9] p-4">
        <p className="text-[16px] font-semibold leading-6 text-[#065F46]">{row.item.labelTh}</p>
        <p className="mt-2 text-[15px] leading-7 text-[#374151]">{row.item.descriptionTh}</p>
      </div>

      <p className="mt-3 text-[13px] leading-6 text-[#6B7280]">
        ตามประกาศความเป็นส่วนตัวฉบับ {version} (เริ่มใช้ {formatEffectiveDate(effectiveDate)}) ·
        ถอนความยินยอมได้ทุกเมื่อที่หน้านี้
      </p>

      <DialogButtons
        busy={busy}
        onClose={onClose}
        onConfirm={onConfirm}
        confirmText="ยืนยันให้ความยินยอม"
        confirmClass="bg-[#009265] hover:bg-[#007C55]"
      />
    </ModalShell>
  );
}

// ─── การ์ดประกาศ + สิทธิ์ ────────────────────────────────────────────────────

/** "2026-09-22" → "22 ก.ย. 2569" — อ่านเป็นเวลาท้องถิ่น ไม่ให้วันเลื่อนเพราะ UTC */
function formatEffectiveDate(ymd: string): string {
  return formatDate(new Date(`${ymd}T00:00:00`)) || ymd;
}

function NoticeCard({
  version,
  effectiveDate,
  onOpen,
}: {
  version: string;
  effectiveDate: string;
  onOpen: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E7F5EE] text-[#009265]">
            <Icon name="description" />
          </span>
          <div>
            <h2 className="text-[16px] font-semibold text-[#1A1A1A]">ประกาศความเป็นส่วนตัว</h2>
            <p className="mt-1 text-[14px] text-[#6B7280]">
              ฉบับ {version} · เริ่มใช้ {formatEffectiveDate(effectiveDate)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="h-11 rounded-lg border border-[#009265] bg-white px-5 text-[15px] font-semibold text-[#009265] transition-colors hover:bg-[#E7F5EE]"
        >
          อ่านประกาศความเป็นส่วนตัวฉบับเต็ม
        </button>
      </div>
    </Card>
  );
}

/** สิทธิ์อื่นตาม PDPA ที่ยังไม่มีปุ่มในแอป — ใช้ผ่านอีเมล (ตามที่ประกาศระบุไว้) */
const OTHER_RIGHTS = [
  'ขอดูหรือขอสำเนาข้อมูลของคุณ',
  'ขอแก้ไขข้อมูลให้ถูกต้อง',
  'ขอลบข้อมูล หรือปิดบัญชี',
  'คัดค้านหรือขอให้หยุดใช้ข้อมูล',
];

function RightsCard({ note }: { note: string }) {
  return (
    <Card>
      <h2 className="text-[16px] font-semibold text-[#1A1A1A]">สิทธิ์อื่นของคุณ</h2>
      {note && <p className="mt-2 text-[15px] leading-7 text-[#4B5563]">{note}</p>}
      <ul className="mt-3 space-y-2">
        {OTHER_RIGHTS.map((right) => (
          <li key={right} className="flex items-start gap-2 text-[15px] leading-6 text-[#374151]">
            <Icon name="check_circle" size="small" className="mt-1 shrink-0 text-[#52B69A]" />
            <span>{right}</span>
          </li>
        ))}
      </ul>
      <a
        href={`mailto:${PRIVACY_EMAIL}`}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-[#E7F5EE] px-5 text-[15px] font-semibold text-[#047857] transition-colors hover:bg-[#D1FAE5]"
      >
        <Icon name="mail" size="small" />
        ติดต่อ {PRIVACY_EMAIL}
      </a>
    </Card>
  );
}

// ─── Loading / error ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="กำลังโหลด">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <Skeleton width="45%" height={18} />
          <Skeleton width="90%" height={14} className="mt-3" />
          <Skeleton width="70%" height={14} className="mt-2" />
          <Skeleton width={140} height={44} className="mt-4" />
        </Card>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
        <Icon name="error_outline" size="large" />
      </span>
      <p className="mt-3 text-[16px] font-semibold text-[#1A1A1A]">โหลดข้อมูลความยินยอมไม่สำเร็จ</p>
      <p className="mt-1 text-[14px] text-[#6B7280]">กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่อีกครั้ง</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 h-11 rounded-lg bg-[#009265] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#007C55]"
      >
        ลองใหม่
      </button>
    </Card>
  );
}
