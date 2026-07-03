import { QueryClient } from '@tanstack/react-query';
import { cache } from 'react';

export const queryDefaultOptions = {
  queries: {
    staleTime: 30_000,
    retry: 1,
  },
} as const;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: queryDefaultOptions,
  });
}

export const getServerQueryClient = cache(() => makeQueryClient());
