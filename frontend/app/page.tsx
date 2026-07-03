import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import HomeClient from './home-client';
import { ServiceUnavailable } from '@/components/service-unavailable';
import { getServerQueryClient } from '@/lib/queries/query-client';
import { sessionsListQueryOptions } from '@/lib/queries/sessions-list-query';

export default async function HomePage() {
  const queryClient = getServerQueryClient();

  try {
    await queryClient.prefetchQuery(sessionsListQueryOptions);
  } catch {
    return (
      <div className="flex h-full min-h-0 w-full flex-1">
        <ServiceUnavailable />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <HomeClient />
      </HydrationBoundary>
    </div>
  );
}
