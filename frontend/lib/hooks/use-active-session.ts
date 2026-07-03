'use client';

import { useEffect, useState } from 'react';
import { getActiveSessionId, setActiveSessionId } from '@/lib/agent-session';
import { useSessionsQuery } from '@/lib/queries/sessions';

function createDraftSessionId(): string {
  return crypto.randomUUID();
}

export function useActiveSession() {
  const [manualId, setManualId] = useState<string | null>(null);
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
  const [fallbackDraftId] = useState(() => createDraftSessionId());
  const { data: sessions = [], isSuccess, isError, isFetched } = useSessionsQuery();

  const activeSessionId = (() => {
    if (!isSuccess) return null;

    const sessionIds = new Set(sessions.map((session) => session.id));
    const candidate = manualId ?? getActiveSessionId();

    if (candidate && sessionIds.has(candidate)) {
      return candidate;
    }
    if (candidate && candidate === draftSessionId) {
      return candidate;
    }
    if (sessions.length > 0) {
      return sessions[0].id;
    }
    return draftSessionId ?? fallbackDraftId;
  })();

  const isDraftSession = (id: string | null) => {
    if (!id || !isSuccess) return false;
    return !sessions.some((session) => session.id === id);
  };

  useEffect(() => {
    if (!activeSessionId) return;
    setActiveSessionId(activeSessionId);
  }, [activeSessionId]);

  const selectSession = (id: string) => {
    if (draftSessionId && activeSessionId === draftSessionId) {
      setDraftSessionId(null);
    }
    setManualId(id);
    setActiveSessionId(id);
  };

  const createNewSession = () => {
    const id = createDraftSessionId();
    setDraftSessionId(id);
    setManualId(id);
    setActiveSessionId(id);
  };

  const markSessionPersisted = (id: string) => {
    if (draftSessionId === id) {
      setDraftSessionId(null);
    }
  };

  const handleSessionDeleted = (deletedId: string) => {
    if (activeSessionId !== deletedId) return;

    const remaining = sessions.filter((session) => session.id !== deletedId);
    if (remaining.length > 0) {
      selectSession(remaining[0].id);
      return;
    }

    createNewSession();
  };

  return {
    activeSessionId,
    isDraftActive: isDraftSession(activeSessionId),
    isReady: isSuccess && !!activeSessionId,
    isSessionsError: isError && isFetched,
    selectSession,
    createNewSession,
    markSessionPersisted,
    handleSessionDeleted,
  };
}
