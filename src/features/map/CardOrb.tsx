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
 *
 * It is also mounted before it is wanted and only revealed at the swap. A
 * canvas that mounts at the moment it is shown has nothing on it for the first
 * frame or two, which read as the orb blinking out and coming back.
 */
const SLOT = { x: 450, y: 157, w: 290, h: 280 }

export function CardOrb({
  show,
  spin,
  canvas,
}: {
  show: boolean
  spin: MotionValue<number>
  /** The canvas and scale the scene before this one was drawing, verbatim. */
  canvas: { w: number; h: number; scale: number }
}) {
  const reveal = useMotionValue(1)
  const morph = useMotionValue(1)

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      /* Held back a little: it is the card's texture, not its subject. */
      style={{
        left: SLOT.x + SLOT.w / 2 - canvas.w / 2,
        top: SLOT.y + SLOT.h / 2 - canvas.h / 2,
        width: canvas.w,
        height: canvas.h,
        transform: `scale(${canvas.scale})`,
        transformOrigin: '50% 50%',
        opacity: show ? 0.6 : 0,
      }}
    >
      <WorldDots
        width={canvas.w}
        height={canvas.h}
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
