/** Paw print, used as a UI accent: dividers, bullets, button glyphs. */
export function PawPrint({
  size = 20,
  color = 'var(--bark)',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      focusable="false"
    >
      <g fill={color}>
        <ellipse cx="20" cy="26" rx="11" ry="9.5" />
        <circle cx="8" cy="14" r="4.6" />
        <circle cx="16" cy="8.5" r="4.6" />
        <circle cx="24" cy="8.5" r="4.6" />
        <circle cx="32" cy="14" r="4.6" />
      </g>
    </svg>
  )
}

/** A little row of paws to break up sections. */
export function PawDivider({ count = 3 }: { count?: number }) {
  return (
    <div className="paw-divider" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          style={{ transform: `rotate(${(i - (count - 1) / 2) * 18}deg)` }}
        >
          <PawPrint size={18} color="var(--fur)" />
        </span>
      ))}
    </div>
  )
}
