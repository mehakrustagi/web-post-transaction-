import { useEffect, useMemo } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { PAPER_H, PAPER_W, PaperFace } from '../components/Receipt'
import { flapPath, paperClip } from '../components/PrintRig'
import { WorldDots } from '../features/map/WorldDots'
import { arc, place, ROUTES, VIETNAM } from '../features/map/arcs'
import { MAP_ASPECT } from '../features/map/dots'
import { SparklesCore } from '../components/ui/sparkles'

/**
 * Where the printer leaves the slip, and where it ends up once it has turned.
 * The first is not a choice — it is where `PrintRig` puts it — and the slip
 * travels between the two as it turns, so the hand-over is one movement.
 */
const REST = { cx: 641, cy: 616 }
const SLIP = { cx: 455, cy: 560 }
/** Far enough left that the turned slip is off the card. */
const LEAVE_X = -(REST.cx + PAPER_H / 2)
const LINE_X = SLIP.cx + PAPER_H / 2
const MAP = { x: LINE_X, y: SLIP.cy, w: 450 }
/** The frame's own middle, which is where the orb gathers. */
const FRAME = { cx: 641, cy: 457.5 }
/**
 * And where it finally sits: the slot the eSIM card keeps for its artwork
 * (438:16720), in the page's coordinates. It grows a little on the way in —
 * the card is 785 wide, so 290 across is bigger there than it was on the frame.
 */
const CARD_SLOT = { cx: 876, cy: 634, d: 290 }
/**
 * The card's own rectangle on the frame. Once the orb is in it, it is clipped
 * by it — the artwork slot runs off the bottom of the card in the design, and
 * a sphere hanging out past the edge would read as sitting on top of the card
 * rather than being part of it.
 */
const CARD_CLIP = 'inset(337px 216px 278px 281px round 24px)'
const NO_CLIP = 'inset(0px 0px 0px 0px round 0px)'
const MAP_H = MAP.w * MAP_ASPECT
/** The canvas is taller than the map, to leave the orb room to turn in. */
const CANVAS_H = MAP.w * 0.62

/** How long each part of the translation takes. */
const TURN_S = 1.1
const SCAN_S = 2.6
const ARCS_S = 1.8
const GATHER_S = 1.9
const SETTLE_S = 1.3

export type MapBeat = 'turn' | 'scan' | 'routes' | 'orb' | 'card'

const ORDER: MapBeat[] = ['turn', 'scan', 'routes', 'orb', 'card']
/** The orb's own width on the canvas, from `WorldDots`' own radius. */
const ORB_D = Math.min(MAP.w, MAP.w * 0.62) * 0.42 * 2
const at = (beat: MapBeat, stop: MapBeat) => ORDER.indexOf(beat) >= ORDER.indexOf(stop)

/**
 * The slip becomes the world.
 *
 * It turns on its side, a line comes down its edge, and the line walks right
 * across the card printing the map behind it — the same vertical edge and the
 * same dust as the headline reveal, because it is the same idea: something is
 * being read off one thing and written onto another. Then the routes draw, the
 * country lights up, and the map's dots gather into the orb.
 */
