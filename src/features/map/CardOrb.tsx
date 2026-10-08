import { useEffect } from 'react'
import { animate, useMotionValue, useReducedMotion } from 'framer-motion'
import { WorldDots } from './WorldDots'

/**
 * The orb once it has arrived, drawn inside the card.
 *
 * `MapScene` flies it in over the top of everything, which is the only way it
 * can cross the page to get here — but once it is here it belongs *behind* the
 * card's text, where the mesh it replaces always sat. So the flying one is
 * swapped for this at the moment it lands. Same size, same place, same spin:
 * the hand-over is invisible, and the layering is right from then on.
 */
const SLOT = { x: 450, y: 157, w: 290, h: 280 }
/** Sized so `WorldDots`' own radius comes out at the slot's width. */
const W = (SLOT.w / 0.42 / 2) * (450 / 279)
const H = SLOT.w / 0.42 / 2

export function CardOrb({ show }: { show: boolean }) {
  const reveal = useMotionValue(1)
  const morph = useMotionValue(1)
  const spin = useMotionValue(0)
  const still = useReducedMotion()

  useEffect(() => {
    if (still || !show) return
    const run = animate(spin, Math.PI * 2, { duration: 34, ease: 'linear', repeat: Infinity })
    return () => run.stop()
  }, [spin, still, show])

  if (!show) return null

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      /* Held back a little: it is the card's texture, not its subject. */
      style={{
        left: SLOT.x + SLOT.w / 2 - W / 2,
        top: SLOT.y + SLOT.h / 2 - H / 2,
        opacity: 0.6,
      }}
    >
      <WorldDots
        width={W}
        height={H}
        reveal={reveal}
        morph={morph}
        spin={spin}
        colour="#dcf5f1"
        orbFrom="#dcf5f1"
        orbTo="#8fd3cc"
      />
    </div>
  )
}
