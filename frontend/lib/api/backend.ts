const DEFAULT_BACKEND_URL = 'http://localhost:8000';

export function getBackendUrl(): string {
  return (process.env.NEXT_PUBLIC_BACKEND_URL ?? DEFAULT_BACKEND_URL).replace(/\/+$/, '');
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function backendFetch<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs, ...fetchInit } = init ?? {};
  const signal =
    timeoutMs !== undefined
      ? AbortSignal.any(
          [fetchInit.signal, AbortSignal.timeout(timeoutMs)].filter(
            (value): value is AbortSignal => value !== undefined,
          ),
        )
      : fetchInit.signal;

  const res = await fetch(`${getBackendUrl()}${path}`, {
    ...fetchInit,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...fetchInit.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}
