import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

import { formatCountdown, useCountdown } from '../hooks/useCountdown'
import type { Bear, Snapshot, TvVideo } from '../types'
import './Intermission.css'

const SLIDE_MS = 7000

interface Props {
  snapshot: Snapshot
  videos: TvVideo[]
  voteUrl: string
  /** Name of the round the countdown is counting down to, when there is one. */
  nextRoundName: string | null
}

/**
 * The between-rounds screen: how long until voting reopens, last year's bears
 * getting round in slow motion, and a bear cam playing in the corner.
 *
 * Shown while the host has a break running. The TV falls back to the bracket
 * the moment the clock runs out or the host opens the next round.
 */
export function Intermission({ snapshot, videos, voteUrl, nextRoundName }: Props) {
  const remaining = useCountdown(snapshot.intermissionUntil, snapshot.serverTime)

  // This screen is meant to fill the TV exactly. The app shell is min-height
  // based so ordinary pages can grow and scroll, which here just produced a
  // scrollbar -- so pin the shell to the viewport for as long as the break runs.
  useEffect(() => {
    document.body.classList.add('is-locked')
    return () => document.body.classList.remove('is-locked')
  }, [])

  const slides = useMemo(
    () => snapshot.bears.filter((bear): bear is Bear & { cardUrl: string } =>
      Boolean(bear.cardUrl)
    ),
    [snapshot.bears]
  )

  const [slide, setSlide] = useState(0)

  useEffect(() => {
    if (slides.length < 2) return
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % slides.length),
      SLIDE_MS
    )
    return () => window.clearInterval(timer)
  }, [slides.length])

  // A different clip each break, but stable *within* a break -- so a poll every
  // two seconds does not restart the video every two seconds.
  const video = useMemo(() => {
    if (videos.length === 0) return null
    const seed = snapshot.intermissionUntil
      ? Math.abs(Date.parse(snapshot.intermissionUntil)) / 60_000
      : 0
    return videos[Math.floor(seed) % videos.length] ?? videos[0]
  }, [videos, snapshot.intermissionUntil])

  const current = slides[slide]

  return (
    <div className="intermission">
      <header className="intermission__header">
        <div>
          <p className="intermission__kicker">Intermission</p>
          <h1 className="intermission__clock">
            {remaining === null ? '--:--' : formatCountdown(remaining)}
          </h1>
          <p className="intermission__next">
            {remaining === 0
              ? 'Any second now. Phones up.'
              : nextRoundName
                ? `until ${nextRoundName}`
                : 'until the next round'}
          </p>
        </div>

        <div className="intermission__join">
          <QRCodeSVG value={voteUrl} size={132} bgColor="#ffffff" fgColor="#3E2A1E" />
          <p className="intermission__joinline">
            Not playing yet? Scan to join
            <br />
            <span className="intermission__joinurl">{voteUrl}</span>
          </p>
        </div>
      </header>

      <div className="intermission__body">
        <section className="intermission__stage">
          {current ? (
            <>
              <img
                className="intermission__card"
                // Keying on the id restarts the fade when the bear changes.
                key={current.id}
                src={current.cardUrl}
                alt={`${current.displayName} in June beside ${current.displayName} in September`}
              />
              <div className="intermission__caption">
                <h2 className="intermission__bear">{current.displayName}</h2>
                <p className="intermission__title">{current.title}</p>
              </div>
              <div className="intermission__dots" aria-hidden="true">
                {slides.map((bear, index) => (
                  <span
                    key={bear.id}
                    className={`intermission__dot ${index === slide ? 'is-on' : ''}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="intermission__empty">
              No bear photos yet. Run <code>scripts/fetch-bear-photos.py</code>.
            </p>
          )}
        </section>

        {video && (
          <section className="intermission__video">
            <div className="intermission__frame">
              <iframe
                // youtube-nocookie keeps the TV from collecting a tracking
                // cookie for every guest who glances at it.
                src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&mute=1&rel=0&playsinline=1`}
                title={video.title}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            <p className="intermission__videotitle">
              {video.live && <span className="intermission__livedot" aria-hidden="true" />}
              {video.title}
            </p>
            <p className="intermission__videosub">{video.subtitle}</p>
          </section>
        )}
      </div>
    </div>
  )
}
