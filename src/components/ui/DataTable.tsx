import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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

/** gap-4 ระหว่างคอลัมน์ + px-5 ซ้ายขวา — ตรงกับ class ของแถวด้านล่าง */
const COLUMN_GAP_PX = 16;
const ROW_PADDING_X_PX = 40;

/**
 * ความกว้างขั้นต่ำที่ตารางต้องใช้ คำนวณจาก gridTemplateColumns
 * "130px" → 130 · "minmax(150px, 1.3fr)" → 150 · "1fr" / "auto" → 0
 */
function minTableWidth(gridTemplateColumns: string): number {
  const tracks = gridTemplateColumns.match(/minmax\([^)]*\)|\S+/g) ?? [];
  const sum = tracks.reduce((total, track) => {
    const px = /(\d+(?:\.\d+)?)px/.exec(track);
    return total + (px ? Number(px[1]) : 0);
  }, 0);
  return sum + Math.max(tracks.length - 1, 0) * COLUMN_GAP_PX + ROW_PADDING_X_PX;
}

/**
 * true เมื่อกล่องกว้างพอให้ตารางแสดงครบโดยไม่ต้องเลื่อนแนวนอน
 * ดูความกว้างของกล่องจริง (ไม่ใช่ความกว้างจอ) — sidebar เปิด/ยุบ หรือหน้าจอแท็บเล็ต/โน้ตบุ๊ก ก็ตัดสินถูก
 */
function useFitsWidth(required: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setFits(el.clientWidth >= required);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [required]);
  return { ref, fits };
}

function isEmptyHeader(header: ReactNode): boolean {
  return header == null || header === false || (typeof header === 'string' && header.trim() === '');
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
  const { ref, fits } = useFitsWidth(minTableWidth(gridTemplateColumns));

  // สถานะที่ไม่ใช่แถวข้อมูล — ใช้ร่วมกันทั้งมุมมองตารางและการ์ด
  const state = error ? renderError?.(error) : items.length === 0 ? renderEmpty : undefined;

  return (
    <div ref={ref} className="@container overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {fits ? (
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
          ) : state !== undefined ? (
            state
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
      ) : loading ? (
        <div className="space-y-3 p-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : state !== undefined ? (
        state
      ) : (
        // กล่องแคบกว่าตาราง: แถวละการ์ด "หัวคอลัมน์ : ค่า" · กล่องกว้าง ≥ 36rem วางเป็น 2 คอลัมน์
        // คอลัมน์ที่ไม่มีหัว (ปุ่มจัดการ) อยู่ท้ายการ์ดเต็มความกว้าง
        <ul className="divide-y divide-gray-100">
          {items.map((item, index) => (
            <li
              key={getRowKey(item)}
              className="grid grid-cols-1 gap-x-8 gap-y-2 px-4 py-3.5 text-sm @xl:grid-cols-2 @xl:px-5"
            >
              {columns.map((column) =>
                isEmptyHeader(column.header) ? (
                  <div key={column.key} className={cn('flex justify-end pt-1 @xl:col-span-2', column.className)}>
                    {column.render(item, index)}
                  </div>
                ) : (
                  <div key={column.key} className="flex min-w-0 items-start justify-between gap-3">
                    <span className="shrink-0 pt-0.5 text-xs text-gray-500">{column.header}</span>
                    <div className={cn('min-w-0 text-right', column.className)}>{column.render(item, index)}</div>
                  </div>
                ),
              )}
            </li>
          ))}
        </ul>
      )}

      {footer}
    </div>
  );
}
