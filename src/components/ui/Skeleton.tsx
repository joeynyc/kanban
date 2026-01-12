interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--radius-sm)',
  className = '',
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

export function ColumnSkeleton() {
  return (
    <div className="column skeleton-column">
      <div className="column-header">
        <Skeleton width="60%" height="16px" />
        <Skeleton width="24px" height="20px" borderRadius="10px" />
      </div>
      <div className="column-cards">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card skeleton-card">
      <Skeleton width="80%" height="14px" />
      <Skeleton width="50%" height="12px" className="mt-2" />
    </div>
  );
}

export function BoardSkeleton() {
  return (
    <div className="board-view">
      <ColumnSkeleton />
      <ColumnSkeleton />
      <ColumnSkeleton />
    </div>
  );
}
