/**
 * CheckOutModal — "เช็คเอาท์ / จบงาน" (PYG-358)
 *
 * ★ การกดปุ่มในกล่องนี้ = การปิดงาน (ทีมตัดสินใจ 2026-07-27)
 *   ผู้รับบริการไม่ต้องกดยืนยันอะไรอีก ห้ามเขียนคำว่า "รอลูกค้ายืนยัน" ที่ไหนทั้งสิ้น
 *
 * เป็น centered dialog ไม่ใช่ bottom sheet — เราเป็น web app แล้ว
 * บนจอ ≥ sm ปุ่มอยู่ชิดขวาความกว้างปกติ, ต่ำกว่านั้นจึงเต็มความกว้าง
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { CHECK_OUT_BOOKING } from '../../graphql/queries';
import {
  GPS_ACCURACY_TRUST_M,
  MIN_DURATION_RATIO,
  NOTE_MAX_LENGTH,
  VERDICT_RADIUS_M,
  elapsedMinutesSince,
  formatDistanceTh,
  formatDurationTh,
  formatThaiTime,
  type JobEvent,
  type ProofOfWorkSummary,
} from '../../lib/monitoring';
import {
  ACCEPTED_EVIDENCE_TYPES,
  EvidenceError,
  uploadJobEvidence,
  validateEvidenceFile,
} from '../../lib/jobEvidence';
import {
  GEO_FAILURE_TH,
  haversineMeters,
  requestPosition,
  type GeoFailure,
  type GeoFix,
} from '../../lib/geolocation';

interface CheckOutModalProps {
  isOpen: boolean;
  bookingId: string;
  /** "REF-CG1" — โชว์ใต้หัวข้อให้ผู้ใช้รู้ว่ากำลังปิดงานใบไหน */
  bookingRef: string;
  proof: ProofOfWorkSummary;
  jobLat?: number | null;
  jobLng?: number | null;
  onClose: () => void;
  onSuccess: (event: JobEvent) => void;
}

type GeoState =
  | { status: 'requesting' }
  | { status: 'ok'; fix: GeoFix }
  | { status: 'failed'; reason: GeoFailure };

