import { useState } from 'react';
import Icon from './Icon';
import ImageModal from './ImageModal';

export interface KycDocument {
  id: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  signedUrl?: string | null;
  uploadedAt: string;
}

interface KycDocumentsPreviewProps {
  documents: KycDocument[];
  docTypeLabel?: Record<string, string>;
  className?: string;
  variant?: 'card' | 'plain';
  layout?: 'stacked' | 'split';
}

const DEFAULT_DOC_TYPE_LABELS: Record<string, string> = {
  id_card: 'บัตรประชาชน',
  id_card_front: 'บัตรประชาชน (ด้านหน้า)',
  id_card_selfie: 'รูปถ่ายคู่บัตรประชาชน',
  certificate: 'ใบรับรองการอบรม',
  photo: 'รูปถ่ายหน้าตรง',
  license: 'ใบอนุญาตประกอบวิชาชีพ',
};

const isPdf = (doc?: KycDocument | null) => {
  return doc?.mimeType === 'application/pdf' || doc?.fileName.toLowerCase().endsWith('.pdf');
};

const isImage = (doc?: KycDocument | null) => {
  return Boolean(doc?.mimeType?.startsWith('image/'));
};

const getDocumentUrl = (doc?: KycDocument | null) => {
  return doc?.signedUrl || doc?.fileUrl || '';
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

export default function KycDocumentsPreview({
  documents,
  docTypeLabel = DEFAULT_DOC_TYPE_LABELS,
  className = '',
  variant = 'card',
  layout = 'stacked',
}: KycDocumentsPreviewProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const selectedDoc = documents.find((doc) => doc.id === selectedDocId) ?? documents[0] ?? null;
  const documentUrl = getDocumentUrl(selectedDoc);

  const wrapperClass = variant === 'card'
    ? `rounded-xl border border-[#E5E7EB] bg-white px-6 py-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] ${className}`
    : className;

  const getButtonClass = (docId: string) => {
    const isActive = selectedDoc?.id === docId;
    if (layout === 'split') {
      return `shrink-0 rounded-full border px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
        isActive
          ? 'bg-[#059669] border-[#059669] text-white hover:bg-[#047857]'
          : 'border-[#059669] text-[#059669] hover:bg-[#ECFDF5]'
      }`;
    }
    return 'shrink-0 rounded-full border border-[#059669] px-3.5 py-1 text-xs font-semibold text-[#059669] hover:bg-[#ECFDF5] transition-colors cursor-pointer';
  };

  const renderPreview = (heightClass: string) => (
    <div className={`relative flex ${heightClass} items-center justify-center overflow-hidden rounded-xl bg-[#959698]`}>
      {selectedDoc && documentUrl ? (
        isPdf(selectedDoc) ? (
          <iframe title={selectedDoc.fileName} src={documentUrl} className={`${heightClass} w-full rounded-xl bg-white`} />
        ) : isImage(selectedDoc) ? (
          <>
            <img src={documentUrl} alt={selectedDoc.fileName} className={`${heightClass} w-full object-cover`} />
            <button
              type="button"
              onClick={() => setIsImageModalOpen(true)}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-lg bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
            >
              <Icon name="open_in_full" />
            </button>
          </>
        ) : (
          <a href={documentUrl} target="_blank" rel="noreferrer" className="text-base font-semibold text-[#F5FFFC] underline cursor-pointer">
            เปิดเอกสาร
          </a>
        )
      ) : (
        <span className="text-base font-semibold text-[#F5FFFC]">ตัวอย่างเอกสาร</span>
      )}
    </div>
  );

  const renderList = () => (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F9FAFB] p-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-lg bg-[#EFF6FF]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-5 text-[#1F2937]">
                {docTypeLabel[doc.docType] ?? doc.docType}
              </p>
              <p className="truncate text-xs leading-4 text-[#9CA3AF]">
                {isPdf(doc) ? 'PDF' : doc.mimeType.split('/')[1]?.toUpperCase() || 'IMAGE'} · {formatFileSize(doc.fileSize)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDocId(doc.id)}
            className={getButtonClass(doc.id)}
          >
            ดูเอกสาร
          </button>
        </div>
      ))}
      {documents.length === 0 ? <p className="rounded-lg bg-[#F9FAFB] px-4 py-6 text-center text-sm text-gray-500">ยังไม่มีเอกสารที่อัปโหลด</p> : null}
    </div>
  );

  return (
    <aside className={wrapperClass}>
      {layout === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Preview */}
          <div>
            {renderPreview('h-[380px] min-h-[380px]')}
          </div>
          {/* Right: List */}
          <div className="space-y-4">
            <h3 className="text-base font-bold leading-5 text-[#064E3B]">เอกสารที่อัปโหลด</h3>
            {renderList()}
          </div>
        </div>
      ) : (
        <>
          {renderPreview('h-[433px] min-h-[433px]')}
          <h3 className="mt-6 text-base font-bold leading-5 text-[#064E3B]">เอกสารที่อัปโหลด</h3>
          <div className="mt-4">
            {renderList()}
          </div>
        </>
      )}

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        imageUrl={documentUrl}
        title={selectedDoc ? (docTypeLabel[selectedDoc.docType] ?? selectedDoc.docType) : 'Preview'}
      />
    </aside>
  );
}
