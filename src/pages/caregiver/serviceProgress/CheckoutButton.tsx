import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { CHECK_OUT_BOOKING } from '../../../graphql/queries';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/Toast';
import { Icon } from '../../../components/ui/Icon';

export interface CheckoutJobEvent {
  serverTs: string;
  alreadyCheckedIn: boolean;
}

export interface CheckoutButtonProps {
  bookingId: string;
  onCheckedOut: (jobEvent: CheckoutJobEvent) => void;
}

const NOTE_MAX_LENGTH = 500;

function formatCheckOutTime(serverTs: string): string {
  return new Date(serverTs).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

/** Checkout flow — same "GPS never blocks" two-step affordance as the check-in panel (ask
 * permission, then submit), plus a text-only note (photo evidence isn't wired up yet — see the
 * implementation plan §4, it needs a backend upload mechanism that doesn't exist today). */
export default function CheckoutButton({ bookingId, onCheckedOut }: Readonly<CheckoutButtonProps>) {
  const geo = useGeolocation();
  const { toasts, removeToast, error: showError } = useToast();
  const [checkOutBooking, { loading: submitting }] = useMutation<{ checkOutBooking: CheckoutJobEvent }>(CHECK_OUT_BOOKING);
  const [note, setNote] = useState('');
  const [successEvent, setSuccessEvent] = useState<CheckoutJobEvent | null>(null);

  async function submitCheckOut() {
    try {
      const { data } = await checkOutBooking({
        variables: {
          input: {
            bookingId,
            lat: geo.coords?.lat ?? null,
            lng: geo.coords?.lng ?? null,
            accuracyM: geo.accuracyM !== null ? Math.round(geo.accuracyM) : null,
            deviceTs: new Date().toISOString(),
            note: note.trim() || null,
          },
        },
      });
      const jobEvent = data?.checkOutBooking;
      if (!jobEvent) return;
      setSuccessEvent(jobEvent);
      onCheckedOut(jobEvent);
    } catch (err) {
      const message = (err as { graphQLErrors?: { message?: string }[] })?.graphQLErrors?.[0]?.message;
      showError(message || 'ไม่สามารถเช็คเอาท์ได้ กรุณาลองใหม่', 4000);
    }
  }

  function handleClick() {
    if (geo.status === 'idle') {
      geo.requestPosition();
      return;
    }
    void submitCheckOut();
  }

  if (successEvent) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <Icon name="task_alt" color="#047857" size="large" />
          <p className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            เช็คเอาท์แล้ว {formatCheckOutTime(successEvent.serverTs)}
          </p>
        </div>
      </div>
    );
  }

  const readyToCheckOut = geo.status !== 'idle';
  const buttonLabel = readyToCheckOut ? 'เช็คเอาท์ / จบงาน' : 'อนุญาตตำแหน่งเพื่อเช็คเอาท์';
  const buttonIcon = readyToCheckOut ? 'logout' : 'my_location';

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />

      <label className="block" htmlFor="checkout-note">
        <span className="text-xs font-semibold text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          บันทึกก่อนจบงาน (ไม่บังคับ)
        </span>
        <textarea
          id="checkout-note"
          value={note}
          maxLength={NOTE_MAX_LENGTH}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="เพิ่มบันทึกการดูแล เช่น ให้ยาความดัน 1 เม็ด หลังอาหาร"
          className="mt-1.5 w-full resize-none rounded-2xl border border-[#E0E2E5] p-3.5 text-sm text-[#1A1A1A] placeholder:text-[#C6C8CB] focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        />
        <span className="mt-1 block text-right text-[11px] text-[#C6C8CB]" style={{ fontFamily: "'Inter', sans-serif" }}>
          {note.length}/{NOTE_MAX_LENGTH}
        </span>
      </label>

      <button
        type="button"
        onClick={handleClick}
        disabled={submitting || geo.status === 'requesting'}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#52B69A] text-sm font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition hover:bg-[#489e86] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:px-8"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <Icon name={buttonIcon} color="#FFFFFF" size="small" />
        {buttonLabel}
      </button>

      <p className="mt-2.5 text-[11px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        ปุ่มเช็คเอาท์กดได้เสมอ ไม่ว่าสัญญาณตำแหน่งจะเป็นอย่างไร
      </p>
    </div>
  );
}
