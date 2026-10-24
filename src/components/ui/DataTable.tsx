import { Fragment, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface DataTableColumn<TItem> {
  key: string;
  header: ReactNode;
  render: (item: TItem, index: number) => ReactNode;
  className?: string;
  /** จัดแนวหัวคอลัมน์และเนื้อหาให้ตรงกันเสมอ (default: left) */
  align?: 'left' | 'center' | 'right';
  /**
   * บทบาทในมุมมองการ์ด (กล่องแคบกว่าตาราง) — ไม่ระบุ = 'meta'
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
        // กล่องแคบกว่าตาราง: การ์ดต่อแถว เรียงตามความสำคัญ (ชื่อ → รหัส/อีเมล → ป้าย → รายละเอียด → ปุ่ม)
        // กล่องกว้าง ≥ 42rem วางการ์ด 2 ใบต่อแถว
        <ul className="grid grid-cols-1 gap-3 bg-[#F9FAFB] p-3 @2xl:grid-cols-2">
          {items.map((item, index) => (
            <li key={getRowKey(item)}>
              <DataCard columns={columns} item={item} index={index} />
            </li>
          ))}
        </ul>
      )}

      {footer}
    </div>
  );
}

function DataCard<TItem>({ columns, item, index }: { columns: DataTableColumn<TItem>[]; item: TItem; index: number }) {
  const role = (c: DataTableColumn<TItem>) => c.mobile ?? 'meta';
  const pick = (r: NonNullable<DataTableColumn<TItem>['mobile']>) => columns.filter((c) => role(c) === r);
  const titles = pick('title');
  const subtitles = pick('subtitle');
  const badges = pick('badge');
  const metas = pick('meta');
  const actions = pick('action');

  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {(titles.length > 0 || subtitles.length > 0) && (
        <div className="min-w-0 space-y-1">
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
        </div>
      )}

      {badges.length > 0 && (
        <div className="flex flex-wrap items-start gap-2">
          {badges.map((c) => (
            <div key={c.key}>{c.render(item, index)}</div>
          ))}
        </div>
      )}

      {metas.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-100 pt-3">
          {metas.map((c) => (
            <div key={c.key} className="min-w-0">
              <dt className="text-[11px] text-gray-400">{c.header}</dt>
              <dd className="min-w-0 truncate text-sm text-gray-700">{c.render(item, index)}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions.length > 0 && (
        <div className="mt-auto flex flex-wrap justify-end gap-2 [&>button]:h-10 [&>button]:w-full [&>button]:justify-center [&>button]:text-sm">
          {actions.map((c) => (
            <Fragment key={c.key}>{c.render(item, index)}</Fragment>
          ))}
        </div>
      )}
    </article>
  );
}
