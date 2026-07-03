'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ServerOffIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { sessionsListQueryOptions } from '@/lib/queries/sessions-list-query';

export function ServiceUnavailable() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await queryClient.fetchQuery(sessionsListQueryOptions);
      router.refresh();
    } catch {
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12">
      <Empty className="border-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ServerOffIcon />
          </EmptyMedia>
          <EmptyTitle>服务不可用</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={handleRetry} disabled={retrying}>
            {retrying ? '重试中…' : '重试'}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
