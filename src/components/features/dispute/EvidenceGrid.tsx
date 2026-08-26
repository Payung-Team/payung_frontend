import { useState } from 'react';
import DisputeCard from './DisputeCard';
import FiledByBadge from './FiledByBadge';
import EvidenceLightbox from './EvidenceLightbox';
import { cn } from '../../../lib/utils';
import type { DisputeFiledBy } from './disputeMeta';
import type { EvidenceFile } from './disputeDetailMapper';

interface EvidenceGridProps {
  files: EvidenceFile[];
}

const SECTIONS: { role: DisputeFiledBy; title: string }[] = [
  { role: 'customer', title: 'จากลูกค้า' },
  { role: 'caregiver', title: 'จากผู้ดูแล' },
];

// PYG-321 — evidence viewer แยกฝ่าย (ลูกค้า / ผู้ดูแล) + lightbox
export default function EvidenceGrid({ files }: EvidenceGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <DisputeCard title="ไฟล์แนบ (แยกตามผู้ส่ง)">
      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => {
          const sectionFiles = files.filter((file) => file.uploadedBy === section.role);

          return (
            <div key={section.role}>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#575859]">{section.title}</h3>
                <FiledByBadge filedBy={section.role} />
                <span className="font-[Inter] text-[11px] text-[#C6C8CB]">{sectionFiles.length}</span>
              </div>

              {sectionFiles.length === 0 ? (
                <p className="mt-3 text-sm text-[#8A8C8E]">ยังไม่มีไฟล์แนบจากฝ่ายนี้</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {sectionFiles.map((file) => (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setOpenIndex(files.indexOf(file))}
                      className="group cursor-pointer text-left"
                    >
                      <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] transition-colors group-hover:border-[#059669]">
                        <span
                          className={cn(
                            'rounded px-2 py-1 text-xs font-bold',
                            file.kind === 'pdf' ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#047857]',
                          )}
                        >
                          {file.kind === 'pdf' ? 'PDF' : 'รูปภาพ'}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-[11px] text-[#8A8C8E]">{file.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {openIndex !== null && (
        <EvidenceLightbox
          files={files}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </DisputeCard>
  );
}
