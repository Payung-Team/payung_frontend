import Icon from '../../../components/ui/Icon';
import type { ChecklistRow, KycChecklist } from './useKycChecklist';

interface Hint {
  tone: 'err' | 'warn' | 'info' | 'ok';
  text: string;
  items?: ChecklistRow[];
}

const TONE: Record<Hint['tone'], { color: string; icon: string }> = {
  err: { color: 'text-[#B91C1C]', icon: 'warning' },
  warn: { color: 'text-[#92400E]', icon: 'error_outline' },
  info: { color: 'text-[#374151]', icon: 'pending' },
  ok: { color: 'text-[#047857]', icon: 'check_circle' },
};

/**
 * แถบล่างของการ์ดตรวจ — บอกว่ายังขาดอะไร (กดชื่อรายการเพื่อไปดู) + ปุ่มปฏิเสธ / อนุมัติ
 * อนุมัติได้เมื่อผ่านครบทุกรายการ · ปฏิเสธได้เมื่อมีไม่ผ่านอย่างน้อย 1 และทุกรายการที่ไม่ผ่านมีเหตุผล
 * ผ่านครบแต่ยังไม่เลือกระดับ → ปุ่มอนุมัติกดได้ แล้วชี้ไปที่ตัวเลือกระดับ (S02-E1)
 */
export default function KycDecisionFooter({
  checklist,
  levelName,
  busy,
  onReject,
  onApprove,
}: {
  checklist: KycChecklist;
  /** ชื่อระดับที่เลือก · '' = ยังไม่เลือก */
  levelName: string;
  busy: boolean;
  onReject: () => void;
  onApprove: () => void;
}) {
  const { total, emptyRows, pendRows, failRows, allPass, canReject } = checklist;
  const hints: Hint[] = [];
  if (emptyRows.length) hints.push({ tone: 'err', text: 'ใส่เหตุผลที่ไม่ผ่านให้ครบก่อนปฏิเสธ:', items: emptyRows });
  if (pendRows.length) hints.push({ tone: 'info', text: `ยังไม่ได้ตรวจ ${pendRows.length} รายการ:`, items: pendRows });
  if (failRows.length && !emptyRows.length) {
    hints.push({ tone: 'warn', text: `ไม่ผ่าน ${failRows.length} รายการ — อนุมัติไม่ได้ กด “ปฏิเสธ” เพื่อส่งกลับให้ผู้ดูแลแก้ไข` });
  }
  if (allPass && !levelName) hints.push({ tone: 'info', text: `ตรวจผ่านครบ ${total}/${total} — เลือกระดับผู้ดูแลก่อนอนุมัติ` });
  if (allPass && levelName) hints.push({ tone: 'ok', text: `ตรวจผ่านครบ ${total}/${total} · พร้อมอนุมัติเป็น${levelName}` });

  const rejectEnabled = canReject && !busy;
  const approveEnabled = allPass && !busy;

  return (
    <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
      <div aria-live="polite" className="flex min-w-0 flex-1 flex-col gap-1.5">
        {hints.map((h) => (
          <p key={h.text} className={`flex flex-wrap items-center gap-1.5 text-[13px] leading-5 ${TONE[h.tone].color}`}>
            <Icon name={TONE[h.tone].icon} style={{ fontSize: 16 }} />
            <span>{h.text}</span>
            {h.items?.map((r) => (
              <button
                key={r.item.id}
                type="button"
                onClick={() => checklist.view(r.item.id)}
                className="h-[26px] cursor-pointer rounded-full border border-[#D1D5DB] bg-white px-2.5 text-[12.5px] font-semibold text-[#111827] underline underline-offset-2 hover:bg-gray-50"
              >
                {r.item.name}
              </button>
            ))}
          </p>
        ))}
      </div>
      <div className="flex shrink-0 gap-3">
        <button
          type="button"
          disabled={!rejectEnabled}
          onClick={onReject}
          className="h-10 min-w-[114px] flex-1 cursor-pointer rounded-lg border-[1.5px] border-[#EF4444] bg-white px-4 text-[14px] font-semibold text-[#DC2626] hover:bg-red-50 disabled:cursor-not-allowed disabled:border-[#E5E7EB] disabled:text-[#9CA3AF] disabled:hover:bg-white sm:flex-none"
        >
          ปฏิเสธ
        </button>
        <button
          type="button"
          disabled={!approveEnabled}
          onClick={onApprove}
          className="h-10 min-w-[142px] flex-1 cursor-pointer rounded-lg bg-[#059669] px-4 text-[14px] font-semibold text-white hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-[#E5E7EB] disabled:text-[#6B7280] sm:flex-none"
        >
          อนุมัติ
        </button>
      </div>
    </div>
  );
}
