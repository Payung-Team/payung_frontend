import Icon from './Icon';
import { cn } from '../../lib/utils';

export type VisiblePage = number | '...';

function getVisiblePages(currentPage: number, totalPages: number): VisiblePage[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) return [1, 2, 3, '...', totalPages];
  if (currentPage >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages];

  return [1, '...', currentPage, '...', totalPages];
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  className?: string;
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  previousLabel = 'หน้าก่อนหน้า',
  nextLabel = 'หน้าถัดไป',
  className,
}: PaginationProps) {
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={previousLabel}
      >
        <Icon name="arrow_back" size="small" />
      </button>
      {visiblePages.map((pageNumber, index) =>
        pageNumber === '...' ? (
          <span
            key={`ellipsis-${index}`}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-xs text-gray-500"
          >
            ...
          </span>
        ) : (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium',
              page === pageNumber ? 'bg-[#059669] text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
            )}
          >
            {pageNumber}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-white text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={nextLabel}
      >
        <Icon name="arrow_forward" size="small" />
      </button>
    </div>
  );
}
