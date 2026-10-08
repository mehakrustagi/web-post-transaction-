import { useMotionValue, type MotionValue } from 'framer-motion'
import { WorldDots } from './WorldDots'

/**
 * The orb once it has arrived, drawn inside the card.
 *
 * The scene before this one flies it in over the top of everything, which is
 * the only way it can cross the page to get here — but once it is here it
 * belongs *behind* the card's text, where the mesh it replaces always sat. So
 * the flying one is swapped for this at the moment it lands.
 *
 * It is the same orb, and has to stay the same orb: the spin is handed in
 * rather than started here, so the sphere carries on turning through the swap
 * instead of snapping back to where it began, and the colours it arrives at
 * are the ones it is already wearing.
 */
const SLOT = { x: 450, y: 157, w: 290, h: 280 }
/** Sized so `WorldDots`' own radius comes out at the slot's width. */
const W = (SLOT.w / 0.42 / 2) * (450 / 279)
const H = SLOT.w / 0.42 / 2

export function CardOrb({ show, spin }: { show: boolean; spin: MotionValue<number> }) {
  const reveal = useMotionValue(1)
  const morph = useMotionValue(1)

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
