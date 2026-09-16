import { useState } from 'react'

/**
 * Required AI-disclosure banner.
 *
 * Dismissible so it does not sit on the TV all night, but the dismissal lives
 * in component state only -- no localStorage, and deliberately not
 * sessionStorage either, since that survives a reload. Every page load shows
 * the notice again, which is the point of it.
 */

export function DisclosureBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const dismiss = () => setDismissed(true)

  return (
    <div className="disclosure" role="note">
      <span className="disclosure__text">
        This app was built with AI (Claude) for a private party &mdash; not affiliated
        with or endorsed by the National Park Service or explore.org.
      </span>
      <button
        type="button"
        className="disclosure__dismiss"
        onClick={dismiss}
        aria-label="Dismiss notice"
        title="Dismiss (comes back on reload)"
      >
        &times;
      </button>
    </div>
  )
}

/** Source credit. Shown at the bottom of every screen. */
export function CreditFooter({ variant = 'default' }: { variant?: 'default' | 'tv' }) {
  return (
    <footer className={`credit ${variant === 'tv' ? 'credit--tv' : ''}`}>
      Bear photos and bios adapted from explore.org&rsquo;s Fat Bear Week &mdash;{' '}
      <a
        href="https://explore.org/meet-the-bears"
        target="_blank"
        rel="noreferrer noopener"
      >
        Meet the Bears
      </a>
      , presented by Katmai National Park &amp; Preserve / Katmai Conservancy.
    </footer>
  )
}
