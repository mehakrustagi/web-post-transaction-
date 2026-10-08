import { useEffect, useMemo } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { PAPER_H, PAPER_W, PaperFace } from '../components/Receipt'
import { WorldDots } from '../features/map/WorldDots'
import { arc, place, ROUTES, VIETNAM } from '../features/map/arcs'
import { MAP_ASPECT } from '../features/map/dots'

/**
 * Where the printer leaves the slip, and where it ends up once it has turned.
 * The first is not a choice — it is where `PrintRig` puts it — and the slip
 * travels between the two as it turns, so the hand-over is one movement.
 */
const REST = { cx: 641, cy: 616 }
const SLIP = { cx: 455, cy: 560 }
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
  const natural = { x: MAP.x + MAP.w / 2, y: MAP.y }
  const target = carded ? CARD_SLOT : { cx: FRAME.cx, cy: FRAME.cy }
  const to = {
    x: orbed ? ('cx' in target ? target.cx : 0) - natural.x : 0,
    y: orbed ? ('cy' in target ? target.cy : 0) - natural.y : 0,
    scale: carded ? CARD_SLOT.d / ORB_D : 1,
  }

  useEffect(() => {
    if (still) {
      reveal.set(1)
      morph.set(orbed ? 1 : 0)
      return
    }
    const run = animate(reveal, scanning ? 1 : 0, {
      duration: SCAN_S,
      ease: [0.45, 0, 0.25, 1],
    })
    return () => run.stop()
  }, [scanning, reveal, morph, orbed, still])

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
          x: SLIP.cx - REST.cx,
          y: SLIP.cy - REST.cy,
          opacity: orbed ? 0 : 1,
        }}
        transition={{
          default: { duration: TURN_S, ease: [0.4, 0, 0.2, 1] },
          opacity: { duration: 0.8, ease: 'easeInOut' },
        }}
      >
        <div className="paper relative" style={{ width: PAPER_W, height: PAPER_H }}>
          <PaperFace />
        </div>
      </motion.div>

      {/* The map, printed in behind the line. */}
      {/*
        The map prints where it is, beside the slip, and then walks to the
        middle of the card as it gathers — the orb is the subject by then, and
        it should not be sitting off to one side waiting to be noticed.
      */}
      <motion.div
        className="absolute"
        /* The canvas is square-ish and centres the map in itself, so it only
           needs its own half-height taken off — the map's is already handled. */
        style={{ left: MAP.x, top: MAP.y - CANVAS_H / 2 }}
        initial={false}
        animate={to}
        transition={{ duration: carded ? SETTLE_S : GATHER_S, ease: [0.5, 0, 0.2, 1] }}
      >
        <WorldDots
          width={MAP.w}
          height={CANVAS_H}
          reveal={reveal}
          morph={morph}
          spin={spin}
          /* Grey on the card it is printed on, pale once it is on the teal. */
          colour={carded ? '#bfe9e4' : '#8d939a'}
        />
      </motion.div>

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

      <ScanEdge beat={beat} still={still} />
    </motion.div>
  )
}

/**
 * The line that does the writing, and the dust it throws up.
 *
 * Lifted from the headline reveal rather than reinvented: it is the same
 * gesture at a different scale, and the point of using it twice is that the
 * second time it is recognised.
 */
function ScanEdge({ beat, still }: { beat: MapBeat; still: boolean | null }) {
  const scanning = at(beat, 'scan')
  /* It wrote the map; once the routes start it has nothing left to say. */
  const gone = at(beat, 'routes')
  const travel = MAP.w

  const motes = useMemo(
    () =>
      Array.from({ length: 48 }, () => ({
        y: Math.random() * 100,
        size: 1.1 + Math.pow(Math.random(), 2.2) * 3,
        dx: Array.from({ length: 3 }, () => Math.random() * 14 - 7),
        dy: Array.from({ length: 3 }, () => Math.random() * 10 - 5),
        peak: 0.4 + Math.random() * 0.6,
        delay: Math.random() * 4,
      })),
    [],
  )

  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: LINE_X, top: SLIP.cy - 200, height: 400, width: 1 }}
      initial={{ opacity: 0, x: 0 }}
      animate={{ opacity: gone ? 0 : 1, x: scanning ? travel : 0 }}
      transition={{
        opacity: { duration: 0.6 },
        x: { duration: SCAN_S, ease: [0.45, 0, 0.25, 1] },
      }}
    >
      <span
        className="absolute inset-y-0 block w-px"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, transparent, rgba(60,64,70,.55) 18%, rgba(60,64,70,.55) 82%, transparent)',
        }}
      />
      {!still && (
        <span className="absolute inset-y-0 block" style={{ left: -26, width: 52 }}>
          {motes.map((m, i) => (
            <motion.span
              key={i}
              className="absolute block rounded-full"
              style={{
                top: `${m.y}%`,
                left: '50%',
                width: m.size,
                height: m.size,
                background: '#6b7076',
                boxShadow: `0 0 ${2 + m.size * 2}px rgba(120,126,133,.6)`,
              }}
              animate={{
                x: [0, ...m.dx, 0],
                y: [0, ...m.dy, 0],
                opacity: [0, m.peak, m.peak * 0.4, m.peak, 0],
                scale: [0.5, 1, 1.25, 1, 0.5],
              }}
              transition={{
                duration: 4,
                delay: m.delay,
                repeat: Infinity,
                repeatType: 'mirror',
                ease: 'easeInOut',
              }}
            />
          ))}
        </span>
      )}
    </motion.div>
  )
}
