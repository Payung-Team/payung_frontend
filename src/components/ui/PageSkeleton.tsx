import Skeleton from './Skeleton';

export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#F6FAF9]">
      {/* Fake header */}
      <div className="fixed top-0 left-0 right-0 h-[70px] bg-white border-b border-gray-200 flex items-center px-6 gap-4 z-50">
        <Skeleton width={100} height={26} borderRadius="6px" />
        <div className="hidden md:flex gap-4 ml-8">
          {[80, 72, 88, 64].map((w, i) => (
            <Skeleton key={i} width={w} height={14} borderRadius="6px" />
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Skeleton width={32} height={32} circle />
          <Skeleton width={88} height={32} borderRadius="8px" />
        </div>
      </div>

      {/* Content area */}
      <div className="pt-[70px] px-6 py-8 max-w-[1280px] mx-auto space-y-4">
        <Skeleton height={220} borderRadius="14px" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton height={100} borderRadius="12px" />
          <Skeleton height={100} borderRadius="12px" />
        </div>
        <Skeleton height={100} borderRadius="12px" />
      </div>
    </div>
  );
}
