import { useCallback, useEffect, useState } from 'react'

export type ViewMode = 'cards' | 'photos'

const STORAGE_KEY = 'fbw:view-mode'

function readStored(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'photos' ? 'photos' : 'cards'
  } catch {
    // Private windows and blocked site data both throw here. A guest who
    // cannot store a preference still gets a working ballot.
    return 'cards'
  }
}

/**
 * How the guest wants to see a matchup: `cards` puts the bio next to a small
 * face, `photos` drops the bio and makes the photo as big as the phone allows.
 *
 * Remembered per device, because it is a preference about eyesight and taste,
 * not about this round -- flipping it every matchup would be miserable.
 */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(readStored)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Not being able to remember it is not a reason to break the screen.
    }
  }, [mode])

  const choose = useCallback((next: ViewMode) => setMode(next), [])

  return [mode, choose]
}
