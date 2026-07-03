'use client';

import { createContext, use, type ReactNode } from 'react';

type RuntimeEnv = {
  modelId: string;
};

const RuntimeEnvContext = createContext<RuntimeEnv | null>(null);

export function RuntimeEnvProvider({
  modelId,
  children,
}: {
  modelId: string;
  children: ReactNode;
}) {
  return <RuntimeEnvContext.Provider value={{ modelId }}>{children}</RuntimeEnvContext.Provider>;
}

export function useRuntimeEnv() {
  const ctx = use(RuntimeEnvContext);
  if (!ctx) {
    throw new Error('useRuntimeEnv must be used within RuntimeEnvProvider');
  }
  return ctx;
}
