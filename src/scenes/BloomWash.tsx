import { motion } from 'framer-motion'

/*
 * The light along the leading edge of the page as it comes up.
 *
 * The colour is not crossing the screen: it is the top edge of the incoming
 * page, and the white under it is that page's own background. One surface
 * moves, the glow rides its edge, and nothing cross-fades with anything —
 * which is the whole reason it reads as smooth.
 *
 * The gradient itself is the design's (Evisa 4923:11865 and 4923:11866), and
 * it is one gradient in two strengths rather than two gradients. At rest it
 * is barely there — the spectrum at a third of itself, which is the wash in
 * the first frame. As the slip is cut it comes up to full and rises, which is
 * the second. Same stops, same shape, same object.
 */

/** The canvas it moves on. */
const FRAME_H = 915
/** How tall the band is. */
export const EDGE_H = 660
/**
 * And the two places it is ever in.
 *
 * Parked, only its top arc is on the canvas — that is the glow at the foot
 * while the printer works. Gone, it is clear of the top. One element, one
 * axis, one range: the band is not attached to the page and the page does not
 * move, so neither has to know anything about the other.
 */
const PARK = FRAME_H - 180
/**
 * And where it stops.
 *
 * Not off the canvas. The wash across the top of the design's last frame is
 * not a second gradient left behind by the first — it is this one, still on
 * screen, with most of itself above the top edge and its tail lying across
 * the page. Travelling all the way off and handing over to a stationary copy
 * is two gradients pretending to be one.
 */
const GONE = -EDGE_H + 250

/**
 * The spectrum, sampled off the design: indigo through blue and violet into
 * magenta and coral. It runs across the card rather than down it — the dome
 * below is what gives it a top edge, so this only has to carry the hues.
 */
const SPECTRUM = `linear-gradient(97deg,
  #555896 0%,
  #4552BF 13%,
  #5384E7 29%,
  #748AE9 41%,
  #AB66D7 57%,
  #DD5995 75%,
  #ED8A71 91%,
  #F2AC92 100%)`

/**
 * And the shape of it.
 *
 * An ellipse centred just below the band, so every iso-line is an arc that
 * rides highest through the middle and falls away to the sides. That dome is
 * the top edge in the design, and masking the spectrum with it means the
 * colour never has a straight boundary anywhere — the band is a rectangle and
 * nothing about it reads as one.
 *
 * Solid until 63% of the way out, though. The fall-off is the arc's edge, not
 * the arc: with the mask fading from the very centre the band was translucent
 * across most of itself and the receipt went on showing through the colour,
 * which is the thing that made it look pasted on in the first place.
 */
const DOME = `radial-gradient(122% 96% at 50% 112%,
  rgba(0,0,0,1) 0%,
  rgba(0,0,0,1) 63%,
  rgba(0,0,0,0.86) 73%,
  rgba(0,0,0,0.5) 84%,
  rgba(0,0,0,0.18) 93%,
  rgba(0,0,0,0) 100%)`

/** How the colour lets go of the page it is riding on. */
const FOOT =
  'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 78%, rgba(0,0,0,0.55) 90%, rgba(0,0,0,0) 100%)'

/** How much of itself it shows while the printer is still working. */
const REST = 0.34

/**
 * Specks riding the edge, on their own slow periods. They travel with the
 * glow rather than sitting on the card, so the sparkle goes when it goes.
 * Deterministic, because a wash that twinkles differently every run is a
 * wash nobody can art-direct.
 */
const GLINTS = Array.from({ length: 14 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return {
    x: 0.1 + r(1) * 0.8,
    y: 0.42 + r(2) * 0.4,
    d: 3 + r(3) * 4,
    dur: 2.4 + r(4) * 3.2,
    delay: r(5) * 3.4,
    rise: 24 + r(6) * 56,
  }
})

export function WashEdge({ show, full }: { show: boolean; full: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 w-full overflow-hidden"
      style={{
        top: 0,
        height: EDGE_H,
        zIndex: 3,
        maskImage: DOME,
        WebkitMaskImage: DOME,
      }}
      initial={{ y: PARK, opacity: 0 }}
      /*
       * In and out on the same terms.
       *
       * It comes up to full as the cut gives, and then eases most of the way
       * back down while it is still travelling — so what leaves the top of
       * the card is the same whisper that arrived at the foot of it, not a
       * saturated band being yanked off screen. The curve is the entry's,
       * reversed and a little longer, because something slowing down should
       * take longer than the same thing speeding up.
       */
      animate={{
        y: full ? GONE : PARK,
        opacity: show ? (full ? [REST, 1, 1, REST * 1.1] : REST) : 0,
      }}
      transition={
        full
          ? {
              y: { duration: 1.5, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 1.5, times: [0, 0.22, 0.52, 1], ease: [0.3, 0, 0.25, 1] },
            }
          : { duration: 0.9, ease: [0.33, 0, 0.2, 1] }
      }
    >
      {/*
        Wider than the band and drifting, so the hues move through it rather
        than sitting still. It is slow enough that you never catch it moving,
        which is the point — a gradient that holds one arrangement reads as a
        picture of a gradient.
      */}
      <motion.div
        className="absolute inset-y-0"
        style={{
          left: '-22%',
          width: '144%',
          backgroundImage: SPECTRUM,
          /*
           * And out at its own foot, into the page it is attached to.
           *
           * The dome gives the colour its arc along the top and leaves the
           * bottom solid — which is right while the band is over the card,
           * and wrong at the one place it meets the page: full saturation
           * ending against the page's white is a hard line across the card,
           * and that line is what you see the exit get cut by. Faded over
           * its last fifth there is no edge there at all.
           */
          maskImage: FOOT,
          WebkitMaskImage: FOOT,
        }}
        animate={{ x: ['0%', '6%', '-4%', '0%'] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
      />
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
              'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 45%, rgba(255,255,255,0) 100%)',
          }}
          animate={{ opacity: [0, 0.8, 0], y: [0, -g.rise], scale: [0.7, 1.15, 0.8] }}
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
  )
}
