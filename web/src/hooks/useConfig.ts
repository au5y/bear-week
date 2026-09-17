import { useEffect, useState } from 'react'

import { api } from '../api'
import type { AppConfig } from '../types'

interface ConfigResult {
  config: AppConfig | null
  /** True once a fetch has failed and we still have no config to go on. */
  failed: boolean
}

/**
 * Load `/api/config` once, retrying with backoff until it lands.
 *
 * The join screen decides whether to render the party-password field from
 * `requiresPartyPin`, so a single failed fetch (server still booting, phone
 * waking up on the wifi) must not leave a guest permanently unable to join.
 * `failed` lets that screen fall back to asking for the password anyway,
 * without flashing the field during the normal first-paint moment where the
 * answer is merely not back yet.
 */
export function useConfig(): ConfigResult {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let attempt = 0
    const controller = new AbortController()

    const load = () => {
      api
        .config(controller.signal)
        .then((next) => {
          if (cancelled) return
          setConfig(next)
          setFailed(false)
        })
        .catch((err) => {
          if (cancelled || (err as Error).name === 'AbortError') return
          setFailed(true)
          attempt += 1
          // 1s, 2s, 4s ... capped, so a backend that comes up late still works.
          timer = window.setTimeout(load, Math.min(1000 * 2 ** (attempt - 1), 15_000))
        })
    }

    load()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [])

  return { config, failed }
}
