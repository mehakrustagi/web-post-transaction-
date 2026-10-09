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
export const EDGE_H = 780

/**
 * The edge, as one radial rather than a linear band.
 *
 * Two things were wrong with the band. It was a straight line across the
 * card, and it was translucent — so the heading and the receipt went on
 * showing through the colour, which is what made it read as a sheet laid
 * over the screen instead of part of it.
 *
 * Centring the gradient *above* the band fixes the first: every stop is then
 * an ellipse hanging over the card, so the colour reaches higher at the sides
 * than it does in the middle and its upper boundary dips through the centre.
 * That is the crescent. Nothing is drawn curved — the curve is the shape of
 * the stops.
 *
 * And every stop that carries colour is opaque. Only the part above the
 * crescent is clear, which is where the screen it is rising past belongs.
 *
 * The clear run reaches 41% because that is past the band's own top corners.
 * They sit further from a centre that is above the middle than the top edge
 * does, so a shorter run left them coloured right at the element boundary —
 * a hard horizontal line either side of the dip, which is the one thing a
 * crescent must not have.
 *
 * The colours are Figma's Tideline — #00CABA into #0476C6 — anchored at the
 * far end by the card's own #0E528D. Tideline is the one gradient in that set
 * already in our family: the eSIM card runs #0b5975 to #159d94, the same
 * blue-to-cyan walk a little further into the dark.
 */
const EDGE = `radial-gradient(142% 118% at 50% -24%,
  rgba(14,82,141,0) 0%,
  rgba(14,82,141,0) 41%,
  rgba(14,82,141,0.5) 47%,
  rgb(14,82,141) 54%,
  rgb(4,118,198) 63%,
  rgb(0,170,196) 72%,
  rgb(0,202,186) 79%,
  rgb(170,235,238) 87%,
  rgb(236,248,250) 94%,
  rgb(248,249,251) 99%,
  rgb(248,249,251) 100%)`

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
