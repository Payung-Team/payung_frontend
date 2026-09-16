import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../../components/ui/Icon';
import QrTokenFallback, { ScanResultBox } from '../QrTokenFallback';
import { useJobQrScan, type JobScanResult } from '../useJobQrScan';

const FONT = { fontFamily: "'Bai Jamjuree', sans-serif" } as const;

/** เริ่มงานหรือปิดงาน — เปลี่ยนแค่ข้อความ ตัวสแกนและ mutation เหมือนกันทุกกรณี
 *  (backend ดูจากสถานะ session เองว่าโทเค็นนี้ควรเป็น CHECK_IN หรือ CHECK_OUT) */
export type ScanPurpose = 'check_in' | 'check_out';

const PURPOSE_COPY: Record<ScanPurpose, { title: string; subtitle: string; aim: string }> = {
  check_in: {
    title: 'สแกนเริ่มงาน',
    subtitle: 'สแกน QR ของผู้รับบริการเพื่อเช็คอิน',
    aim: 'ให้ผู้รับบริการเปิดหน้า QR ของการจอง แล้วเล็งกล้องให้ QR อยู่ในกรอบเพื่อเริ่มงาน',
  },
  check_out: {
    title: 'สแกนจบงาน',
    subtitle: 'สแกน QR ของผู้รับบริการเพื่อปิดงาน',
    aim: 'ให้ผู้รับบริการเปิดหน้า QR ของการจอง แล้วเล็งกล้องให้ QR อยู่ในกรอบเพื่อปิดงาน',
  },
};

export interface JobScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** งานที่กำลังเปิดอยู่ — ใช้เทียบว่าโทเค็นที่สแกนได้เป็นของงานใบนี้จริงไหม */
  bookingId: string;
  /** เรียกเมื่อการสแกนทำให้งานขยับจริง (ok = true) */
  onScanned: (result: JobScanResult) => void;
  purpose: ScanPurpose;
}

type Mode = 'camera' | 'token';

/** สาเหตุที่เปิดกล้องไม่ได้ — แยกข้อความเพื่อให้ผู้ดูแลรู้ว่าต้องแก้ที่ตัวเองหรือที่เครื่อง */
function cameraErrorCopy(error: unknown): string {
  const name = (error as { name?: string })?.name;
  if (name === 'NotAllowedError') return 'เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้กล้อง — กดอนุญาตที่แถบที่อยู่แล้วลองใหม่';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'ไม่พบกล้องบนอุปกรณ์นี้';
  if (name === 'NotReadableError') return 'กล้องถูกแอปอื่นใช้อยู่ ปิดแอปนั้นแล้วลองใหม่';
  if (!window.isSecureContext) return 'เบราว์เซอร์เปิดกล้องได้เฉพาะเมื่อเข้าผ่าน https หรือ localhost เท่านั้น';
  return 'เปิดกล้องไม่สำเร็จ กรุณาลองใหม่';
}

/**
 * โมดัลสแกน QR — ใช้ทั้งเริ่มงานและปิดงาน เปิดจากปุ่มบนแถบล่างที่ติดหน้าจอ
 *
 * โหมดหลักคือกล้อง (ของจริงตาม PYG-438) ส่วน "โหมดทดสอบ" ยังเก็บช่องป้อนโทเค็น/
 * อัปโหลดรูปไว้ เพราะกล้องใช้ได้เฉพาะบน https/localhost และยังต้องเทสบนเครื่องที่ไม่มีกล้อง
 * ทั้งสองโหมดยิง mutation scanJobQr ตัวเดียวกันผ่าน useJobQrScan
 */
