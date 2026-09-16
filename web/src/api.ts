import type { AdminSnapshot, AppConfig, Guest, Snapshot } from './types'

/**
 * Where the backend lives. Set VITE_API_BASE_URL on Vercel to your self-hosted
 * API. Left blank, we assume the API is same-origin (handy when you run both
 * behind one tunnel, or in `vite dev` with the server on the same host).
 */
const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const GUEST_TOKEN_KEY = 'fbw.guestToken'
const ADMIN_TOKEN_KEY = 'fbw.adminToken'

/** localStorage throws in some private-browsing modes, so never let it crash a render. */
function safeRead(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function safeWrite(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {
    /* ignore -- the session still works, it just will not survive a refresh */
  }
}

export const guestToken = {
  get: () => safeRead(GUEST_TOKEN_KEY),
  set: (token: string) => safeWrite(GUEST_TOKEN_KEY, token),
  clear: () => safeWrite(GUEST_TOKEN_KEY, ''),
}

export const adminToken = {
  get: () => safeRead(ADMIN_TOKEN_KEY),
  set: (token: string) => safeWrite(ADMIN_TOKEN_KEY, token),
  clear: () => safeWrite(ADMIN_TOKEN_KEY, ''),
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: 'guest' | 'admin' | 'none'
  signal?: AbortSignal
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = 'guest', signal } = options
  const headers: Record<string, string> = {}

  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth === 'guest') {
    const token = guestToken.get()
    if (token) headers['Authorization'] = `Bearer ${token}`
  } else if (auth === 'admin') {
    headers['x-admin-token'] = adminToken.get()
  }

  let response: Response
  try {
    response = await fetch(`${BASE}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError('Cannot reach the bear server. Is it running?', 0)
  }

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as Record<string, unknown>) : {}

  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : 'Something went wrong.'
    throw new ApiError(message, response.status)
  }

  return payload as T
}

export const api = {
  config: (signal?: AbortSignal) =>
    request<AppConfig>('/config', { auth: 'none', signal }),

  state: (signal?: AbortSignal) => request<Snapshot>('/state', { signal }),

  join: (name: string, pin: string, partyPin: string) =>
    request<{ guest: Guest; token: string; returning: boolean }>('/guests/join', {
      method: 'POST',
      auth: 'none',
      body: { name, pin, partyPin },
    }),

  me: () => request<{ guest: Guest }>('/guests/me'),

  vote: (matchupId: number, bearId: string) =>
    request<{ ok: true }>('/votes', { method: 'POST', body: { matchupId, bearId } }),

  admin: {
    ping: () => request<{ ok: true }>('/admin/ping', { auth: 'admin' }),

    state: (signal?: AbortSignal) =>
      request<AdminSnapshot>('/admin/state', { auth: 'admin', signal }),

    openRound: () =>
      request<AdminSnapshot>('/admin/round/open', { method: 'POST', auth: 'admin' }),

    closeRound: () =>
      request<AdminSnapshot>('/admin/round/close', { method: 'POST', auth: 'admin' }),

    decide: (matchupId: number, bearId: string) =>
      request<AdminSnapshot>(`/admin/matchups/${matchupId}/decide`, {
        method: 'POST',
        auth: 'admin',
        body: { bearId },
      }),

    revealChampion: () =>
      request<AdminSnapshot>('/admin/champion/reveal', { method: 'POST', auth: 'admin' }),

    hideChampion: () =>
      request<AdminSnapshot>('/admin/champion/hide', { method: 'POST', auth: 'admin' }),

    reset: (keepGuests: boolean) =>
      request<AdminSnapshot>('/admin/reset', {
        method: 'POST',
        auth: 'admin',
        body: { keepGuests },
      }),

    removeGuest: (id: number) =>
      request<{ ok: true }>(`/admin/guests/${id}`, { method: 'DELETE', auth: 'admin' }),
  },
}
