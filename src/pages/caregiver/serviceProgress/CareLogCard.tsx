import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/Toast';
import { ADD_CARE_LOG, GET_CARE_LOGS } from '../../../graphql/queries';
import { extractGraphQLErrorMessage } from '../../../lib/apolloErrors';

const CATEGORIES = [
  { value: 'medication', label: 'ยา' },
  { value: 'food', label: 'อาหาร' },
  { value: 'vitals', label: 'สุขภาพร่างกาย' },
  { value: 'activity', label: 'กิจกรรม' },
  { value: 'other', label: 'อื่นๆ' },
] as const;

type CareLogCategory = (typeof CATEGORIES)[number]['value'];

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;
const MAX_NOTE = 500;

interface CareLog {
  id: string;
  bookingId: string;
  category: string;
  body: string;
  serverTs: string;
  deviceTs?: string | null;
}

interface CareLogsData {
  careLogs: CareLog[];
}

interface CareLogsVariables {
  bookingId: string;
  limit: number;
  offset: number;
}

interface AddCareLogData {
  addCareLog: CareLog;
}

interface AddCareLogVariables {
  input: {
    bookingId: string;
    category: CareLogCategory;
    body: string;
    deviceTs: string;
  };
}

function categoryLabel(value: string): string {
  return CATEGORIES.find((category) => category.value === value)?.label ?? 'อื่นๆ';
}

// วันนี้แสดงแค่เวลา ("02:17 น.") — วันอื่นเติมวันที่นำหน้า
function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const time = `${new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)} น.`;
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(date)} ${time}`;
}

function MaterialIcon({ name, size = 18, color }: Readonly<{ name: string; size?: number; color?: string }>) {
  return (
    <span className="material-icons" aria-hidden="true" style={{ fontSize: size, color, lineHeight: 1 }}>
      {name}
    </span>
  );
}

export interface CareLogCardProps {
  bookingId: string;
}

export default function CareLogCard({ bookingId }: Readonly<CareLogCardProps>) {
  const [note, setNote] = useState('');
  // เริ่มจากไม่เลือก — backend บังคับ category (String! + @IsIn + DB CHECK) จึงต้องให้ผู้ดูแลเลือกเองทุกครั้ง
  const [category, setCategory] = useState<CareLogCategory | null>(null);
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const [addCareLog, { loading: saving }] = useMutation<AddCareLogData, AddCareLogVariables>(ADD_CARE_LOG);
  const { data, loading, error: loadError, refetch } = useQuery<CareLogsData, CareLogsVariables>(GET_CARE_LOGS, {
    variables: { bookingId, limit: 20, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const busy = saving;
  const canSubmit = Boolean(note.trim()) && category !== null && !busy;

  async function handleSubmit() {
    const body = note.trim();
    if (!body || category === null || busy) return;

    try {
      await addCareLog({
        variables: {
          input: {
            bookingId,
            category,
            body,
            deviceTs: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      showError(extractGraphQLErrorMessage(error) ?? 'บันทึกการดูแลไม่สำเร็จ กรุณาลองใหม่', 4000);
      return;
    }

    setNote('');
    setCategory(null);
    showSuccess('บันทึกการดูแลแล้ว', 3000);
    try {
      await refetch();
    } catch {
      // บันทึกสำเร็จแล้ว การโหลดรายการซ้ำล้มเหลวไม่ควรรายงานว่าบันทึกไม่สำเร็จ
    }
  }

  const logs = data?.careLogs ?? [];

  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]" style={FONT}>
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[17px] font-bold text-[#1A1A1A]">บันทึกการดูแล</p>
        {logs.length > 0 && (
          <p className="text-xs text-[#8A8C8E]">
            ส่งแล้ว <span className="font-bold text-[#575859]">{logs.length}</span> รายการ
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setCategory(item.value)}
            aria-pressed={category === item.value}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
              category === item.value ? 'bg-[#52B69A] text-white' : 'bg-[#F0F1F3] text-[#575859] hover:bg-[#E5E7EB]'
            }`}
            style={FONT}
          >
            {item.label}
          </button>
        ))}
      </div>
      {category === null && (
        // เทาเมื่อยังไม่พิมพ์ · แดงเมื่อพิมพ์แล้วแต่ยังไม่เลือก = เหตุผลที่ปุ่มบันทึกยังกดไม่ได้
        <p className={`mt-1.5 text-[11px] ${note.trim() ? 'text-[#DC2626]' : 'text-[#8A8C8E]'}`} role="status">
          โปรดระบุประเภทบันทึก
        </p>
      )}

      {/* ── Composer ── */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-[#E5E7EB] focus-within:border-[#52B69A]">
        <div className="px-4 pb-2 pt-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={MAX_NOTE}
            rows={3}
            disabled={busy}
            aria-label="บันทึกการดูแล"
            placeholder="เขียนบันทึกการดูแล เช่น ให้ยาความดัน 1 เม็ด หลังอาหารเช้า · วัดความดัน 128/80 ปกติดี"
            className="w-full resize-none border-0 bg-transparent p-0 text-sm text-[#1A1A1A] placeholder:text-[#B0B3B8] focus:outline-none focus:ring-0"
            style={FONT}
          />
          <p className="text-right text-[11px] text-[#B0B3B8]">
            {note.length}/{MAX_NOTE}
          </p>
        </div>

        <div className="flex items-center justify-end border-t border-[#F0F1F3] px-3 py-2.5">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#52B69A] px-5 text-sm font-bold text-white transition hover:bg-[#489e86] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            style={FONT}
          >
            <MaterialIcon name={busy ? 'hourglass_empty' : 'send'} size={18} color="#FFFFFF" />
            {saving && 'กำลังบันทึก...'}
            {!busy && 'บันทึก'}
          </button>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="mt-5 border-t border-[#F0F1F3] pt-5">
        {loading && logs.length === 0 && <p className="text-xs text-[#8A8C8E]">กำลังโหลดบันทึก...</p>}
        {loadError && logs.length === 0 && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-[#FFF2F2] p-3">
            <p className="text-xs text-[#B42318]">โหลดบันทึกไม่สำเร็จ</p>
            <button type="button" onClick={() => void refetch()} className="cursor-pointer text-xs font-bold text-[#B42318] underline">
              ลองใหม่
            </button>
          </div>
        )}
        {!loading && !loadError && logs.length === 0 && (
          <p className="text-xs text-[#8A8C8E]">ยังไม่มีบันทึกการดูแล</p>
        )}
        {logs.length > 0 && (
          <ol className="flex flex-col">
            {logs.map((log, index) => {
              const isLast = index === logs.length - 1;
              return (
                <li key={log.id} className="relative pb-5 pl-7 last:pb-0">
                  {!isLast && <span className="absolute bottom-0 left-[5px] top-4 w-px bg-[#E5E7EB]" aria-hidden="true" />}
                  <span className="absolute left-0 top-[5px] h-3 w-3 rounded-full bg-[#52B69A]" aria-hidden="true" />

                  <div className="flex items-center gap-2">
                    <time className="text-xs font-semibold text-[#8A8C8E]" dateTime={log.serverTs}>
                      {formatLogTime(log.serverTs)}
                    </time>
                    <span className="rounded-full bg-[#EAF7F3] px-2.5 py-0.5 text-[11px] font-semibold text-[#31866F]">
                      {categoryLabel(log.category)}
                    </span>
                  </div>

                  <article className="mt-2 rounded-xl border border-[#E5E7EB] px-4 py-3">
                    <p className="whitespace-pre-wrap break-words text-sm text-[#343536]">{log.body}</p>
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>

    </div>
  );
}