export default function JobScanModal({ isOpen, onClose, bookingId, onScanned, purpose }: Readonly<JobScanModalProps>) {
  const copy = PURPOSE_COPY[purpose];
  const [mode, setMode] = useState<Mode>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  /** เพิ่มค่าเพื่อสั่งเปิดกล้อง/เริ่มลูปอ่านภาพใหม่หลังสแกนไม่ผ่าน */
  const [attempt, setAttempt] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const scan = useJobQrScan(bookingId, onScanned);

  // ฟังก์ชันจาก hook เปลี่ยน identity ทุก render — เก็บไว้ใน ref เพื่อไม่ให้ลูปกล้อง
  // ถูกรื้อสร้างใหม่ตามไปด้วย และเพื่อใช้ใน effect ได้โดยไม่ต้องใส่ hook ทั้งตัวเป็น dependency
  const runScanRef = useRef(scan.runScan);
  runScanRef.current = scan.runScan;
  const setFeedbackRef = useRef(scan.setState);
  setFeedbackRef.current = scan.setState;

  // รีเซ็ตกลับสู่สถานะเริ่มต้นทุกครั้งที่เปิดโมดัล ไม่ให้ผลของครั้งก่อนค้าง
  // ไม่ต้องขยับ attempt ที่นี่ — effect กล้องมี isOpen เป็น dependency อยู่แล้ว
  // ถ้าขยับจะทำให้เปิดกล้องซ้ำสองรอบทุกครั้งที่เปิดโมดัล
  useEffect(() => {
    if (!isOpen) return;
    setMode('camera');
    setCameraError(null);
    setFeedbackRef.current(null);
  }, [isOpen]);

  // ปิดด้วย Esc — คาดหวังได้กับ dialog ทุกตัว
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // ── กล้อง + ลูปอ่าน QR ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || mode !== 'camera') return undefined;

    // เก็บ element ไว้ในตัวแปรตั้งแต่ตอนนี้ — cleanup ต้องปิด srcObject ของ element ใบเดิม
    // ไม่ใช่ใบที่ ref ชี้อยู่ตอน unmount (ซึ่งอาจเป็น null ไปแล้ว)
    const video = videoRef.current;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let stopped = false;

    async function start() {
      setCameraReady(false);
      setCameraError(null);

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // facingMode: environment = กล้องหลัง ซึ่งเป็นตัวที่ใช้ส่องจอของผู้รับบริการ
          video: { facingMode: 'environment' },
          audio: false,
        });
      } catch (error) {
        if (!stopped) setCameraError(cameraErrorCopy(error));
        return;
      }

      if (stopped || !video) return;
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        if (!stopped) setCameraError('เล่นภาพจากกล้องไม่ได้ กรุณาลองใหม่');
        return;
      }
      if (stopped) return;
      setCameraReady(true);

      // โหลด jsQR ตอนใช้จริงเท่านั้น — ตัวถอดรหัสหนักราว 130 KB
      const { default: jsQR } = await import('jsqr');

      const tick = () => {
        if (stopped || !video) return;
        const canvas = canvasRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA && canvas && video.videoWidth > 0) {
          const width = video.videoWidth;
          const height = video.videoHeight;
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const image = ctx.getImageData(0, 0, width, height);
            // dontInvert: ภาพสดจากกล้องเป็นสีปกติเสมอ การลองกลับสีทุกเฟรมทำให้ช้าโดยไม่ได้อะไร
            const decoded = jsQR(image.data, width, height, { inversionAttempts: 'dontInvert' });
            if (decoded?.data) {
              // หยุดลูปทันทีที่อ่านได้ ไม่งั้นเฟรมถัดไปจะยิง mutation ซ้ำ
              stopped = true;
              // ★ ส่งค่าที่ถอดได้ดิบ ๆ ไม่ trim — backend hash ทั้งสตริงแล้วเทียบกับดีบี
              void runScanRef.current(decoded.data);
              return;
            }
          }
        }
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    }

    void start();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      // ต้องปิดทุก track เสมอ ไม่งั้นไฟกล้องค้างติดหลังปิดโมดัล
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [isOpen, mode, attempt]);

  if (!isOpen) return null;

  const succeeded = scan.state?.tone === 'success';

  function retry() {
    scan.setState(null);
    setAttempt((value) => value + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={copy.subtitle}
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-w-[460px] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ── หัวโมดัล ── */}
        <div className="flex items-center justify-between gap-3 border-b border-[#F0F1F3] px-5 py-4">
          <div>
            <p className="text-[17px] font-bold text-[#1A1A1A]" style={FONT}>
              {copy.title}
            </p>
            <p className="mt-0.5 text-xs text-[#8A8C8E]" style={FONT}>
              {copy.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#575859] transition hover:bg-[#F0F1F3] focus:outline-none focus:ring-2 focus:ring-[#52B69A]"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="p-5">
          {mode === 'camera' ? (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-[#101413]" style={{ aspectRatio: '1 / 1' }}>
                {/* playsInline: iOS Safari จะเปิดวิดีโอเต็มจอทับโมดัลถ้าไม่ใส่ */}
                <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />

                {/* กรอบเล็งให้รู้ว่าต้องวาง QR ตรงไหน */}
                {cameraReady && !scan.state && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="h-[62%] w-[62%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>
                )}

                {!cameraReady && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80">
                    <Icon name="photo_camera" size="large" color="#FFFFFF" />
                    <p className="text-xs" style={FONT}>
                      กำลังเปิดกล้อง...
                    </p>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
                    <Icon name="videocam_off" size="large" color="#FCA5A5" />
                    <p className="text-xs leading-relaxed text-white/85" style={FONT}>
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={retry}
                      className="mt-1 cursor-pointer rounded-lg bg-white/15 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/25"
                      style={FONT}
                    >
                      ลองเปิดกล้องอีกครั้ง
                    </button>
                  </div>
                )}

                {scan.busy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/55">
                    <p className="text-sm font-bold text-white" style={FONT}>
                      กำลังส่งผลการสแกน...
                    </p>
                  </div>
                )}
              </div>

              {!scan.state && !cameraError && (
                <p className="mt-3 text-center text-xs text-[#8A8C8E]" style={FONT}>
                  {copy.aim}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-[#E0E2E5] bg-[#F7F8F9] p-3">
                <Icon name="science" size="small" color="#575859" />
                <p className="text-[11px] leading-relaxed text-[#575859]" style={FONT}>
                  โหมดทดสอบ — ให้ผู้รับบริการกด "คัดลอกโทเค็น" จากหน้าการจองของเขาแล้วส่งมาให้คุณ
                  หรืออัปโหลดรูป QR แทนการส่องกล้อง
                </p>
              </div>
              <QrTokenFallback scan={scan} />
            </>
          )}

          {scan.state && (
            <div className="mt-4">
              <ScanResultBox scan={scan} />
              {!succeeded && mode === 'camera' && (
                <button
                  type="button"
                  onClick={retry}
                  className="mt-3 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#52B69A] text-sm font-bold text-white transition hover:bg-[#489e86]"
                  style={FONT}
                >
                  <Icon name="refresh" size="small" color="#FFFFFF" />
                  สแกนใหม่อีกครั้ง
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── สลับโหมด ── */}
        {!succeeded && (
          <div className="border-t border-[#F0F1F3] px-5 py-3.5">
            <button
              type="button"
              onClick={() => {
                scan.setState(null);
                setMode(mode === 'camera' ? 'token' : 'camera');
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 text-xs font-bold text-[#575859] transition hover:text-[#3A9A7E]"
              style={FONT}
            >
              <Icon name={mode === 'camera' ? 'science' : 'photo_camera'} size="small" color="currentColor" />
              {mode === 'camera' ? 'ใช้โหมดทดสอบ (ใส่โทเค็นแทน)' : 'กลับไปสแกนด้วยกล้อง'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
