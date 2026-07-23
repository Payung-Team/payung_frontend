import { useEffect } from 'react';
import Icon from '../../ui/Icon';
import { cn } from '../../../lib/utils';
import { FILED_BY_META } from './disputeMeta';
import type { EvidenceFile } from './disputeDetailMock';

interface EvidenceLightboxProps {
  files: EvidenceFile[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

// PYG-321 — lightbox ไฟล์แนบ (mock: ยังไม่มีไฟล์จริง จึงแสดง placeholder ตามชนิดไฟล์)
export default function EvidenceLightbox({ files, index, onIndexChange, onClose }: EvidenceLightboxProps) {
  const file = files[index];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + files.length) % files.length);
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % files.length);
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, files.length, onIndexChange, onClose]);

  if (!file) {
    return null;
  }

  const isPdf = file.kind === 'pdf';

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={file.name}
    >
      <div className="relative w-full max-w-[720px]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{file.name}</p>
            <p className="text-xs text-white/60">
              จาก{FILED_BY_META[file.uploadedBy].label} · {index + 1}/{files.length}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#111827] text-white/70">
          <Icon name={isPdf ? 'picture_as_pdf' : 'image'} style={{ fontSize: 56 }} />
          <span
            className={cn(
              'rounded px-2 py-1 text-xs font-bold',
              isPdf ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#047857]',
            )}
          >
            {isPdf ? 'PDF' : 'รูปภาพ'}
          </span>
          <p className="text-xs text-white/50">ตัวอย่างไฟล์จริงจะแสดงเมื่อเชื่อมต่อ backend</p>
        </div>

        {files.length > 1 && (
          <div className="mt-3 flex items-center justify-center gap-3">
            <LightboxNav
              icon="chevron_left"
              label="ไฟล์ก่อนหน้า"
              onClick={() => onIndexChange((index - 1 + files.length) % files.length)}
            />
            <LightboxNav
              icon="chevron_right"
              label="ไฟล์ถัดไป"
              onClick={() => onIndexChange((index + 1) % files.length)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function LightboxNav({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
    >
      <Icon name={icon} />
    </button>
  );
}
