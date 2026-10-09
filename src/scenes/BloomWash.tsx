import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/*
 * The colour that takes the receipt away.
 *
 * It began as the onboarding build's post-payment wash — four soft fields
 * drifting behind a frosted veil — and that is not what this needed. A field
 * of blobs reads as weather; what this moment wants is one thing moving. So
 * it is a single dome now: a band of light far wider than the frame, so its
 * top edge crosses the card as a gentle arc rather than as a line, white at
 * the leading edge and falling back through the card's own blue into nothing.
 *
 * One element does all three jobs. Low, only its outer edge reaches the foot
 * of the card and that is the glow the printer works over. Risen, its core is
 * bright enough to cover the whole frame, which is the moment the page is
 * swapped underneath. Gone, it has carried the receipt off the top with it.
 */

/** The frame everything here is measured in. */
const FRAME_W = 1282
const FRAME_H = 915

/** How long the colour takes to come up and settle at the foot of the card. */
const RISE_MS = 900
/** The launch, and how far it goes — clear off the top, with the dome's own
 *  height to spare so nothing of its underside is left on screen. */
const FIRE_MS = 1400
const FIRE_Y = 1850
/**
 * And when, part-way up, the page underneath is swapped in.
 *
 * At the moment the dome's core is over the middle of the card, which is the
 * only moment there is nothing to see the swap happen against.
 */
const SWAP_MS = 420

/**
 * The dome.
 *
 * Wider than the frame by half again, because the arc is the whole point: a
 * band the width of the card has a flat top edge and reads as a wipe. The
 * colours are the eSIM card's own — #4270D3 into #0E528D, with #118388 at the
 * outer edge — behind a white core, which is what the light actually looks
 * like where it is brightest.
 */
const DOME_W = FRAME_W * 2.1
const DOME_H = FRAME_H * 1.55
const DOME = `radial-gradient(50% 50% at 50% 50%,
  rgba(255,255,255,0.97) 0%,
  rgba(226,240,255,0.95) 18%,
  rgba(142,180,240,0.9) 34%,
  rgba(66,112,211,0.82) 50%,
  rgba(14,82,141,0.52) 66%,
  rgba(17,131,136,0.2) 82%,
  rgba(17,131,136,0) 100%)`

/** Where its centre sits while it is only glowing, and once it has gone. */
/*
 * High enough that the card's own blue reaches the foot of it. At 0.42 only
 * the dome's outermost stops were on screen and the glow was a rumour.
 */
const LOW = FRAME_H + DOME_H * 0.31

/**
 * The glints.
 *
 * Specks of light riding the band, on their own slow periods. They travel
 * with it rather than sitting on the card, so the sparkle is in the colour
 * and goes when the colour goes. Deterministic, because a wash that twinkles
 * differently every run is a wash nobody can art-direct.
 */
const GLINTS = Array.from({ length: 18 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return {
    x: 0.12 + r(1) * 0.76,
    y: 0.3 + r(2) * 0.26,
    d: 3 + r(3) * 5,
    dur: 2.4 + r(4) * 3.2,
    delay: r(5) * 3.6,
    rise: 30 + r(6) * 70,
  }
})

type Beat = 'idle' | 'fired' | 'gone'

export function BloomWash({
  cook,
  fire,
  onFired,
}: {
  /** Glow at the foot of the card. */
  cook: boolean
  /** And go. */
  fire: boolean
  /** Called part-way up, under the core, for the page to be swapped in. */
  onFired?: () => void
}) {
  const [beat, setBeat] = useState<Beat>('idle')
  const still = useReducedMotion()

  useEffect(() => {
    if (!fire || beat !== 'idle') return
    setBeat('fired')
  }, [fire, beat])

  useEffect(() => {
    if (beat !== 'fired') return
    const swap = window.setTimeout(() => onFired?.(), SWAP_MS)
    const done = window.setTimeout(() => setBeat('gone'), FIRE_MS)
    return () => {
      window.clearTimeout(swap)
      window.clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat])

  const fired = beat === 'fired' || beat === 'gone'
  const active = cook || fired

  if (still || beat === 'gone') return null

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[40px]"
      style={{ zIndex: fired ? 4 : 1 }}
    >
      <motion.div
        className="absolute"
        style={{
          left: (FRAME_W - DOME_W) / 2,
          top: LOW - DOME_H / 2,
          width: DOME_W,
          height: DOME_H,
          backgroundImage: DOME,
          transformOrigin: '50% 100%',
        }}
        initial={{ y: 90, opacity: 0 }}
        animate={
          !active
            ? { y: 90, opacity: 0 }
            : fired
              ? {
                  y: -FIRE_Y,
                  opacity: 1,
                  /* It stretches as it goes and recovers at the top — the
                     smear of something moving faster than it can hold its
                     shape. A rigid band travelling the same distance reads
                     as a slide. */
                  scaleY: [1, 1.18, 1.04],
                }
              : { y: 0, opacity: 1, scaleY: 1 }
        }
        transition={
          fired
            ? {
                y: { duration: FIRE_MS / 1000, ease: [0.55, 0, 0.25, 1] },
                scaleY: { duration: FIRE_MS / 1000, ease: 'easeOut' },
                opacity: { duration: 0.3 },
              }
            : { duration: RISE_MS / 1000, ease: [0.33, 0, 0.2, 1] }
        }
      >
        {GLINTS.map((g, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${g.x * 100}%`,
              top: `${g.y * 100}%`,
              width: g.d,
              height: g.d,
              background:
                'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(236,252,255,0.55) 45%, rgba(255,255,255,0) 100%)',
            }}
            animate={{ opacity: [0, 0.85, 0], y: [0, -g.rise], scale: [0.7, 1.15, 0.8] }}
            transition={{
              duration: g.dur,
              delay: g.delay,
              repeat: Infinity,
              repeatDelay: 0.9,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>
    </div>
  )
}
