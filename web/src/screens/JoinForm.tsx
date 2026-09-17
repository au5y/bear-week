import { useEffect, useState } from 'react'

import { ApiError, api } from '../api'
import type { AppConfig, Guest } from '../types'
import { PawDivider, PawPrint } from '../components/PawPrint'
import { CreditFooter } from '../components/Disclosure'
import './JoinForm.css'

/**
 * Guest sign-in. A name is required; a PIN is optional and only there so a
 * guest can lock their ballot against a friend typing their name as a joke.
 */

interface Props {
  config: AppConfig | null
  /** The config fetch failed, so we do not know whether a party password is set. */
  configFailed?: boolean
  onJoined: (token: string, guest: Guest) => void
}

export function JoinForm({ config, configFailed = false, onJoined }: Props) {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [partyPin, setPartyPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // If the name turns out to be PIN-protected, spell that out rather than
  // leaving the guest staring at a generic failure.
  const [needsPin, setNeedsPin] = useState(false)

  useEffect(() => {
    setNeedsPin(false)
  }, [name])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      const result = await api.join(name, pin, partyPin)
      onJoined(result.token, result.guest)
    } catch (err) {
      setError((err as Error).message)
      if (
        err instanceof ApiError &&
        (err.code === 'pin_required' || err.code === 'pin_mismatch')
      ) {
        setNeedsPin(true)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="join">
      <main className="join__card card">
        <div className="join__crest" aria-hidden="true">
          <PawPrint size={44} color="var(--honey)" />
        </div>

        <p className="join__kicker">Welcome to</p>
        <h1 className="join__title">
          Fat Bear
          <br />
          Week
        </h1>
        <p className="join__blurb">
          Eleven extremely round bears. One crown. You are a judge now, and your
          only qualification is vibes.
        </p>

        <PawDivider />

        <form onSubmit={submit}>
          {error && <p className="alert">{error}</p>}

          {/* If the config fetch failed we cannot know whether a password is
              required, so offer the field anyway rather than locking a guest
              out of a PIN-protected party. */}
          {(config?.requiresPartyPin || configFailed) && (
            <label className="field">
              <span className="field__label">
                Party password
                {!config && <span className="join__optional">if the host set one</span>}
              </span>
              <input
                className="field__input"
                value={partyPin}
                onChange={(event) => setPartyPin(event.target.value)}
                autoComplete="off"
                placeholder="ask the host"
                required={config?.requiresPartyPin ?? false}
              />
            </label>
          )}

          <label className="field">
            <span className="field__label">What do we call you?</span>
            <input
              className="field__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              autoComplete="off"
              autoCapitalize="words"
              placeholder="Bear Enjoyer"
              required
            />
            <span className="field__hint">
              Shows up on the host&rsquo;s screen so they know everyone has voted.
              Nobody sees who you picked.
            </span>
          </label>

          <label className="field">
            <span className="field__label">
              Secret PIN <span className="join__optional">optional</span>
            </span>
            <input
              className="field__input"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              pattern="\d*"
              maxLength={8}
              autoComplete="off"
              placeholder="4-8 digits"
              required={needsPin}
            />
            <span className="field__hint">
              {needsPin
                ? 'That name is already locked. Enter its PIN to get your ballot back.'
                : 'Set one to lock your name so nobody else can vote as you. Skip it and the name stays open.'}
            </span>
          </label>

          <button className="btn btn--go btn--wide" type="submit" disabled={busy}>
            {busy ? 'Waddling in…' : 'Let me in'}
          </button>
        </form>
      </main>

      <CreditFooter />
    </div>
  )
}
