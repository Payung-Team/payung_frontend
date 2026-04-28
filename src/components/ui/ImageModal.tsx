
import { Icon } from './Icon';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export default function ImageModal({ isOpen, onClose, imageUrl, title }: ImageModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 px-4 backdrop-blur-md transition-all duration-300"
      onClick={onClose}
    >
      <div 
        className="relative max-w-[90vw] max-h-[90vh] animate-[zoomIn_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
        >
          <Icon name="close" size="large" />
        </button>

        {/* Title */}
        {title && (
          <div className="absolute -top-12 left-0 text-white font-semibold text-lg" style={{ fontFamily: "'Bai Jamjuree', sans-serif" }}>
            {title}
          </div>
        )}

        {/* Image */}
        <img
          src={imageUrl}
          alt={title || 'Preview'}
          className="rounded-lg shadow-2xl max-w-full max-h-[80vh] object-contain"
        />
      </div>

    </div>
  );
}
