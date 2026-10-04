import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../ui/Icon';
import Spinner from '../ui/Spinner';
import {
  cropToSquareJpeg,
  decodeToCanvas,
  PhotoCropError,
  type SquareCropRect,
} from '../../lib/profilePhotoCrop';

/** ขนาดกรอบ crop บนจอ (px) — สี่เหลี่ยมจัตุรัส พอดีมือถือจอเล็กสุดที่รองรับ */
const VIEWPORT_SIZE = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.01;

interface Offset {
  x: number;
  y: number;
}

interface PhotoCropModalProps {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

const PHOTO_TIPS = [
  'หน้าตรง เห็นใบหน้าชัดเจน',
  'ไม่ใส่แว่นกันแดดหรือหน้ากากปิดบังใบหน้า',
  'ไม่ใช่รูปการ์ตูนหรือภาพวาด',
];

export default function PhotoCropModal({ file, onCancel, onConfirm }: PhotoCropModalProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'exporting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: Offset } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const canvas = await decodeToCanvas(file);
        if (cancelled) return;
        canvasRef.current = canvas;
        setNaturalSize({ width: canvas.width, height: canvas.height });
        const baseScale = VIEWPORT_SIZE / Math.min(canvas.width, canvas.height);
        setOffset({
          x: (VIEWPORT_SIZE - canvas.width * baseScale) / 2,
          y: (VIEWPORT_SIZE - canvas.height * baseScale) / 2,
        });
        setZoom(1);
        setImageUrl(canvas.toDataURL('image/jpeg', 0.92));
        setStatus('ready');
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(err instanceof PhotoCropError ? err.message : 'เปิดไฟล์รูปนี้ไม่ได้ กรุณาเลือกรูปอื่น');
        setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]);

  const baseScale = naturalSize.width
    ? VIEWPORT_SIZE / Math.min(naturalSize.width, naturalSize.height)
    : 0;
  const effectiveScale = baseScale * zoom;
  const displayedWidth = naturalSize.width * effectiveScale;
  const displayedHeight = naturalSize.height * effectiveScale;

  const clampOffset = useCallback(
    (next: Offset, scale: number): Offset => {
      const displayedW = naturalSize.width * scale;
      const displayedH = naturalSize.height * scale;
      const minX = Math.min(0, VIEWPORT_SIZE - displayedW);
      const minY = Math.min(0, VIEWPORT_SIZE - displayedH);
      return {
        x: Math.min(0, Math.max(minX, next.x)),
        y: Math.min(0, Math.max(minY, next.y)),
      };
    },
    [naturalSize],
  );

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = Number(e.target.value);
    const oldScale = effectiveScale;
    const newScale = baseScale * newZoom;
    setOffset((prev) => {
      if (!oldScale) return prev;
      const centerXSrc = (VIEWPORT_SIZE / 2 - prev.x) / oldScale;
      const centerYSrc = (VIEWPORT_SIZE / 2 - prev.y) / oldScale;
      const next = {
        x: VIEWPORT_SIZE / 2 - centerXSrc * newScale,
        y: VIEWPORT_SIZE / 2 - centerYSrc * newScale,
      };
      return clampOffset(next, newScale);
    });
    setZoom(newZoom);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (status !== 'ready') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = {
      x: dragRef.current.startOffset.x + dx,
      y: dragRef.current.startOffset.y + dy,
    };
    setOffset(clampOffset(next, effectiveScale));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas || status !== 'ready' || !effectiveScale) return;
    setStatus('exporting');
    try {
      const sourceSize = VIEWPORT_SIZE / effectiveScale;
      const rect: SquareCropRect = {
        x: Math.max(0, Math.min(canvas.width - sourceSize, (0 - offset.x) / effectiveScale)),
        y: Math.max(0, Math.min(canvas.height - sourceSize, (0 - offset.y) / effectiveScale)),
        size: sourceSize,
      };
      const blob = await cropToSquareJpeg(canvas, rect);
      onConfirm(blob);
    } catch (err) {
      setErrorMessage(err instanceof PhotoCropError ? err.message : 'ครอปรูปไม่สำเร็จ กรุณาลองใหม่');
      setStatus('ready');
    }
  };

  const imageStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'absolute',
      left: 0,
      top: 0,
      width: `${displayedWidth}px`,
      height: `${displayedHeight}px`,
      transform: `translate(${offset.x}px, ${offset.y}px)`,
      maxWidth: 'none',
      pointerEvents: 'none',
      userSelect: 'none',
    }),
    [displayedWidth, displayedHeight, offset],
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-6 overflow-y-auto backdrop-blur-sm">
      <div
        className="w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-2xl"
        style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#0A0A0A]">ครอปรูปโปรไฟล์</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 cursor-pointer"
            aria-label="ปิด"
          >
            <Icon name="close" />
          </button>
        </div>

        {/* คำแนะนำก่อนถ่าย */}
        <ul className="mb-4 space-y-1 rounded-lg bg-[#F3F3F5] p-3 text-[12px] text-[#575859]">
          {PHOTO_TIPS.map((tip) => (
            <li key={tip} className="flex items-start gap-1.5">
              <Icon name="check_circle" size="small" color="#52B69A" className="mt-[1px] shrink-0" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>

        {status === 'loading' && (
          <div className="flex items-center justify-center" style={{ height: VIEWPORT_SIZE }}>
            <Spinner />
          </div>
        )}

        {status === 'error' && (
          <div
            className="flex flex-col items-center justify-center gap-2 rounded-lg bg-red-50 border border-red-200 text-center px-4"
            style={{ height: VIEWPORT_SIZE }}
          >
            <Icon name="error" color="#DC3545" />
            <p className="text-[13px] text-red-600">{errorMessage}</p>
          </div>
        )}

        {(status === 'ready' || status === 'exporting') && (
          <>
            <div className="flex justify-center">
              <div
                className="relative overflow-hidden rounded-xl bg-black touch-none"
                style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, cursor: 'grab' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {imageUrl && <img src={imageUrl} alt="รูปที่เลือก" style={imageStyle} draggable={false} />}
                {/* กรอบวงกลมช่วยจัดตำแหน่งใบหน้า — ผลลัพธ์จริงยังคงเป็นสี่เหลี่ยมจัตุรัสเต็มกรอบ */}
                <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/40">
                  <div className="absolute inset-[8%] rounded-full border-2 border-dashed border-white/70" />
                </div>
              </div>
            </div>

            {/* Zoom slider */}
            <div className="mt-4 flex items-center gap-3">
              <Icon name="photo_size_select_small" size="small" color="#717182" />
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                value={zoom}
                onChange={handleZoomChange}
                disabled={status === 'exporting'}
                className="flex-1 accent-[#52B69A] cursor-pointer disabled:cursor-not-allowed"
                aria-label="ซูมรูป"
              />
              <Icon name="zoom_in" size="small" color="#717182" />
            </div>

            {errorMessage && (
              <p className="mt-2 text-[12px] text-red-500 text-center">{errorMessage}</p>
            )}
          </>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={status === 'exporting'}
            className="flex-1 px-4 py-2 text-sm border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={status !== 'ready'}
            className="flex-1 px-4 py-2 text-sm bg-[#52B69A] text-white rounded-lg font-semibold hover:bg-[#3d9178] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'exporting' ? 'กำลังครอป...' : 'ใช้รูปนี้'}
          </button>
        </div>
      </div>
    </div>
  );
}
