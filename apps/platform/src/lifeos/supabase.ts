/**
 * The person's own session with their LifeOS Supabase project: email and password sign-in,
 * token refresh, reads through PostgREST and the reviewed functions (RPC). Every request
 * carries the person's token, so the database's own row security decides what they see; this
 * app holds no service key. The session stays in this browser until they sign out.
 */
export type SupabaseConfig = { url: string; key: string };
export type Session = {
  access_token: string;
  refresh_token: string;
  /** Unix seconds. */
  expires_at: number;
  email: string;
};

/** The session ended or was refused: the person needs to sign in again. */
export class SignedOut extends Error {
  constructor() {
    super('Sign in to LifeOS again.');
  }
}

const STORAGE = 'lifeos.session';

function stored(): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE) ?? 'null') as Session | null;
    return value &&
      typeof value.access_token === 'string' &&
      typeof value.refresh_token === 'string'
      ? value
      : null;
  } catch {
    return null;
  }
}

function keep(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE, JSON.stringify(session));
    else localStorage.removeItem(STORAGE);
  } catch {
    // A private window may refuse storage; the session then lasts while the tab is open.
  }
}

async function reply(response: Response) {
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (response.ok) return body;
  if (response.status === 401) throw new SignedOut();
  const said = body.message ?? body.msg ?? body.error_description;
  throw new Error(typeof said === 'string' ? said : `LifeOS refused (${response.status}).`);
}

export function supabase(config: SupabaseConfig) {
  let session = stored();
  let refreshing: Promise<Session> | null = null;
  const headers = (token = config.key) => ({
    apikey: config.key,
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  });

  async function grant(kind: 'password' | 'refresh_token', body: object): Promise<Session> {
    const response = await fetch(`${config.url}/auth/v1/token?grant_type=${kind}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!response.ok && kind === 'password' && response.status === 400)
      throw new Error('That email and password do not match.');
    const value = await reply(response);
    const user = (value.user ?? {}) as { email?: unknown };
    session = {
      access_token: String(value.access_token),
      refresh_token: String(value.refresh_token),
      expires_at: Number(value.expires_at) || Math.floor(Date.now() / 1000) + 3600,
      email: typeof user.email === 'string' ? user.email : (session?.email ?? ''),
    };
    keep(session);
    return session;
  }

  /** A token valid for at least another minute, refreshed once even when asked many times. */
  async function token(): Promise<string> {
    if (!session) throw new SignedOut();
    if (session.expires_at - 60 > Date.now() / 1000) return session.access_token;
    refreshing ??= grant('refresh_token', { refresh_token: session.refresh_token }).finally(
      () => (refreshing = null),
    );
    try {
      return (await refreshing).access_token;
    } catch {
      forget();
      throw new SignedOut();
    }
  }

  function forget() {
    session = null;
    keep(null);
  }

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${config.url}/rest/v1/${path}`, {
        ...init,
        headers: headers(await token()),
      });
      return (await reply(response)) as T;
    } catch (error) {
      if (error instanceof SignedOut) forget();
      throw error;
    }
  }

  return {
    get email() {
      return session?.email ?? null;
    },
    signIn: (email: string, password: string) => grant('password', { email, password }),
    async signOut() {
      const token = session?.access_token;
      forget();
      if (token)
        await fetch(`${config.url}/auth/v1/logout`, { method: 'POST', headers: headers(token) })
          .then(() => undefined)
          .catch(() => undefined);
    },
    /** A PostgREST read, e.g. `lifeos_goals?select=id,title`. */
    get: <T>(path: string) => call<T>(path),
    /** One of the reviewed database functions, with named arguments. */
    rpc: <T>(name: string, args: object) =>
      call<T>(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args) }),
  };
}

export type Supabase = ReturnType<typeof supabase>;
