import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Floor on the shrinking. A real TV never gets near it -- it exists for the
 * laptop window that is 600px tall, where the box scrolls the last little bit
 * rather than shrinking the bears into nothing.
 */
const MIN_SCALE = 0.3

/**
 * Shrink content until it fits the height of its box.
 *
 * The TV is the one screen nobody can scroll: whatever is on it has to be on
 * it all at once, on a 16:9 projector, an ultrawide, or a laptop in a corner.
 * Media queries cannot do this, because the overflow depends on how many
 * matchups the round happens to have, not on the viewport alone. So measure
 * the content and scale it down by however much it overshoots.
 *
 * Every measurement is taken with the transform off, so what comes back never
 * depends on the scale already applied and each pass cannot feed the next.
 *
 * @param enabled false on phones, where scrolling is the right answer
 * @param signature changes whenever the content might have resized
 * @param widen widen the content by the factor it is shrunk by, so it still
 *   fills the screen sideways. Right for a bracket that spans the screen;
 *   wrong for a centred card, which should simply get smaller.
 */
export function useFitScale<B extends HTMLElement, C extends HTMLElement>(
  enabled: boolean,
  signature: string,
  widen = true
) {
  const boxRef = useRef<B | null>(null)
  const contentRef = useRef<C | null>(null)
  const [scale, setScale] = useState(1)

  const measure = useCallback(() => {
    const box = boxRef.current
    const content = contentRef.current
    if (!box || !content) return

    if (!enabled) {
      setScale(1)
      return
    }

    const available = box.clientHeight
    if (available <= 0) return

    const transform = content.style.transform
    const width = content.style.width
    content.style.transform = 'none'

    /*
     * Scale and width are coupled: the content is widened by the same factor it
     * is shrunk by, so it still fills the screen sideways -- and a wider
     * bracket wraps its cards differently, which changes its height, which
     * changes the scale it needs. Solving that by iterating "what scale does
     * this height ask for" oscillates, because the answer moves the question.
     *
     * So search instead of solve. Each candidate is laid out at the width it
     * implies and measured there, which means the scale we settle on is one
     * that was actually seen to fit rather than one inferred from a different
     * layout. Seven passes narrows [MIN_SCALE, 1] to under a percent.
     */
    // scrollHeight covers content that spills out of the box; offsetHeight
    // covers the box's own borders. A bordered card needs the larger of the
    // two, or it comes back a dozen pixels short and clips its last line.
    const heightOf = () => Math.max(content.scrollHeight, content.offsetHeight)

    const fits = (candidate: number) => {
      if (widen) content.style.width = `${100 / candidate}%`
      return heightOf() * candidate <= available
    }

    let next = MIN_SCALE
    if (fits(1)) {
      next = 1
    } else if (!widen) {
      // Nothing reflows, so the height is fixed and the scale is arithmetic.
      next = Math.max(MIN_SCALE, available / heightOf())
    } else {
      let low = MIN_SCALE
      let high = 1
      for (let pass = 0; pass < 7; pass += 1) {
        const mid = (low + high) / 2
        if (fits(mid)) {
          next = mid
          low = mid
        } else {
          high = mid
        }
      }
    }

    content.style.transform = transform
    content.style.width = width

    // Round down to whole percents: a sub-pixel wobble between polls would
    // otherwise re-render the whole bracket every two seconds. Rounding down
    // only ever widens the layout further, which cannot make it taller.
    setScale(next >= 1 ? 1 : Math.max(MIN_SCALE, Math.floor(next * 100) / 100))
  }, [enabled, widen])

  useLayoutEffect(measure, [measure, signature])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return

    // Only the box is observed. Watching the content too would react to the
    // scaling this hook just did, which is a loop.
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    window.addEventListener('resize', measure)

    // Display faces land after first paint and change every text height.
    document.fonts?.ready.then(measure).catch(() => {})

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  return { boxRef, contentRef, scale }
}
