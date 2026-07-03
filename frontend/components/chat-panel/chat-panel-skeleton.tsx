import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function MessageSkeleton({ align }: { align: 'left' | 'right' }) {
  return (
    <div className={cn('flex', align === 'right' ? 'justify-end' : 'justify-start')}>
      <Skeleton className={cn('rounded-lg', align === 'right' ? 'h-9 w-32' : 'h-10 w-48')} />
    </div>
  );
}

export function ChatPanelSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-24" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-6">
          <MessageSkeleton align="right" />
          <MessageSkeleton align="left" />
          <MessageSkeleton align="right" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
