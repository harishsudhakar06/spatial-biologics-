import React from "react";

export function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-xl ${className}`}
      {...props}
    />
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-8 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
