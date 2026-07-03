import { fetchInitialSessionsList } from '@/lib/api/sessions';
import { sessionKeys } from '@/lib/queries/session-keys';

export const sessionsListQueryOptions = {
  queryKey: sessionKeys.list(),
  queryFn: fetchInitialSessionsList,
  retry: false,
} as const;
