import { useMutation } from '@apollo/client/react';
import { CHECK_OUT_BOOKING } from '../../../graphql/queries';
import { useGeolocation } from '../../../hooks/useGeolocation';
import { useToast } from '../../../hooks/useToast';
import { ToastContainer } from '../../../components/ui/Toast';
import { Icon } from '../../../components/ui/Icon';
import { extractGraphQLErrorMessage } from '../../../lib/apolloErrors';

export interface CheckoutJobEvent {
  serverTs: string;
  alreadyCheckedIn: boolean;
}

export interface CheckoutButtonProps {
  bookingId: string;
  onCheckedOut: (jobEvent: CheckoutJobEvent) => void;
}

/** Shell-less checkout action — meant to be nested inside ServiceProgressWorkCard, matching the
 * Figma spec where checkout lives in the same card as the map/times. Same "GPS never blocks"
 * two-step affordance as the check-in panel (ask permission, then submit). A free-text note is
 * intentionally not offered here — this design routes notes through the separate care-log card
 * instead (see plan §4: care-log persistence isn't wired up yet, so it's a visual-only card there
 * for now; checkout itself still fully works without a note, since CheckOutInput.note is optional). */
export default function CheckoutButton({ bookingId, onCheckedOut }: Readonly<CheckoutButtonProps>) {
  const geo = useGeolocation();
  const { toasts, removeToast, error: showError } = useToast();
  const [checkOutBooking, { loading: submitting }] = useMutation<{ checkOutBooking: CheckoutJobEvent }>(CHECK_OUT_BOOKING);

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
          },
        },
      });
      const jobEvent = data?.checkOutBooking;
      if (!jobEvent) return;
      onCheckedOut(jobEvent);
    } catch (err) {
      showError(extractGraphQLErrorMessage(err) ?? 'ไม่สามารถเช็คเอาท์ได้ กรุณาลองใหม่', 4000);
    }
  }

  function handleClick() {
    if (geo.status === 'idle') {
      geo.requestPosition();
      return;
    }
    void submitCheckOut();
  }

  const readyToCheckOut = geo.status !== 'idle';
  const buttonLabel = readyToCheckOut ? 'เช็คเอาท์ / จบงาน' : 'อนุญาตตำแหน่งเพื่อเช็คเอาท์';
  const buttonIcon = readyToCheckOut ? 'logout' : 'my_location';

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting || geo.status === 'requesting'}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#52B69A] text-sm font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition hover:bg-[#489e86] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <Icon name={buttonIcon} color="#FFFFFF" size="small" />
        {buttonLabel}
      </button>
      <p className="mt-2 text-center text-[11px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        กดจบงานได้เลยเมื่อดูแลเสร็จ ไม่ต้องรอถึงเวลาที่คาด
      </p>
    </>
  );
}
