import { Skeleton } from '@/components/ui/skeleton';

export function SessionListItemSkeleton() {
  return (
    <div className="flex min-w-0 items-center rounded-lg pr-1">
      <Skeleton className="h-12 min-w-0 flex-1 rounded-lg" />
    </div>
  );
}
