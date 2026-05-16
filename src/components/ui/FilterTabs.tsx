import { cn } from '../../lib/utils';

export interface FilterTabItem<TKey extends string> {
  key: TKey;
  label: string;
  count?: number;
}

interface FilterTabsProps<TKey extends string> {
  items: FilterTabItem<TKey>[];
  activeKey: TKey;
  onChange: (key: TKey) => void;
  className?: string;
}

export default function FilterTabs<TKey extends string>({
  items,
  activeKey,
  onChange,
  className,
}: FilterTabsProps<TKey>) {
  return (
    <div className={cn('overflow-x-auto rounded-[10px] border border-gray-200 bg-white p-1 shadow-sm', className)}>
      <div className="flex min-w-max gap-1">
        {items.map((item) => {
          const isActive = activeKey === item.key;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={cn(
                'inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors',
                isActive ? 'bg-[#059669] text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-[#064E3B]',
              )}
            >
              {item.label}
              {typeof item.count === 'number' && (
                <span className={cn('min-w-6 rounded-full px-2 py-0.5 text-xs', isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500')}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
