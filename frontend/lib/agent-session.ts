const STORAGE_KEY = 'flex-agent:active-session-id';

export function getActiveSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(STORAGE_KEY);
}

export function setActiveSessionId(id: string): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, id);
  }
}
