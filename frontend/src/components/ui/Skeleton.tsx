import { HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-muted rounded ${className}`}
      {...props}
    />
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="group">
      <Skeleton className="w-full aspect-[3/4] mb-4" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-6 w-1/3" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div>
      <Skeleton className="w-full aspect-[3/4] mb-4" />
    </div>
  );
}

export function ReviewCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
      <Skeleton className="h-5 w-24 mb-4" />
      <Skeleton className="h-16 w-full mb-4" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}