export function MapScene({ beat, onOrb }: { beat: MapBeat; onOrb?: () => void }) {
  const still = useReducedMotion()
  const reveal = useMotionValue(0)
  const morph = useMotionValue(0)
  const spin = useMotionValue(0)

  const scanning = at(beat, 'scan')
  const routed = at(beat, 'routes')
  const orbed = at(beat, 'orb')
  const carded = at(beat, 'card')

  /* Where the canvas has to go for the orb to land where it is wanted. */
  const natural = { x: LINE_X + MAP.w / 2, y: MAP.y }
  const target = carded ? CARD_SLOT : { cx: FRAME.cx, cy: FRAME.cy }
  const to = {
    x: orbed ? ('cx' in target ? target.cx : 0) - natural.x : 0,
    y: orbed ? ('cy' in target ? target.cy : 0) - natural.y : 0,
    scale: carded ? CARD_SLOT.d / ORB_D : 1,
  }

  /*
   * Every dot is drawn from the start; what changes is where the canvas is.
   * The map is not painted in place behind a travelling brush — it comes out
   * of the seam, which is a fixed thing the card is being fed through.
   */
  useEffect(() => {
    reveal.set(1)
  }, [reveal])

  useEffect(() => {
    if (still) return
    const run = animate(morph, orbed ? 1 : 0, { duration: GATHER_S, ease: [0.5, 0, 0.2, 1] })
    return () => run.stop()
  }, [orbed, morph, still])

  useEffect(() => {
    if (still || !orbed) return
    /* Once it is a sphere it keeps turning, slowly, for as long as it is one. */
    const run = animate(spin, Math.PI * 2, {
      duration: 34,
      ease: 'linear',
      repeat: Infinity,
      delay: GATHER_S * 0.5,
    })
    const done = window.setTimeout(() => onOrb?.(), GATHER_S * 1000)
    return () => {
      run.stop()
      clearTimeout(done)
    }
  }, [orbed, spin, still, onOrb])

  const flap = useMemo(() => flapPath(PAPER_W), [])

  const routes = useMemo(() => {
    const hub = place(VIETNAM.lat, VIETNAM.lng)
    return ROUTES.map((r) => arc(place(r.lat, r.lng), hub, MAP.w, MAP_H))
  }, [])

  const hub = place(VIETNAM.lat, VIETNAM.lng)

  return (
    <motion.div
      className="absolute inset-0"
      initial={false}
      animate={{ clipPath: carded ? CARD_CLIP : NO_CLIP }}
      transition={{ duration: SETTLE_S * 0.8, ease: [0.5, 0, 0.2, 1] }}
    >
      {/*
        The slip, on its side. It keeps the face it was printed with — this is
        the same sheet, turned, not a picture of one.
      */}
      <motion.div
        className="absolute"
        style={{
          left: REST.cx - PAPER_W / 2,
          top: REST.cy - PAPER_H / 2,
          width: PAPER_W,
          height: PAPER_H,
          transformOrigin: '50% 50%',
          filter: 'drop-shadow(0 3px 4px rgba(20,22,35,.07)) drop-shadow(0 28px 36px rgba(20,22,35,.14))',
        }}
        initial={{ rotate: 0, x: 0, y: 0, opacity: 1 }}
        animate={{
          rotate: -90,
          /*
           * It turns, and then it goes. The map is not appearing beside the
           * slip, it is taking its place — so the slip leaves to the left
           * while the line is still writing, and the card is handed over.
           */
          x: scanning ? LEAVE_X : SLIP.cx - REST.cx,
          y: SLIP.cy - REST.cy,
          opacity: scanning ? 0 : 1,
        }}
        transition={{
          default: { duration: TURN_S, ease: [0.4, 0, 0.2, 1] },
          x: scanning
            ? { delay: SCAN_S * 0.3, duration: SCAN_S * 0.8, ease: [0.5, 0, 0.3, 1] }
            : { duration: TURN_S, ease: [0.4, 0, 0.2, 1] },
          opacity: scanning
            ? { delay: SCAN_S * 0.45, duration: SCAN_S * 0.55, ease: 'easeIn' }
            : { duration: 0.3 },
        }}
      >
        {/*
          The same sheet that came out of the printer: the torn top and foot
          and the curled corner are `PrintRig`'s own geometry, not a second
          drawing of a receipt that happens to look similar.
        */}
        <svg
          className="absolute left-0 top-0"
          style={{ width: PAPER_W, height: flap.height }}
          viewBox={`0 0 ${PAPER_W} ${flap.height}`}
          aria-hidden
        >
          <defs>
            <linearGradient id="turnedFold" gradientUnits="userSpaceOnUse" {...flap.grad}>
              <stop offset="0" stopColor="#E4E4E9" />
              <stop offset=".45" stopColor="#F7F7F9" />
              <stop offset="1" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>
          <path d={flap.d} fill="url(#turnedFold)" />
        </svg>
        <div
          className="paper relative"
          style={{ width: PAPER_W, height: PAPER_H, clipPath: paperClip(PAPER_W, PAPER_W, true) }}
        >
          <PaperFace />
        </div>
      </motion.div>

      {/* The map, printed in behind the line. */}
      {/*
        The map comes out of the seam. The box is clipped at the line and the
        canvas slides right out of it, so the world is extruded rather than
        drawn — and the clip is dropped once it is all out, because the orb
        then has to travel left past the line to the middle of the card.
      */}
      <div
        className="absolute"
        style={{
          left: LINE_X,
          top: MAP.y - CANVAS_H / 2,
          width: 1282 - LINE_X,
          height: CANVAS_H,
          overflow: routed ? 'visible' : 'hidden',
        }}
      >
        <motion.div
          className="absolute left-0 top-0"
          initial={{ x: -MAP.w }}
          /* One x, two jobs: coming out of the seam, then carrying the orb. */
          animate={{ ...to, x: orbed ? to.x : scanning ? 0 : -MAP.w }}
          transition={{
            x: { duration: SCAN_S, ease: [0.4, 0, 0.25, 1] },
            default: { duration: carded ? SETTLE_S : GATHER_S, ease: [0.5, 0, 0.2, 1] },
          }}
        >
          <WorldDots
            width={MAP.w}
            height={CANVAS_H}
            reveal={reveal}
            morph={morph}
            spin={spin}
            /* Grey on the card it is printed on, pale once it is on the teal. */
            colour={carded ? '#bfe9e4' : '#8d939a'}
            orbColour={carded ? '#8fd3cc' : '#70767d'}
          />
        </motion.div>
      </div>

      {/* The routes, once there is a map to draw them on. */}
      <motion.svg
        className="pointer-events-none absolute"
        style={{ left: MAP.x, top: MAP.y - MAP_H / 2 }}
        width={MAP.w}
        height={MAP_H}
        aria-hidden
        initial={false}
        animate={{ x: to.x, y: to.y, opacity: orbed ? 0 : 1 }}
        transition={{
          default: { duration: GATHER_S, ease: [0.5, 0, 0.2, 1] },
          opacity: { duration: 0.55, ease: 'easeInOut' },
        }}
      >
        <defs>
          <linearGradient id="arcInk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c08a4a" stopOpacity="0" />
            <stop offset="0.25" stopColor="#c08a4a" />
            <stop offset="1" stopColor="#8a5a2b" />
          </linearGradient>
        </defs>
        {routes.map((r, i) => (
          <motion.path
            key={i}
            d={r.d}
            fill="none"
            stroke="url(#arcInk)"
            strokeWidth={1.1}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: routed && !orbed ? 1 : 0,
              opacity: routed && !orbed ? 1 : 0,
            }}
            transition={{
              pathLength: { duration: ARCS_S, delay: i * 0.16, ease: [0.4, 0, 0.3, 1] },
              opacity: { duration: 0.5, delay: routed ? i * 0.16 : 0 },
            }}
          />
        ))}
        {routes.map((r, i) => (
          <motion.circle
            key={`end-${i}`}
            cx={r.ax}
            cy={r.ay}
            r={2.4}
            fill="#c08a4a"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: routed && !orbed ? 1 : 0, opacity: routed && !orbed ? 1 : 0 }}
            transition={{ duration: 0.4, delay: routed && !orbed ? ARCS_S * 0.75 + i * 0.16 : 0 }}
            style={{ transformOrigin: `${r.ax}px ${r.ay}px` }}
          />
        ))}

        {/* The country the whole thing is about, lighting up. */}
        <motion.circle
          cx={hub.x * MAP.w}
          cy={hub.y * MAP.w}
          r={3.4}
          fill="#e0a35c"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: routed && !orbed ? 1 : 0, opacity: routed && !orbed ? 1 : 0 }}
          transition={{ duration: 0.5, delay: routed && !orbed ? 0.2 : 0 }}
          style={{ transformOrigin: `${hub.x * MAP.w}px ${hub.y * MAP.w}px` }}
        />
        {routed && !orbed && (
          <motion.circle
            cx={hub.x * MAP.w}
            cy={hub.y * MAP.w}
            r={3.4}
            fill="none"
            stroke="#e0a35c"
            strokeWidth={1}
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 6, opacity: 0 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            style={{ transformOrigin: `${hub.x * MAP.w}px ${hub.y * MAP.w}px` }}
          />
        )}
      </motion.svg>

      <Seam beat={beat} />
    </motion.div>
  )
}

