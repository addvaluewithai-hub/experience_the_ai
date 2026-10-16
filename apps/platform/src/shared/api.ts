/** JSON POST to the platform API; failures carry the server's own message. */
export async function post<T>(path: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Could not reach the server. Check your connection.');
  }
  const result = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status}).`);
  return result;
}

/** What this deployment offers: the AI characters, and where to sign in for LifeOS rooms. */
export type PlatformStatus = { ai: boolean; lifeos: { url: string; key: string } | null };

export async function platformStatus(): Promise<PlatformStatus> {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) return { ai: false, lifeos: null };
    const status = (await response.json()) as Partial<PlatformStatus>;
    const lifeos = status.lifeos;
    return {
      ai: status.ai === true,
      lifeos:
        lifeos && typeof lifeos.url === 'string' && typeof lifeos.key === 'string' ? lifeos : null,
    };
  } catch {
    return { ai: false, lifeos: null };
  }
}
