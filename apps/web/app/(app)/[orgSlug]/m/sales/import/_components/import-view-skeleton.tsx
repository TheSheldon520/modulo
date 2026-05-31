// apps/web/lib/import-view-skeleton.tsx
//
// Server Component — no "use client" needed (pure markup, no hooks).
//
// Skeleton fallback for the <ImportView> Suspense boundary. Mimics the
// dropzone layout (tall box + centered content area) so the page does not
// flash blank while the Client Component hydrates.

export function ImportViewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Dropzone skeleton */}
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border-subtle bg-surface-1 py-16">
        <div className="size-10 animate-pulse rounded-lg bg-surface-3" />
        <div className="flex flex-col items-center gap-2">
          <div className="h-4 w-40 animate-pulse rounded bg-surface-3" />
          <div className="h-3 w-56 animate-pulse rounded bg-surface-3" />
          <div className="h-3 w-48 animate-pulse rounded bg-surface-3" />
        </div>
        <div className="mt-2 h-8 w-36 animate-pulse rounded-md bg-surface-3" />
      </div>
    </div>
  );
}
