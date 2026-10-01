// Skeleton loading components for all use cases
interface SkeletonTextProps {
  width?: string; // Tailwind width class, e.g. 'w-32', 'w-3/4'
  height?: string;
}

export function SkeletonText({ width = 'w-full', height = 'h-4' }: SkeletonTextProps) {
  return <div className={`${width} ${height} bg-gray-200 rounded animate-pulse`} />;
}

export function SkeletonAvatar({ size = 'w-10 h-10' }: { size?: string }) {
  return <div className={`${size} bg-gray-200 rounded-full animate-pulse flex-shrink-0`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonText width="w-1/4" height="h-3" />
          <SkeletonText width="w-2/3" height="h-6" />
          <SkeletonText width="w-1/3" height="h-3" />
        </div>
        <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse ml-4 flex-shrink-0" />
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ rows = 5, cols = 5 }: SkeletonTableProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-6 py-3 border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1">
            <SkeletonText width="w-3/4" height="h-3" />
          </div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex gap-4 px-6 py-4 border-b border-gray-50 last:border-0"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <div key={col} className="flex-1">
              <SkeletonText
                width={col === 0 ? 'w-full' : col % 2 === 0 ? 'w-2/3' : 'w-1/2'}
                height="h-4"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDeliveryCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonText width="w-28" height="h-3" />
        <div className="w-20 h-6 bg-gray-200 rounded-full animate-pulse" />
      </div>
      <div className="space-y-1.5">
        <SkeletonText width="w-3/4" height="h-4" />
        <SkeletonText width="w-2/3" height="h-4" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <SkeletonAvatar size="w-6 h-6" />
          <SkeletonText width="w-20" height="h-3" />
        </div>
        <SkeletonText width="w-16" height="h-3" />
      </div>
    </div>
  );
}

// Named export for default import compatibility
export function SkeletonLoader() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

export default SkeletonLoader;
