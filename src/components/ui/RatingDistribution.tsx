import React from 'react';

interface Props {
  reviews: Array<{ rating: number }>;
}

export function RatingDistribution({ reviews }: Props) {
  const counts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
  }));
  const max = Math.max(...counts.map(c => c.count), 1);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {counts.map(({ star, count }) => (
        <div key={star} className="flex items-center gap-2 text-sm">
          <span className="w-4 text-right text-[#1A1A1A]">{star}</span>
          <span className="material-icons text-base" style={{ color: '#F59E0B' }}>star</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(count / max) * 100}%`, background: '#52B69A' }}
            />
          </div>
          <span className="w-5 text-right text-[11px] text-[#8A8C8E]">{count}</span>
        </div>
      ))}
    </div>
  );
}
