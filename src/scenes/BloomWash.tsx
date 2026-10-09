import { motion } from 'framer-motion'

/*
 * The light along the leading edge of the page as it comes up.
 *
 * Earlier passes had the colour as a thing in its own right — fields
 * drifting behind frost, then a dome sweeping over the card — and both were
 * the same misreading. In the reference the colour is not crossing the
 * screen at all: it is the top edge of the incoming page, and the white
 * under it is that page's own background. One surface rises, the glow rides
 * its edge, and nothing cross-fades with anything. That is the whole reason
 * it looks smooth.
 *
 * So this is only the edge. It is drawn above the surface it belongs to and
 * never displaces it, which is why it can be this tall: at rest it hangs
 * below the card as a glow at the foot, and by the time the page has landed
 * it is off the top.
 */

/** How far the glow reaches above the page it is attached to. */
export const EDGE_H = 620

/**
 * Bottom to top: the page's own white, the card's blue, its deep blue, and
 * out. Read in the direction of travel it is the reverse — you get the deep
 * end first, then the blue, then the white, and then the page is simply
 * there, which is the order the reference arrives in.
 */
const EDGE = `linear-gradient(to top,
  rgba(248,249,251,1) 0%,
  rgba(226,240,255,0.98) 12%,
  rgba(150,186,240,0.95) 28%,
  rgba(66,112,211,0.92) 46%,
  rgba(14,82,141,0.72) 64%,
  rgba(17,131,136,0.3) 82%,
  rgba(17,131,136,0) 100%)`

/**
 * Specks riding the edge, on their own slow periods. They travel with the
 * glow rather than sitting on the card, so the sparkle goes when it goes.
 * Deterministic, because a wash that twinkles differently every run is a
 * wash nobody can art-direct.
 */
const GLINTS = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return {
    x: 0.08 + r(1) * 0.84,
    y: 0.28 + r(2) * 0.46,
    d: 3 + r(3) * 5,
    dur: 2.4 + r(4) * 3.2,
    delay: r(5) * 3.4,
    rise: 26 + r(6) * 60,
  }
})

export function WashEdge({ show }: { show: boolean }) {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-0 w-full"
      style={{ top: -EDGE_H, height: EDGE_H, backgroundImage: EDGE }}
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
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
  )
}
