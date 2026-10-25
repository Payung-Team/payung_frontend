import { Fragment, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface DataTableColumn<TItem> {
  key: string;
  header: ReactNode;
  render: (item: TItem, index: number) => ReactNode;
  className?: string;
  /** จัดแนวหัวคอลัมน์และเนื้อหาให้ตรงกันเสมอ (default: left) */
  align?: 'left' | 'center' | 'right';
  /**
   * บทบาทในมุมมองการ์ด (จอเล็กกว่า lg / 1024px) — ไม่ระบุ = 'meta'
   * title: บรรทัดหลัก (ชื่อ) · subtitle: บรรทัดรองสีเทา (รหัส/อีเมล) · badge: แถวป้ายสถานะ
   * meta: "หัวคอลัมน์ ค่า" ตัวเล็ก · action: ปุ่มเต็มความกว้างท้ายการ์ด · hidden: ไม่แสดงในการ์ด
   */
  mobile?: 'title' | 'subtitle' | 'badge' | 'meta' | 'action' | 'hidden';
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

/**
 * ≥ lg (desktop · มี sidebar): ตารางเดิม — คอลัมน์เกินจอเลื่อนแนวนอนได้
 * < lg (มือถือ / แท็บเล็ต · มี bottom nav): การ์ดต่อแถว เรียงตามความสำคัญจาก `mobile` ของแต่ละคอลัมน์
 * ใช้ breakpoint เดียวกับ AdminLayout (sidebar ↔ bottom nav)
 */
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
  // สถานะที่ไม่ใช่แถวข้อมูล — ใช้ร่วมกันทั้งตารางและการ์ด
  const state = error ? renderError?.(error) : items.length === 0 ? renderEmpty : undefined;

  return (
    <div className="lg:overflow-hidden lg:rounded-xl lg:border lg:border-gray-200 lg:bg-white lg:shadow-sm">
      {/* desktop: ตาราง */}
      <div className="hidden overflow-x-auto lg:block">
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

      {/* มือถือ / แท็บเล็ต: การ์ด · แท็บเล็ต (md) วาง 2 ใบต่อแถว */}
      <div className="lg:hidden">
        {loading ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-44 animate-pulse rounded-2xl bg-white shadow-[0_2px_12px_rgba(6,78,59,0.06)]" />
            ))}
          </ul>
        ) : state !== undefined ? (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white">{state}</div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((item, index) => (
              <li key={getRowKey(item)}>
                <DataCard columns={columns} item={item} index={index} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {footer && <div className="mt-3 overflow-hidden rounded-2xl border border-gray-100 bg-white lg:mt-0 lg:rounded-none lg:border-0">{footer}</div>}
    </div>
  );
}

function DataCard<TItem>({ columns, item, index }: { columns: DataTableColumn<TItem>[]; item: TItem; index: number }) {
  const pick = (r: NonNullable<DataTableColumn<TItem>['mobile']>) => columns.filter((c) => (c.mobile ?? 'meta') === r);
  const titles = pick('title');
  const subtitles = pick('subtitle');
  const badges = pick('badge');
  const metas = pick('meta');
  const actions = pick('action');

  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-[#E7F3EE] bg-white p-4 shadow-[0_2px_12px_rgba(6,78,59,0.06)] transition-transform active:scale-[0.99]">
      {(titles.length > 0 || subtitles.length > 0) && (
        <header className="min-w-0 space-y-1">
          {titles.map((c) => (
            <div key={c.key} className="min-w-0 text-[15px] font-semibold text-gray-900">
              {c.render(item, index)}
            </div>
          ))}
          {subtitles.map((c) => (
            <div
              key={c.key}
              className="min-w-0 truncate text-xs text-gray-500 [&_*]:text-xs [&_*]:font-normal [&_*]:text-gray-500"
            >
              {c.render(item, index)}
            </div>
          ))}
        </header>
      )}

      {badges.length > 0 && (
        <div className="flex flex-wrap items-start gap-2">
          {badges.map((c) => (
            <div key={c.key}>{c.render(item, index)}</div>
          ))}
        </div>
      )}

      {metas.length > 0 && (
        <dl className="grid grid-cols-2 gap-2">
          {metas.map((c) => (
            <div key={c.key} className="min-w-0 rounded-xl bg-[#F3FAF7] px-3 py-2">
              <dt className="text-[11px] text-[#5B8A7B]">{c.header}</dt>
              <dd className="min-w-0 truncate text-sm font-medium text-gray-800">{c.render(item, index)}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions.length > 0 && (
        <div className="mt-auto flex flex-wrap justify-end gap-2 [&>button]:h-11 [&>button]:w-full [&>button]:justify-center [&>button]:rounded-xl [&>button]:text-sm [&>button]:shadow-sm">
          {actions.map((c) => (
            <Fragment key={c.key}>{c.render(item, index)}</Fragment>
          ))}
        </div>
      )}
    </article>
  );
}
