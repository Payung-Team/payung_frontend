import type { ReactNode } from 'react';
import Skeleton from './Skeleton';
import { cn } from '../../lib/utils';

export interface DataTableSkeletonCell {
  width?: number | string;
  height?: number | string;
  borderRadius?: number | string;
  circle?: boolean;
  content?: ReactNode;
}

interface DataTableSkeletonProps {
  rows: number;
  cells: DataTableSkeletonCell[];
  gridTemplateColumns: string;
  minWidthClassName?: string;
}

export default function DataTableSkeleton({
  rows,
  cells,
  gridTemplateColumns,
  minWidthClassName = 'min-w-[1000px]',
}: DataTableSkeletonProps) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className={cn('grid items-center gap-4 px-5 py-4', minWidthClassName)}
          style={{ gridTemplateColumns }}
        >
          {cells.map((cell, cellIndex) => (
            <div key={cellIndex}>
              {cell.content ?? (
                <Skeleton
                  width={cell.width}
                  height={cell.height}
                  borderRadius={cell.borderRadius}
                  circle={cell.circle}
                />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
