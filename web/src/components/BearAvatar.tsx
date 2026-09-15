import type { Bear } from '../types'

/**
 * A generated chonky bear face.
 *
 * Deliberately not a real photo: no hotlinking, no licensing questions, and it
 * scales crisply from a phone list row to a full TV champion reveal. To use
 * real photos instead, drop files in `web/public/bears/` and set `photoUrl` on
 * the bear in `server/src/bears.js` -- this component prefers a photo whenever
 * one exists.
 */

interface Props {
  bear: Bear
  size?: number | string
  /** Dim and desaturate a bear that has been knocked out. */
  sleeping?: boolean
  className?: string
}

export function BearAvatar({ bear, size = 96, sleeping = false, className }: Props) {
  const dimension = typeof size === 'number' ? `${size}px` : size

  if (bear.photoUrl) {
    return (
      <img
        className={`bear-face ${className ?? ''}`}
        src={bear.photoUrl}
        alt={`${bear.displayName}, a brown bear`}
        style={{
          width: dimension,
          height: dimension,
          filter: sleeping ? 'grayscale(0.7)' : undefined,
          opacity: sleeping ? 0.6 : 1,
        }}
      />
    )
  }

  // Three eye treatments keep a field of eleven bears from looking cloned.
  const variant = bear.seed % 3

  return (
    <svg
      className={`bear-face ${className ?? ''}`}
      viewBox="0 0 120 124"
      role="img"
      aria-label={`${bear.displayName}, an illustrated brown bear`}
      style={{
        width: dimension,
        height: dimension,
        filter: sleeping ? 'grayscale(0.7)' : undefined,
        opacity: sleeping ? 0.6 : 1,
      }}
    >
      <g stroke="var(--bark)" strokeWidth="4.5" strokeLinejoin="round">
        {/* Ears */}
        <circle cx="26" cy="30" r="18" fill={bear.color} />
        <circle cx="94" cy="30" r="18" fill={bear.color} />
        <circle cx="26" cy="30" r="8" fill={bear.accent} strokeWidth="3" />
        <circle cx="94" cy="30" r="8" fill={bear.accent} strokeWidth="3" />

        {/* Head -- squashed circle so every bear reads as slightly overfed */}
        <ellipse cx="60" cy="68" rx="49" ry="45" fill={bear.color} />

        {/* Cheeks */}
        <circle cx="24" cy="80" r="11" fill={bear.accent} opacity="0.55" stroke="none" />
        <circle cx="96" cy="80" r="11" fill={bear.accent} opacity="0.55" stroke="none" />

        {/* Muzzle */}
        <ellipse cx="60" cy="88" rx="30" ry="22" fill={bear.accent} />

        {/* Nose + mouth */}
        <ellipse cx="60" cy="78" rx="11" ry="8" fill="var(--bark)" stroke="none" />
        <path
          d="M60 86 v7 M60 93 q-8 7 -14 1 M60 93 q8 7 14 1"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* Eyes */}
        {variant === 0 && (
          <>
            <circle cx="43" cy="58" r="6.5" fill="var(--bark)" stroke="none" />
            <circle cx="77" cy="58" r="6.5" fill="var(--bark)" stroke="none" />
            <circle cx="45" cy="56" r="2.2" fill="var(--cream)" stroke="none" />
            <circle cx="79" cy="56" r="2.2" fill="var(--cream)" stroke="none" />
          </>
        )}
        {variant === 1 && (
          // Contented squint -- the face of a bear that has eaten enough.
          <>
            <path
              d="M36 59 q7 -8 14 0"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M70 59 q7 -8 14 0"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </>
        )}
        {variant === 2 && (
          // One eye closed: mid-blink, fully unbothered.
          <>
            <circle cx="43" cy="58" r="6.5" fill="var(--bark)" stroke="none" />
            <circle cx="45" cy="56" r="2.2" fill="var(--cream)" stroke="none" />
            <path
              d="M70 58 q7 7 14 0"
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </>
        )}
      </g>

      {/* Snoozing bears get Zs instead of a harsh red X. */}
      {sleeping && (
        <g
          fill="var(--bark)"
          fontFamily="var(--font-display)"
          fontWeight="800"
          stroke="none"
        >
          <text x="92" y="20" fontSize="20">
            z
          </text>
          <text x="104" y="34" fontSize="14">
            z
          </text>
        </g>
      )}
    </svg>
  )
}
