import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Icon } from '../../../components/ui/Icon';
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

interface CareLog {
  id: string;
  bookingId: string;
  category: string;
  body: string;
  photoUrl?: string | null;
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

function formatLogTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export interface CareLogCardProps {
  bookingId: string;
}

export default function CareLogCard({ bookingId }: Readonly<CareLogCardProps>) {
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<CareLogCategory>('medication');
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  const { data, loading, error: loadError, refetch } = useQuery<CareLogsData, CareLogsVariables>(GET_CARE_LOGS, {
    variables: { bookingId, limit: 20, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });
  const [addCareLog, { loading: saving }] = useMutation<AddCareLogData, AddCareLogVariables>(ADD_CARE_LOG);

  async function handleSubmit() {
    const body = note.trim();
    if (!body || saving) return;

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
    showSuccess('บันทึกการดูแลแล้ว', 3000);
    try {
      await refetch();
    } catch {
      // บันทึกสำเร็จแล้ว การโหลดรายการซ้ำล้มเหลวไม่ควรรายงานว่าบันทึกไม่สำเร็จ
    }
  }

  const logs = data?.careLogs ?? [];

  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
      <p className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        บันทึกการดูแล
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CATEGORIES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setCategory(item.value)}
            aria-pressed={category === item.value}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              category === item.value ? 'bg-[#52B69A] text-white' : 'bg-[#F0F1F3] text-[#575859] hover:bg-[#E5E7EB]'
            }`}
            style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={500}
        rows={3}
        placeholder="บันทึกสิ่งที่เกิดขึ้นระหว่างการดูแล..."
        className="mt-3 w-full resize-none rounded-xl border border-[#E5E7EB] p-3 text-sm text-[#1A1A1A] placeholder:text-[#B0B3B8] focus:border-[#52B69A] focus:outline-none focus:ring-1 focus:ring-[#52B69A]"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-[#B0B3B8]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          {note.length}/500
        </span>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!note.trim() || saving}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-[#52B69A] px-4 text-xs font-bold text-white transition hover:bg-[#489e86] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <Icon name={saving ? 'hourglass_empty' : 'send'} size="small" color="#FFFFFF" />
          {saving ? 'กำลังบันทึก...' : 'บันทึก'}
        </button>
      </div>

      <div className="mt-5 border-t border-[#F0F1F3] pt-4">
        <p className="text-sm font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          บันทึกล่าสุด
        </p>
        {loading && logs.length === 0 && (
          <p className="mt-3 text-xs text-[#8A8C8E]">กำลังโหลดบันทึก...</p>
        )}
        {loadError && logs.length === 0 && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[#FFF2F2] p-3">
            <p className="text-xs text-[#B42318]">โหลดบันทึกไม่สำเร็จ</p>
            <button type="button" onClick={() => void refetch()} className="text-xs font-bold text-[#B42318] underline">
              ลองใหม่
            </button>
          </div>
        )}
        {!loading && !loadError && logs.length === 0 && (
          <p className="mt-3 text-xs text-[#8A8C8E]">ยังไม่มีบันทึกการดูแล</p>
        )}
        {logs.length > 0 && (
          <div className="mt-3 flex flex-col gap-2.5">
            {logs.map((log) => (
              <article key={log.id} className="rounded-xl border border-[#E5E7EB] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[#EAF7F3] px-2.5 py-0.5 text-[11px] font-semibold text-[#31866F]">
                    {categoryLabel(log.category)}
                  </span>
                  <time className="text-[11px] text-[#8A8C8E]" dateTime={log.serverTs}>
                    {formatLogTime(log.serverTs)}
                  </time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#343536]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
                  {log.body}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
