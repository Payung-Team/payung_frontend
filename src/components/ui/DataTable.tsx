import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface DataTableColumn<TItem> {
  key: string;
  header: ReactNode;
  render: (item: TItem, index: number) => ReactNode;
  className?: string;
  /** จัดแนวหัวคอลัมน์และเนื้อหาให้ตรงกันเสมอ (default: left) */
  align?: 'left' | 'center' | 'right';
}

// badge/ปุ่มในตารางเป็น inline-flex → text-align คุมตำแหน่งได้ทั้ง text และ element
const ALIGN_CLASS = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
} as const;

interface DataTableProps<TItem> {
  columns: DataTableColumn<TItem>[];
  items: TItem[];
  getRowKey: (item: TItem) => string;
  gridTemplateColumns: string;
  loading?: boolean;
  loadingContent?: ReactNode;
  error?: Error;
  renderError?: (error: Error) => ReactNode;
  renderEmpty?: ReactNode;
  footer?: ReactNode;
  minWidthClassName?: string;
}

export default function DataTable<TItem>({
  columns,
  items,
  getRowKey,
  gridTemplateColumns,
  loading = false,
  loadingContent,
  error,
  renderError,
  renderEmpty,
  footer,
  minWidthClassName = 'min-w-[1000px]',
}: DataTableProps<TItem>) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <div
          className={cn('grid gap-4 border-b border-gray-200 bg-[#F9FAFB] px-5 py-3 text-xs font-semibold text-gray-500', minWidthClassName)}
          style={{ gridTemplateColumns }}
        >
          {columns.map((column) => (
            <div key={column.key} className={ALIGN_CLASS[column.align ?? 'left']}>
              {column.header}
            </div>
          ))}
        </div>

        {loading ? (
          loadingContent
        ) : error ? (
          renderError?.(error)
        ) : items.length === 0 ? (
          renderEmpty
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((item, index) => (
              <div
                key={getRowKey(item)}
                className={cn('grid items-center gap-4 px-5 py-3.5 text-sm', minWidthClassName, index % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white')}
                style={{ gridTemplateColumns }}
              >
                {columns.map((column) => (
                  <div key={column.key} className={cn(ALIGN_CLASS[column.align ?? 'left'], column.className)}>
                    {column.render(item, index)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}