/** form = กรอกข้อมูล · confirming = ถามยืนยันเพราะมีคำเตือน · uploading/saving = กำลังทำงาน */
type Phase = 'form' | 'confirming' | 'uploading' | 'saving';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function CheckOutModal({
  isOpen,
  bookingId,
  bookingRef,
  proof,
  jobLat,
  jobLng,
  onClose,
  onSuccess,
}: Readonly<CheckOutModalProps>) {
  const [geo, setGeo] = useState<GeoState>({ status: 'requesting' });
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /**
   * เก็บ path ของรูปที่อัปโหลดสำเร็จแล้ว
   * ถ้า mutation ล้มเหลวและผู้ใช้กดลองใหม่ จะได้ไม่อัปโหลดรูปซ้ำอีกรอบ
   */
  const uploadedPathRef = useRef<string | null>(null);

  const [checkOutBooking] = useMutation(CHECK_OUT_BOOKING);

  const busy = phase === 'uploading' || phase === 'saving';

  // ── ขอตำแหน่งทันทีที่เปิดกล่อง ──────────────────────────────────────────
  const askForPosition = useCallback(() => {
    setGeo({ status: 'requesting' });
    void requestPosition().then((result) => {
      setGeo(result.ok ? { status: 'ok', fix: result.fix } : { status: 'failed', reason: result.reason });
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    askForPosition();
  }, [isOpen, askForPosition]);

  // ── เดินนาฬิกา "ตอนนี้" ทุก 30 วิ ให้เวลาที่โชว์ไม่ค้าง ─────────────────
  useEffect(() => {
    if (!isOpen) return;
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  // ── คืน object URL ของรูปตัวอย่างเมื่อเลิกใช้ ───────────────────────────
  useEffect(() => {
    if (!photoPreview) return;
    return () => URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  // ── Esc ปิด + กัก focus ไว้ในกล่อง (keyboard-only ต้องใช้งานได้ครบ) ─────
  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const nodes = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // กันหน้าเบื้องหลังเลื่อนตามขณะกล่องเปิด
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, busy, onClose]);

  // ── ค่าที่คำนวณเพื่อ "แสดงผลและเตือน" เท่านั้น ──────────────────────────
  const checkIn = proof.checkIn;

  const elapsedMinutes = useMemo(
    // ★ นับจาก server_ts ของการเช็คอิน ไม่ใช่เวลาที่เครื่องผู้ใช้จำได้
    () => (checkIn ? elapsedMinutesSince(checkIn.serverTs, now) : 0),
    [checkIn, now],
  );

  const fix = geo.status === 'ok' ? geo.fix : null;

  /** สัญญาณอ่อนเกินกว่าจะเชื่อระยะทาง — backend จะไม่ติดธงระยะทางเลยในกรณีนี้ */
  const gpsAccuracyLow = fix !== null && fix.accuracyM > GPS_ACCURACY_TRUST_M;

  const jobCoordsMissing =
    proof.jobCoordsMissing ||
    jobLat === null || jobLat === undefined ||
    jobLng === null || jobLng === undefined;

  const liveDistanceM = useMemo(() => {
    if (!fix || jobCoordsMissing) return null;
    return Math.round(haversineMeters(fix.lat, fix.lng, jobLat as number, jobLng as number));
  }, [fix, jobCoordsMissing, jobLat, jobLng]);

  const isShortDuration = elapsedMinutes < proof.bookedMinutes * MIN_DURATION_RATIO;

  // สัญญาณอ่อน = ไม่เตือนเรื่องระยะทาง เพราะ backend ก็จะไม่ติดธงเหมือนกัน
  const isFarAway =
    liveDistanceM !== null && !gpsAccuracyLow && liveDistanceM > VERDICT_RADIUS_M;

  /** คำเตือนก่อนกด — เป็นการ "บอกให้รู้" ไม่ใช่การห้าม ปุ่มยังกดได้เสมอ */
  const warnings = useMemo(() => {
    const list: string[] = [];
    if (isShortDuration) {
      list.push(
        'เวลาทำงานน้อยกว่าที่จองไว้ ระบบจะให้แอดมินตรวจสอบก่อนโอนเงิน ยืนยันจะปิดงานหรือไม่?',
      );
    }
    if (isFarAway) {
      list.push(
        `ตำแหน่งของคุณห่างจากจุดงาน ${formatDistanceTh(liveDistanceM)} (เกิน ${VERDICT_RADIUS_M} ม.) ระบบจะให้แอดมินตรวจสอบก่อนโอนเงิน ยืนยันจะปิดงานหรือไม่?`,
      );
    }
    return list;
  }, [isShortDuration, isFarAway, liveDistanceM]);

  // ── เลือกรูป ────────────────────────────────────────────────────────────
  const acceptFile = useCallback((file: File) => {
    const error = validateEvidenceFile(file);
    if (error) {
      setPhotoError(error);
      return;
    }
    // เปลี่ยนรูป = path เดิมใช้ไม่ได้แล้ว ต้องอัปโหลดใหม่
    uploadedPathRef.current = null;
    setPhotoError(null);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // reset ค่าเพื่อให้เลือกไฟล์เดิมซ้ำแล้วยัง onChange อยู่
    event.target.value = '';
    if (file) acceptFile(file);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  };

  const removePhoto = () => {
    uploadedPathRef.current = null;
    setPhoto(null);
    setPhotoPreview(null);
    setPhotoError(null);
  };

  // ── ปิดงานจริง ──────────────────────────────────────────────────────────
  const submit = async () => {
    setSubmitError(null);

    let photoPath = uploadedPathRef.current;

    if (photo && !photoPath) {
      setPhase('uploading');
      try {
        photoPath = await uploadJobEvidence(bookingId, photo, 'check-out');
        uploadedPathRef.current = photoPath;
      } catch (error) {
        // ★ ห้ามล้าง note ทิ้ง — ผู้ใช้พิมพ์มาแล้วต้องกดลองใหม่ได้เลย
        setPhase('form');
        setSubmitError(
          error instanceof EvidenceError
            ? error.message
            : 'อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่',
        );
        return;
      }
    }

    setPhase('saving');
    try {
      const result = await checkOutBooking({
        variables: {
          input: {
            bookingId,
            lat: fix?.lat ?? null,
            lng: fix?.lng ?? null,
            accuracyM: fix?.accuracyM ?? null,
            deviceTs: new Date().toISOString(),
            note: note.trim() ? note.trim() : null,
            photoUrl: photoPath ?? null,
          },
        },
      });

      const event = (result.data as { checkOutBooking: JobEvent } | null | undefined)
        ?.checkOutBooking;
      if (!event) throw new Error('empty response');

      onSuccess(event);
    } catch (error) {
      setPhase('form');
      const message =
        (error as { graphQLErrors?: { message?: string }[] })?.graphQLErrors?.[0]?.message;
      setSubmitError(message || 'ปิดงานไม่สำเร็จ กรุณาลองใหม่');
    }
  };

  const handlePrimaryPress = () => {
    // มีคำเตือน → ถามยืนยันหนึ่งครั้ง แต่ไม่เคยปิดกั้นการกด
    if (phase === 'form' && warnings.length > 0) {
      setPhase('confirming');
      return;
    }
    void submit();
  };

  if (!isOpen || !checkIn) return null;

  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B69A] focus-visible:ring-offset-2';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={(event) => {
        // คลิกพื้นหลัง (ไม่ใช่ลากข้อความออกมา) เพื่อปิด
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        tabIndex={-1}
        className="my-auto max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white shadow-2xl outline-none"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        {/* ── หัวกล่อง ── */}
        <div className="flex items-start justify-between gap-3 border-b border-[#F0F1F3] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F5ED]">
              <span className="material-icons text-[20px] text-[#2E9E7B]">logout</span>
            </span>
            <div>
              <h2 id="checkout-title" className="text-[17px] font-bold leading-6 text-[#1A1A1A]">
                เช็คเอาท์ / จบงาน
              </h2>
              <p className="mt-0.5 text-[12px] leading-4 text-[#8A8C8E]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {bookingRef}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="ปิดหน้าต่าง"
            // ≥ 44px บนจอมือถือ ย่อลงได้เมื่อใช้เมาส์
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#8A8C8E] transition-colors hover:bg-[#F3F4F6] hover:text-[#1A1A1A] disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:w-9 ${focusRing}`}
          >
            <span className="material-icons text-[20px]">close</span>
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">
          {/* ── สถานะสัญญาณตำแหน่ง ── */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-[#575859]">ตำแหน่งปัจจุบัน</span>
            <GpsChip geo={geo} gpsAccuracyLow={gpsAccuracyLow} onRetry={askForPosition} disabled={busy} />
          </div>

          {geo.status === 'failed' && (
            <p className="mb-3 rounded-lg bg-[#F9FAFB] px-3 py-2 text-[12px] leading-5 text-[#6B7280]">
              {GEO_FAILURE_TH[geo.reason]}
            </p>
          )}

          {gpsAccuracyLow && (
            <p className="mb-3 rounded-lg bg-[#FFFBEB] px-3 py-2 text-[12px] leading-5 text-[#92400E]">
              สัญญาณตำแหน่งของเบราว์เซอร์คลาดเคลื่อนสูง (±{formatDistanceTh(fix?.accuracyM)}) ระบบจะไม่นำระยะทางนี้ไปตัดสิน
            </p>
          )}

          {/* ── STEP 3.1 สรุปก่อนยืนยัน ── */}
          <dl className="rounded-xl border border-[#E9EBEE] bg-[#FAFBFC] px-4 py-3">
            <SummaryRow label="เช็คอิน" value={formatThaiTime(checkIn.serverTs)} />
            <SummaryRow label="ตอนนี้" value={formatThaiTime(now)} />
            <SummaryRow label="รวมเวลาทำงาน" value={formatDurationTh(elapsedMinutes)} strong />
            {jobCoordsMissing ? (
              <SummaryRow label="ระยะจากจุดงาน" value="งานนี้ไม่มีพิกัดจุดงาน" muted />
            ) : (
              <SummaryRow
                label="ระยะจากจุดงาน"
                value={liveDistanceM === null ? 'ไม่ได้ใช้ตำแหน่ง' : formatDistanceTh(liveDistanceM)}
                muted={liveDistanceM === null}
              />
            )}
          </dl>

          {/* ── คำเตือน (แจ้งให้ทราบ ไม่ได้ห้าม) ── */}
          {warnings.length > 0 && phase !== 'confirming' && (
            <ul className="mt-3 space-y-2">
              {isShortDuration && (
                <WarningRow>
                  เวลาทำงาน {formatDurationTh(elapsedMinutes)} น้อยกว่าที่จองไว้ (
                  {formatDurationTh(proof.bookedMinutes)}) — ระบบจะให้แอดมินตรวจสอบก่อนโอนเงิน
                </WarningRow>
              )}
              {isFarAway && (
                <WarningRow>
                  ตำแหน่งของคุณห่างจากจุดงาน {formatDistanceTh(liveDistanceM)} — ระบบจะให้แอดมินตรวจสอบก่อนโอนเงิน
                </WarningRow>
              )}
            </ul>
          )}

          {/* ── STEP 2.2 บันทึกปิดงาน ── */}
          <div className="mt-5">
            <label htmlFor="checkout-note" className="text-[13px] font-semibold text-[#1A1A1A]">
              บันทึกปิดงาน <span className="font-normal text-[#8A8C8E]">(ไม่บังคับ)</span>
            </label>
            <textarea
              id="checkout-note"
              value={note}
              maxLength={NOTE_MAX_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              disabled={busy}
              rows={3}
              placeholder="สรุปงานที่ทำ เช่น อาบน้ำ ป้อนอาหาร วัดความดัน"
              className={`mt-2 w-full resize-y rounded-xl border border-[#E0E2E5] px-3.5 py-2.5 text-[14px] leading-6 text-[#1A1A1A] placeholder:text-[#B0B3B8] disabled:bg-[#F9FAFB] ${focusRing}`}
            />
            <p
              className="mt-1 text-right text-[12px] text-[#8A8C8E]"
              style={{ fontFamily: "'Inter', sans-serif" }}
              aria-live="polite"
            >
              {note.length}/{NOTE_MAX_LENGTH}
            </p>
          </div>

          {/* ── STEP 2.3 รูปประกอบ ── */}
          <div className="mt-3">
            <span className="text-[13px] font-semibold text-[#1A1A1A]">
              รูปภาพประกอบ <span className="font-normal text-[#8A8C8E]">(ไม่บังคับ · 1 รูป)</span>
            </span>

            {photoPreview ? (
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#E0E2E5] p-3">
                <img
                  src={photoPreview}
                  alt="ตัวอย่างรูปหลักฐาน"
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[#1A1A1A]">{photo?.name}</p>
                  <p className="text-[12px] text-[#8A8C8E]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {photo ? `${(photo.size / 1024 / 1024).toFixed(1)} MB` : ''} · ระบบจะย่อขนาดให้อัตโนมัติ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={removePhoto}
                  disabled={busy}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#8A8C8E] transition-colors hover:bg-[#FEF2F2] hover:text-[#DC2626] disabled:opacity-50 sm:h-9 sm:w-9 ${focusRing}`}
                  aria-label="ลบรูปที่เลือก"
                >
                  <span className="material-icons text-[20px]">delete_outline</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!busy) setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                disabled={busy}
                className={`mt-2 flex w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 transition-colors disabled:opacity-60 ${
                  dragActive
                    ? 'border-[#52B69A] bg-[#F0FBF6]'
                    : 'border-[#DDE1E5] bg-[#FAFBFC] hover:border-[#52B69A] hover:bg-[#F6FAF9]'
                } ${focusRing}`}
              >
                <span className="material-icons text-[24px] text-[#8A8C8E]">add_a_photo</span>
                <span className="text-[13px] font-medium text-[#575859]">เลือกรูป หรือลากมาวาง</span>
                <span className="text-[12px] text-[#B0B3B8]" style={{ fontFamily: "'Inter', sans-serif" }}>
                  JPG/PNG ไม่เกิน 5 MB
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EVIDENCE_TYPES.join(',')}
              onChange={handleFileChange}
              className="hidden"
              tabIndex={-1}
            />

            {photoError && (
              <p className="mt-1.5 text-[12px] font-medium text-[#DC2626]">{photoError}</p>
            )}
          </div>

          {/* ── ยืนยันอีกครั้งเมื่อมีคำเตือน (STEP 3.2 / 3.3) ── */}
          {phase === 'confirming' && (
            <div className="mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
              <div className="flex items-start gap-2">
                <span className="material-icons mt-0.5 shrink-0 text-[18px] text-[#D97706]">warning_amber</span>
                <div className="space-y-2">
                  {warnings.map((text) => (
                    <p key={text} className="text-[13px] font-semibold leading-5 text-[#92400E]">
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3"
            >
              <span className="material-icons mt-0.5 shrink-0 text-[18px] text-[#DC2626]">error_outline</span>
              <p className="text-[13px] font-medium leading-5 text-[#991B1B]">
                {submitError} — บันทึกที่พิมพ์ไว้ยังอยู่ครบ
              </p>
            </div>
          )}
        </div>

        {/* ── ปุ่ม ── */}
        <div className="flex flex-col-reverse gap-2.5 border-t border-[#F0F1F3] px-5 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => (phase === 'confirming' ? setPhase('form') : onClose())}
            disabled={busy}
            className={`h-12 rounded-xl border border-[#E0E2E5] px-6 text-[14px] font-semibold text-[#575859] transition-colors hover:bg-[#F9FAFB] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto ${focusRing}`}
          >
            {phase === 'confirming' ? 'กลับไปแก้ไข' : 'ยกเลิก'}
          </button>
          <button
            type="button"
            onClick={handlePrimaryPress}
            // ★ ห้าม disable เพราะ GPS หรือเวลาทำงานสั้น — disable ได้เฉพาะตอนกำลังส่งจริง
            disabled={busy}
            className={`flex h-12 items-center justify-center gap-2 rounded-xl bg-[#52B69A] px-6 text-[14px] font-bold text-white shadow-[0_4px_14px_rgba(82,182,154,0.3)] transition-colors hover:bg-[#3F9E85] disabled:cursor-not-allowed disabled:opacity-70 sm:h-10 sm:w-auto ${focusRing}`}
          >
            {phase === 'uploading' && 'กำลังอัปโหลดรูป...'}
            {phase === 'saving' && 'กำลังปิดงาน...'}
            {phase === 'form' && (
              <>
                <span className="material-icons text-[18px]">check</span>
                ยืนยันจบงาน
              </>
            )}
            {phase === 'confirming' && 'ยืนยัน ปิดงานเลย'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// ชิ้นส่วนย่อย
// ──────────────────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
  strong = false,
  muted = false,
}: Readonly<{ label: string; value: string; strong?: boolean; muted?: boolean }>) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-[13px] text-[#8A8C8E]">{label}</dt>
      <dd
        className={`text-right text-[13px] ${strong ? 'font-bold text-[#1A1A1A]' : 'font-semibold'} ${
          muted ? 'text-[#8A8C8E]' : 'text-[#1A1A1A]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function WarningRow({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <li className="flex items-start gap-2 rounded-lg bg-[#FFFBEB] px-3 py-2">
      <span className="material-icons mt-0.5 shrink-0 text-[16px] text-[#D97706]">warning_amber</span>
      <span className="text-[12px] font-medium leading-5 text-[#92400E]">{children}</span>
    </li>
  );
}

function GpsChip({
  geo,
  gpsAccuracyLow,
  onRetry,
  disabled,
}: Readonly<{
  geo: GeoState;
  gpsAccuracyLow: boolean;
  onRetry: () => void;
  disabled: boolean;
}>) {
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52B69A] focus-visible:ring-offset-2';

  if (geo.status === 'requesting') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3F4F6] px-3 py-1 text-[12px] font-semibold text-[#6B7280]">
        <span className="material-icons animate-spin text-[14px]">progress_activity</span>
        กำลังหาตำแหน่ง...
      </span>
    );
  }

  if (geo.status === 'ok' && !gpsAccuracyLow) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F5ED] px-3 py-1 text-[12px] font-semibold text-[#2E7D5B]">
        <span className="material-icons text-[14px]">my_location</span>
        ตำแหน่งแม่นยำ
      </span>
    );
  }

  const isWeak = geo.status === 'ok' && gpsAccuracyLow;

  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${
          isWeak ? 'bg-[#FFFBEB] text-[#B45309]' : 'bg-[#F3F4F6] text-[#6B7280]'
        }`}
      >
        <span className="material-icons text-[14px]">{isWeak ? 'location_searching' : 'location_off'}</span>
        {isWeak ? 'สัญญาณตำแหน่งอ่อน' : 'ไม่ได้ใช้ตำแหน่ง'}
      </span>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className={`inline-flex h-11 items-center rounded-lg px-3 text-[12px] font-semibold text-[#52B69A] underline-offset-2 transition-colors hover:bg-[#F0FBF6] hover:underline disabled:opacity-50 sm:h-8 sm:px-2 ${focusRing}`}
      >
        ลองใหม่
      </button>
    </span>
  );
}
