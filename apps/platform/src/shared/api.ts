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

export async function aiAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/status');
    return response.ok && ((await response.json()) as { ai?: boolean }).ai === true;
  } catch {
    return false;
  }
}
