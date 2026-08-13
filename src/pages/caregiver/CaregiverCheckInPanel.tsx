import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { CHECK_IN_BOOKING } from '../../graphql/queries';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';
import { Icon } from '../../components/ui/Icon';
import { haversineM } from '../../lib/checkinThresholds';
import { deriveCheckInGpsState, deriveTimingNotice, type CheckInGpsState } from './checkInStates';

export interface CheckInJobEvent {
  serverTs: string;
  alreadyCheckedIn: boolean;
}

export interface CaregiverCheckInPanelProps {
  bookingId: string;
  jobLat: number | null;
  jobLng: number | null;
  bookingDate: string;
  startTime: string | null;
  onCheckedIn: (jobEvent: CheckInJobEvent) => void;
  onPreviewPositionChange?: (coords: { lat: number; lng: number } | null) => void;
}

interface StatusPillConfig {
  icon: string;
  iconColor: string;
  bg: string;
  border: string;
  textColor: string;
  label: string;
  spin?: boolean;
}

const STATUS_PILLS: Record<CheckInGpsState, StatusPillConfig> = {
  not_asked: { icon: 'location_searching', iconColor: '#575859', bg: '#F0F1F3', border: '#E0E2E5', textColor: '#575859', label: 'กำลังหาตำแหน่ง' },
  ready: { icon: 'gps_fixed', iconColor: '#047857', bg: '#ECFDF5', border: 'rgba(16,185,129,.3)', textColor: '#047857', label: 'อยู่ในพื้นที่แล้ว' },
  warn: { icon: 'gps_not_fixed', iconColor: '#B45309', bg: '#FFFBEB', border: 'rgba(245,158,11,.35)', textColor: '#B45309', label: 'นอกรัศมีแนะนำ' },
  beyond: { icon: 'report', iconColor: '#DC2626', bg: '#FEF2F2', border: 'rgba(220,38,38,.25)', textColor: '#DC2626', label: 'นอกพื้นที่' },
  denied: { icon: 'location_off', iconColor: '#575859', bg: '#F0F1F3', border: '#E0E2E5', textColor: '#575859', label: 'ไม่มีข้อมูลตำแหน่ง' },
  weak_signal: { icon: 'signal_cellular_alt', iconColor: '#575859', bg: '#F0F1F3', border: '#E0E2E5', textColor: '#575859', label: 'สัญญาณไม่ชัด' },
};

const EXPLANATION_COPY: Record<CheckInGpsState, { title: string; description?: string }> = {
  not_asked: {
    title: 'คลิกเพื่ออนุญาตตำแหน่ง',
    description: 'เราขอตำแหน่งเพื่อยืนยันว่าคุณไปถึงบ้านผู้รับบริการแล้ว ใช้เฉพาะตอนเช็คอิน/เช็คเอาท์',
  },
  ready: { title: 'คุณอยู่ในพื้นที่แล้ว' },
  warn: { title: 'อยู่นอกรัศมีแนะนำ แต่เช็คอินได้' },
  beyond: { title: 'อยู่นอกพื้นที่ ระบบจะให้แอดมินตรวจสอบ' },
  denied: { title: 'เช็คอินได้ แต่ไม่มีข้อมูลตำแหน่ง' },
  weak_signal: {
    title: 'สัญญาณตำแหน่งไม่ชัด ระบบจะไม่ใช้ระยะทางในการตรวจสอบงานนี้',
    description: 'ถ้าเปิดจากมือถือจะได้ตำแหน่งที่แม่นกว่า',
  },
};

const EXPLANATION_BOX_TONE: Record<CheckInGpsState, { bg: string; border: string }> = {
  not_asked: { bg: '#F0F1F3', border: '#E0E2E5' },
  ready: { bg: '#ECFDF5', border: 'rgba(16,185,129,.3)' },
  warn: { bg: '#FFFBEB', border: 'rgba(245,158,11,.35)' },
  beyond: { bg: '#FEF2F2', border: 'rgba(220,38,38,.25)' },
  denied: { bg: '#F0F1F3', border: '#E0E2E5' },
  // Explicitly neutral, never red/amber — the caregiver didn't do anything wrong here.
  weak_signal: { bg: '#F0F1F3', border: '#E0E2E5' },
};

