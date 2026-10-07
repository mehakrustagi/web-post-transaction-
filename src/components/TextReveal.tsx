import { memo, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ShimmerText } from './ShimmerText'

/*
 * Aceternity's text-reveal-card, taken off its mouse.
 *
 * The mechanic is theirs: two copies of the same line stacked, the bright one
 * clipped from the right, and a thin bar riding the clip edge like a scanner.
 * In the original the clip tracks the cursor; here nothing is hovering it, so
 * it runs itself once when the line arrives and stays revealed.
 *
 * Their version paints the revealed copy on an opaque panel so it covers the
 * dim one. That would be a block of flat colour on this card, and it is not
 * needed: both copies are the same glyphs in the same place, so clipping the
 * bright one over the dim one reveals it with nothing behind.
 */
/** A beat to read the line unrevealed, then twice that to reveal it. */
const HOLD = 1
const SWEEP = 2
const STARS = 115
/** How long one speck takes to wander its little path and come back. */
const DRIFT = 4

/**
 * The particle field, after Aceternity's `MemoizedStars`.
 *
 * Theirs tweens each speck once to a single random point over 20–30s, at one
 * flat size and one flat colour, which on their 40rem panel reads as a slow
 * field and on one 44px line reads as frozen dirt. These are particles: a
 * spread of sizes, each with its own glow, wandering three waypoints and
 * mirroring back over four seconds, each on its own clock so the field never
 * breathes in unison.
 */
const Stars = memo(function Stars() {
  const specks = useMemo(
    () =>
      Array.from({ length: STARS }, () => {
        /* Weighted small: a few big ones carry the field, the rest are dust. */
        const size = 1.1 + Math.pow(Math.random(), 2.2) * 3.4
        return {
          top: Math.random() * 100,
          left: Math.random() * 100,
          size,
          /* A short wander, a few pixels across, that never repeats the same way. */
          dx: Array.from({ length: 3 }, () => Math.random() * 10 - 5),
          dy: Array.from({ length: 3 }, () => Math.random() * 8 - 4),
          peak: 0.45 + Math.random() * 0.55,
          delay: Math.random() * DRIFT,
        }
      }),
    [],
  )

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 block">
      {specks.map((s, i) => (
        <motion.span
          key={i}
          className="absolute block rounded-full bg-white"
          style={{
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            boxShadow: `0 0 ${2 + s.size * 2.2}px rgba(255,255,255,.7)`,
          }}
          animate={{
            x: [0, ...s.dx, 0],
            y: [0, ...s.dy, 0],
            opacity: [0, s.peak, s.peak * 0.45, s.peak, 0],
            scale: [0.5, 1, 1.25, 1, 0.5],
          }}
          transition={{
            duration: DRIFT,
            delay: s.delay,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  )
})

export function TextReveal({
  text,
  className = '',
  delay = 0,
  stars = true,
}: {
  text: string
  className?: string
  delay?: number
  /**
   * The dust belongs to the frame the line is revealed on and nowhere else.
   * The same element carries this headline through two more frames, where it
   * is just a headline, so the field is faded off rather than unmounted.
   */
  stars?: boolean
}) {
  const still = useReducedMotion()
  const sweep = still
    ? { duration: 0 }
    : { delay: delay + HOLD, duration: SWEEP, ease: [0.5, 0, 0.2, 1] as const }

  return (
    <span className={`relative block ${className}`}>
      {/*
        The line before it is read: present, but barely, over a drift of dust.
        Masked top and bottom so both fade out of the card rather than sitting
        in a band on it.
      */}
      <span
        className="relative block overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, white 28%, white 72%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, white 28%, white 72%, transparent)',
        }}
      >
        <span
          aria-hidden
          className="relative block bg-clip-text text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,.2), rgba(255,255,255,.28))',
          }}
        >
          {text}
        </span>
      </span>

      {/*
        The field. Outside the text's own clipping box, so particles drift
        around the line rather than only inside the band it occupies, and
        clipped to the *complement* of the reveal — the dust sits on the part
        of the line that has not been read yet, and the sweep wipes it off as
        it goes.
      */}
      {!still && (
        <motion.span
          className="pointer-events-none absolute inset-x-0 block"
          style={{
            top: -20,
            bottom: -20,
            maskImage: 'linear-gradient(to bottom, transparent, white 24%, white 76%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent, white 24%, white 76%, transparent)',
          }}
          initial={false}
          animate={{ opacity: stars ? 1 : 0 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          <motion.span
            className="absolute inset-0 block"
            initial={{ clipPath: 'inset(0 0 0 0%)' }}
            animate={{ clipPath: 'inset(0 0 0 100%)' }}
            transition={sweep}
          >
            <Stars />
          </motion.span>
        </motion.span>
      )}

      {/* The line once it has been. */}
      <motion.span
        className="absolute inset-0 block"
        initial={{ clipPath: 'inset(0 100% 0 0)' }}
        animate={{ clipPath: 'inset(0 0% 0 0)' }}
        transition={sweep}
      >
        <ShimmerText text={text} />
      </motion.span>

      {/* The edge doing the revealing. */}
      {!still && (
        <motion.span
          aria-hidden
          className="absolute top-0 h-full w-[7px]"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, transparent, rgba(255,255,255,.55), transparent)',
            filter: 'blur(1px)',
          }}
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
          transition={{ ...sweep, opacity: { ...sweep, times: [0, 0.08, 0.88, 1] } }}
        />
      )}
    </span>
  )
}