/**
 * The seam the card is fed through.
 *
 * It does not move. The slip goes out to the left of it and the world comes
 * out to the right, which is the whole idea — a fixed edge with two things
 * crossing it in opposite directions reads as one becoming the other, where a
 * travelling brush just reads as drawing.
 *
 * The rule and its sparkles are Aceternity's `sparkles` demo, at this scale
 * and turned on its side.
 */
function Seam({ beat }: { beat: MapBeat }) {
  const lit = at(beat, 'scan')
  const gone = at(beat, 'routes')

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: LINE_X - 60, top: SLIP.cy - 210, width: 120, height: 420 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: gone ? 0 : lit ? 1 : 0.5 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
    >
      {/* The rule: a hard line with a soft one bloomed behind it. */}
      <span
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, transparent, rgba(60,64,70,.5) 22%, rgba(60,64,70,.5) 78%, transparent)',
        }}
      />
      <span
        className="absolute inset-y-10 left-1/2 w-[3px] -translate-x-1/2 blur-sm"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, transparent, rgba(90,96,104,.45), transparent)',
        }}
      />

      <SparklesCore
        background="transparent"
        minSize={0.4}
        maxSize={1}
        particleDensity={1200}
        particleColor="#6b7076"
        className="h-full w-full"
      />

      {/* Keeps the field from ending on a hard edge. */}
      <span
        className="absolute inset-0"
        style={{
          maskImage: 'radial-gradient(90px 190px at center, transparent 20%, white)',
          WebkitMaskImage: 'radial-gradient(90px 190px at center, transparent 20%, white)',
          background: 'transparent',
        }}
      />
    </motion.div>
  )
}