function formatCheckInTime(serverTs: string): string {
  return new Date(serverTs).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

export default function CaregiverCheckInPanel({
  bookingId,
  jobLat,
  jobLng,
  bookingDate,
  startTime,
  onCheckedIn,
  onPreviewPositionChange,
}: Readonly<CaregiverCheckInPanelProps>) {
  const geo = useGeolocation();
  const { toasts, removeToast, error: showError } = useToast();
  const [checkInBooking, { loading: submitting }] = useMutation<{ checkInBooking: CheckInJobEvent }>(CHECK_IN_BOOKING);
  const [successEvent, setSuccessEvent] = useState<CheckInJobEvent | null>(null);
  const [checkedInWithoutLocation, setCheckedInWithoutLocation] = useState(false);

  const previewDistanceM = useMemo(() => {
    if (geo.coords === null || jobLat === null || jobLng === null) return null;
    return haversineM(geo.coords.lat, geo.coords.lng, jobLat, jobLng);
  }, [geo.coords, jobLat, jobLng]);

  const gpsState: CheckInGpsState = checkedInWithoutLocation
    ? 'denied'
    : deriveCheckInGpsState({ geoStatus: geo.status, accuracyM: geo.accuracyM, previewDistanceM });

  const timingNotice = useMemo(
    () => deriveTimingNotice({ bookingDate, startTime, now: new Date() }),
    [bookingDate, startTime],
  );

  useEffect(() => {
    onPreviewPositionChange?.(geo.coords);
  }, [geo.coords, onPreviewPositionChange]);

  async function submitCheckIn(coords: { lat: number; lng: number } | null, accuracyM: number | null) {
    try {
      const { data } = await checkInBooking({
        variables: {
          input: {
            bookingId,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            accuracyM: accuracyM !== null ? Math.round(accuracyM) : null,
            deviceTs: new Date().toISOString(),
          },
        },
      });
      const jobEvent = data?.checkInBooking;
      if (!jobEvent) return;
      setSuccessEvent(jobEvent);
      onCheckedIn(jobEvent);
    } catch (err) {
      const message = (err as { graphQLErrors?: { message?: string }[] })?.graphQLErrors?.[0]?.message;
      showError(message || 'ไม่สามารถเช็คอินได้ กรุณาลองใหม่', 4000);
    }
  }

  function handlePrimaryButtonClick() {
    if (gpsState === 'not_asked') {
      geo.requestPosition();
      return;
    }
    void submitCheckIn(geo.coords, geo.accuracyM);
  }

  function handleCheckInWithoutLocation() {
    setCheckedInWithoutLocation(true);
    void submitCheckIn(null, null);
  }

  if (successEvent) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />
        <div className="flex items-center gap-3">
          <Icon name="check_circle" color="#047857" size="large" />
          <div>
            <p className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              เช็คอินแล้ว {formatCheckInTime(successEvent.serverTs)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const pill = STATUS_PILLS[gpsState];
  const explanation = EXPLANATION_COPY[gpsState];
  const boxTone = EXPLANATION_BOX_TONE[gpsState];
  const primaryLabel = gpsState === 'not_asked' ? 'อนุญาตตำแหน่ง' : 'เช็คอินเริ่มงาน';
  const primaryIcon = gpsState === 'not_asked' ? 'my_location' : 'login';

  return (
    <div className="rounded-2xl bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <ToastContainer toasts={toasts} onRemove={removeToast} position="top-right" />

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-bold text-[#1A1A1A]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          เช็คอินเริ่มงาน
        </h2>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: pill.bg, border: `0.8px solid ${pill.border}`, color: pill.textColor, fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          <Icon name={pill.icon} size="small" color={pill.iconColor} className={pill.spin ? 'animate-pulse' : ''} />
          {pill.label}
        </span>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl p-3.5" style={{ backgroundColor: boxTone.bg, border: `0.8px solid ${boxTone.border}` }}>
        <Icon name={pill.icon} color={pill.iconColor} />
        <div>
          <p className="text-sm font-semibold" style={{ color: pill.textColor, fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {explanation.title}
          </p>
          {explanation.description && (
            <p className="mt-1 text-xs text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
              {explanation.description}
            </p>
          )}
        </div>
      </div>

      {timingNotice === 'late' && (
        <p className="mt-3 text-xs font-semibold text-[#B45309]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
          เลยเวลานัดแล้ว ระบบจะบันทึกไว้
        </p>
      )}

      <button
        type="button"
        onClick={handlePrimaryButtonClick}
        disabled={submitting}
        className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#52B69A] text-sm font-bold text-white shadow-[0_4px_12px_rgba(82,182,154,0.2)] transition hover:bg-[#489e86] focus:outline-none focus:ring-2 focus:ring-[#52B69A] focus:ring-offset-2 disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:px-8"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <Icon name={primaryIcon} color="#FFFFFF" size="small" />
        {primaryLabel}
      </button>

      <p className="mt-2.5 text-[11px] text-[#8A8C8E]" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
        ปุ่มเช็คอินกดได้เสมอ ไม่ว่าสัญญาณตำแหน่งจะเป็นอย่างไร
      </p>

      {gpsState === 'not_asked' && (
        <button
          type="button"
          onClick={handleCheckInWithoutLocation}
          disabled={submitting}
          className="mt-2 text-[11px] font-semibold text-[#8A8C8E] underline focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
          style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
        >
          ไม่อนุญาตตำแหน่ง — เช็คอินโดยไม่มีพิกัด
        </button>
      )}
    </div>
  );
}
