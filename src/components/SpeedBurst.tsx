import { motion, useReducedMotion } from 'framer-motion'

/*
 * The burst behind the headline (443:17561).
 *
 * In the file it is a video fill, so there is nothing to export — it is built
 * here instead. Which is no loss: a ring of slivers radiating from a point is
 * geometry, and generated it can be centred on the line it is going off behind
 * rather than on wherever a 1284-wide still happens to put its middle.
 */

/** Deterministic, because the burst has to be the same burst every run. */
function seeded(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Half the viewBox. The rays run well past the card and are clipped by it. */
const R = 1300
const RAYS = 170

const rays = (() => {
  const rnd = seeded(20251008)
  const out: string[] = []
  for (let i = 0; i < RAYS; i++) {
    /*
     * Scattered, not spoked. Evenly spaced rays read as a sunburst graphic;
     * what makes this look like speed is that the gaps are uneven, so the eye
     * cannot find the pattern and reads the whole thing as motion.
     */
    const a = (i / RAYS) * Math.PI * 2 + (rnd() - 0.5) * 0.09
    /*
     * The hole in the middle, which is what the headline sits in. Varied, so
     * the rays do not all begin on one circle — that circle would be the only
     * thing anybody saw.
     */
    const r0 = 250 + rnd() * 330
    const r1 = r0 + 420 + rnd() * 780
    /* Thin at the near end and wider at the far one: a sliver thrown outward,
       not a spoke of a wheel. */
    const w0 = 0.0007 + rnd() * 0.0016
    const w1 = w0 * (2.2 + rnd() * 3.4)
    const p = (r: number, t: number) => `${(Math.cos(t) * r).toFixed(1)} ${(Math.sin(t) * r).toFixed(1)}`
    out.push(`M${p(r0, a - w0)}L${p(r1, a - w1)}L${p(r1, a + w1)}L${p(r0, a + w0)}Z`)
  }
  return out
})()

/**
 * A flash, not a backdrop. It arrives with the line, is over inside a second,
 * and at 7% it is never more than something the eye catches at the edge of the
 * moment the headline lands.
 */
export function SpeedBurst({ at, cx, cy }: { at: number; cx: number; cy: number }) {
  const still = useReducedMotion()
  if (still) return null
  return (
    <motion.svg
      className="pointer-events-none absolute"
      style={{ left: cx - R, top: cy - R, width: R * 2, height: R * 2 }}
      viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}
      aria-hidden
      initial={{ opacity: 0, scale: 0.84 }}
      animate={{ opacity: [0, 0.18, 0.18, 0], scale: 1.08 }}
      transition={{
        delay: at,
        duration: 1.05,
        ease: 'easeOut',
        /* Snaps in with the line and leaves slowly, which is the shape of a
           flash — the reverse of it reads as a thing being switched off. */
        // 7% was faithful to the file and all but invisible on a card this
        // light. At 18% it is still only something caught at the edge of the
        // moment, but it is something.
        opacity: { delay: at, duration: 1.05, times: [0, 0.16, 0.42, 1], ease: 'linear' },
      }}
    >
      {/*
        The wash the rays sit in. Barely a colour at this weight, but without
        it the slivers are unattached to anything and read as scratches.
      */}
      <defs>
        <radialGradient id="burstWash">
          <stop offset="0.25" stopColor="#D8EADF" stopOpacity="0" />
          <stop offset="1" stopColor="#D8EADF" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect x={-R} y={-R} width={R * 2} height={R * 2} fill="url(#burstWash)" />
      <g fill="#FFFFFF">
        {rays.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
    </motion.svg>
  )
}
