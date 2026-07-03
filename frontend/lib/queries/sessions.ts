'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import {
  createSession,
  deleteSession,
  getSession,
  updateSession,
  type ChatSession,
  type ChatSessionMeta,
} from '@/lib/api/sessions';
import { sessionKeys } from '@/lib/queries/session-keys';
import { sessionsListQueryOptions } from '@/lib/queries/sessions-list-query';

export function useSessionsQuery() {
  return useQuery(sessionsListQueryOptions);
}

export function useSessionQuery(id: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(id ?? ''),
    queryFn: () => getSession(id!),
    enabled: !!id,
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSession,
    onSuccess: (session) => {
      queryClient.setQueryData<ChatSessionMeta[]>(sessionKeys.list(), (prev) => {
        if (prev?.some((item) => item.id === session.id)) {
          return prev
            .map((item) => (item.id === session.id ? session : item))
            .sort((a, b) => b.updatedAt - a.updatedAt);
        }
        return [session, ...(prev ?? [])].sort((a, b) => b.updatedAt - a.updatedAt);
      });
      queryClient.setQueryData(sessionKeys.detail(session.id), session);
    },
  });
}

export function useUpdateSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<ChatSession, 'title' | 'messages'>>;
    }) => updateSession(id, patch),
    onSuccess: (session) => {
      queryClient.setQueryData(sessionKeys.detail(session.id), session);
      queryClient.setQueryData<ChatSessionMeta[]>(sessionKeys.list(), (prev) => {
        if (!prev) return [session];
        return prev
          .map((item) => (item.id === session.id ? session : item))
          .sort((a, b) => b.updatedAt - a.updatedAt);
      });
    },
  });
}

export function useDeleteSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSession,
    onSuccess: (_data, id) => {
      queryClient.setQueryData<ChatSessionMeta[]>(sessionKeys.list(), (prev) =>
        (prev ?? []).filter((session) => session.id !== id),
      );
      queryClient.removeQueries({ queryKey: sessionKeys.detail(id) });
    },
  });
}

export function deriveSessionTitle(messages: UIMessage[]): string | null {
  for (const message of messages) {
    if (message.role !== 'user') continue;
    for (const part of message.parts) {
      if (part.type === 'text' && part.text.trim()) {
        const text = part.text.trim();
        return text.length > 30 ? `${text.slice(0, 30)}…` : text;
      }
    }
  }
  return null;
}
