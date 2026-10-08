import { useEffect, useMemo } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, type MotionValue } from 'framer-motion'
import { PAPER_H, PAPER_W, PaperFace } from '../components/Receipt'
import { flapPath, paperClip } from '../components/PrintRig'
import { WorldDots } from '../features/map/WorldDots'
import { arc, place, ROUTES, VIETNAM } from '../features/map/arcs'
import { MAP_ASPECT } from '../features/map/dots'
import { SparklesCore } from '../components/ui/sparkles'

/**
 * Where the printer leaves the slip. Not a choice — it is where `PrintRig`
 * puts the sheet down, and the turn starts from exactly there.
 */
const REST = { cx: 641, cy: 616 }

/** The seam. It never moves; everything else crosses it. */
const LINE_X = 690
/**
 * The one line the slip and the world both stand on. Their bases match, so
 * what crosses the seam reads as a single strip being fed through it rather
 * than as two pictures that happen to be side by side.
 */
const BASE_Y = 720

const MAP_W = 450
const MAP_H = MAP_W * MAP_ASPECT
/** The canvas is taller than the map, to leave the orb room to turn in. */
const CANVAS_H = MAP_W * 0.62
const CANVAS_TOP = BASE_Y - (CANVAS_H + MAP_H) / 2

/**
 * How far the strip travels: the width of the turned slip, so that by the time
 * the world is all the way out the slip has been eaten entirely by the seam.
 */
const TRAVEL = PAPER_H

/** The turned slip's resting place, with its right edge against the seam. */
const SLIP = { cx: LINE_X - PAPER_H / 2, cy: BASE_Y - PAPER_W / 2 }

/**
 * The map's own middle of the card. It moves here *before* the routes draw —
 * the places being joined up are the subject by then, and they should not be
 * read off something sitting against the right-hand edge.
 */
const MAP_CENTRE = { cx: 641, cy: BASE_Y - (CANVAS_H + MAP_H) / 2 + CANVAS_H / 2, d: 0 }
const CENTRE_S = 0.8

/** Where the orb ends up once the dots have gathered (438:17412). */
const ORB_REST = { cx: 641, cy: 620, d: 293 }
/**
 * And where it finally sits: the slot the eSIM card keeps for its artwork
 * (438:16720), in the page's coordinates.
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

/** The orb's own width on the canvas, from `WorldDots`' own radius. */
const ORB_D = Math.min(MAP_W, CANVAS_H) * 0.42 * 2
/** Where the canvas's middle sits once the strip has finished travelling. */
const CANVAS_MID = { x: LINE_X + MAP_W / 2, y: CANVAS_TOP + CANVAS_H / 2 }

/** How long each part of the translation takes. */
const TURN_S = 0.85
const SCAN_S = 1.9
const ARCS_S = 1.3
const GATHER_S = 1.5
const SETTLE_S = 1.0

export type MapBeat = 'turn' | 'scan' | 'routes' | 'orb' | 'card'

const ORDER: MapBeat[] = ['turn', 'scan', 'routes', 'orb', 'card']
const at = (beat: MapBeat, stop: MapBeat) => ORDER.indexOf(beat) >= ORDER.indexOf(stop)

/**
 * The slip becomes the world.
 *
 * It turns on its side and is fed rightward through a fixed seam. Everything
 * left of the seam is slip and everything right of it is world, and both move
 * at the same pace on the same baseline — so the seam eats the one and lets
 * the other out, and what you read is a single strip changing as it passes
 * rather than two pictures swapping places.
 *
 * Then the routes draw, the country lights up, and the map's dots gather into
 * the orb, which takes its place in the card.
 */
export function MapScene({
  beat,
  spin,
  tint,
}: {
  beat: MapBeat
  /** Handed in, so the orb keeps turning through the hand-over to the card. */
  spin: MotionValue<number>
  /** How far its gradient has travelled towards the card's own. */
  tint: MotionValue<number>
}) {
  const still = useReducedMotion()
  const reveal = useMotionValue(1)
  const morph = useMotionValue(0)

  const scanning = at(beat, 'scan')
  const routed = at(beat, 'routes')
  const orbed = at(beat, 'orb')
  const carded = at(beat, 'card')

  /*
   * Where the canvas has to go. It centres itself as soon as the strip has
   * finished, before anything is drawn on it, and only grows into the orb
   * after that.
   */
  const seat = carded ? CARD_SLOT : orbed ? ORB_REST : routed ? MAP_CENTRE : null
  const orbTo = {
    x: seat ? seat.cx - CANVAS_MID.x : 0,
    y: seat ? seat.cy - CANVAS_MID.y : 0,
    scale: seat && seat.d ? seat.d / ORB_D : 1,
  }

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
    /*
     * And its colour walks to the card's while it does. By the time the
     * surface closes in, the orb is already wearing what it will wear there —
     * which is what lets the hand-over to the card's own copy be invisible.
     */
    const warming = animate(tint, 1, { duration: 2.2, ease: 'easeInOut' })
    return () => {
      run.stop()
      warming.stop()
    }
  }, [orbed, spin, tint, still])

  const flap = useMemo(() => flapPath(PAPER_W), [])
  const hub = place(VIETNAM.lat, VIETNAM.lng)
  const routes = useMemo(
    () => ROUTES.map((r) => arc(place(r.lat, r.lng), hub, MAP_W, MAP_H)),
    [hub],
  )

  const strip = { duration: SCAN_S, ease: [0.4, 0, 0.25, 1] as const }

  return (
    <motion.div
      className="absolute inset-0"
      initial={false}
      /* Ahead of the orb, so nothing of it is outside the card by the time it
         is over it. */
      animate={{ clipPath: carded ? CARD_CLIP : NO_CLIP }}
      transition={{ duration: SETTLE_S * 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      {/*
        Left of the seam: the slip. The clip only comes on once it has turned,
        because on its way out of the printer it straddles the line.
      */}
      <div
        className="absolute left-0 top-0"
        style={{ width: LINE_X, height: 915, overflow: scanning ? 'hidden' : 'visible' }}
      >
        <motion.div
          className="absolute left-0 top-0 h-full w-full"
          initial={{ x: 0 }}
          animate={{ x: scanning ? TRAVEL : 0 }}
          transition={strip}
        >
          <motion.div
            className="absolute"
            style={{
              left: SLIP.cx - PAPER_W / 2,
              top: SLIP.cy - PAPER_H / 2,
              width: PAPER_W,
              height: PAPER_H,
              transformOrigin: '50% 50%',
              filter:
                'drop-shadow(0 3px 4px rgba(20,22,35,.07)) drop-shadow(0 28px 36px rgba(20,22,35,.14))',
            }}
            /* It arrives upright from the printer and turns into place. */
            initial={{ rotate: 0, x: REST.cx - SLIP.cx, y: REST.cy - SLIP.cy }}
            animate={{ rotate: -90, x: 0, y: 0 }}
            transition={{ duration: TURN_S, ease: [0.4, 0, 0.2, 1] }}
          >
            {/*
              The same sheet that came out of the printer: the torn top and
              foot and the curled corner are `PrintRig`'s own geometry, not a
              second drawing of a receipt that happens to look similar.
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
              className="paper still relative"
              style={{
                width: PAPER_W,
                height: PAPER_H,
                clipPath: paperClip(PAPER_W, PAPER_W, true),
              }}
            >
              <PaperFace />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/*
        Right of the seam: the world. It starts a full travel to the left of
        the line — entirely inside the clip, so invisible — and comes out as
        the strip moves. The clip is dropped once the orb has to cross back.
      */}
      <div
        className="absolute top-0"
        style={{
          left: LINE_X,
          width: 1282 - LINE_X,
          height: 915,
          overflow: routed ? 'visible' : 'hidden',
        }}
      >
        <motion.div
          className="absolute left-0 top-0"
          initial={{ x: 0 }}
          animate={{ x: scanning ? TRAVEL : 0 }}
          transition={strip}
        >
          <motion.div
            className="absolute"
            style={{ left: -TRAVEL, top: CANVAS_TOP }}
            initial={false}
            animate={{ ...orbTo, opacity: carded ? 0.6 : 1 }}
            /* It drops into the slot rather than arriving at it: a spring
               with enough mass to settle, which is what makes the collapse
               read as the orb finding its place and not as a cut. */
            transition={
              carded
                ? { type: 'spring', stiffness: 86, damping: 17, mass: 1.15 }
                : { duration: orbed ? GATHER_S : CENTRE_S, ease: [0.5, 0, 0.2, 1] }
            }
          >
            <WorldDots
              width={MAP_W}
              height={CANVAS_H}
              reveal={reveal}
              morph={morph}
              spin={spin}
              /* Grey on the card it is printed on, pale once it is on the teal. */
              colour="#8d939a"
              orbFrom="#d1d1d1"
              orbTo="#666666"
              orbFromWarm="#dcf5f1"
              orbToWarm="#8fd3cc"
              tint={tint}
              scatter={0.16}
            />

            {/* The routes ride with the map, in the map's own coordinates. */}
            <motion.svg
              className="pointer-events-none absolute"
              style={{ left: 0, top: (CANVAS_H - MAP_H) / 2 }}
              width={MAP_W}
              height={MAP_H}
              aria-hidden
              initial={false}
              animate={{ opacity: routed && !orbed ? 1 : 0 }}
              transition={{ duration: 0.55, delay: routed && !orbed ? CENTRE_S : 0, ease: 'easeInOut' }}
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
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: routed && !orbed ? 1 : 0 }}
                  transition={{ duration: ARCS_S, delay: CENTRE_S + i * 0.16, ease: [0.4, 0, 0.3, 1] }}
                />
              ))}
              {routes.map((r, i) => (
                <motion.circle
                  key={`end-${i}`}
                  cx={r.ax}
                  cy={r.ay}
                  r={2.4}
                  fill="#c08a4a"
                  initial={{ scale: 0 }}
                  animate={{ scale: routed && !orbed ? 1 : 0 }}
                  transition={{ duration: 0.4, delay: CENTRE_S + ARCS_S * 0.75 + i * 0.16 }}
                  style={{ transformOrigin: `${r.ax}px ${r.ay}px` }}
                />
              ))}

              {/* The country the whole thing is about, lighting up. */}
              <motion.circle
                cx={hub.x * MAP_W}
                cy={hub.y * MAP_W}
                r={3.4}
                fill="#e0a35c"
                initial={{ scale: 0 }}
                animate={{ scale: routed && !orbed ? 1 : 0 }}
                transition={{ duration: 0.5, delay: CENTRE_S + 0.2 }}
                style={{ transformOrigin: `${hub.x * MAP_W}px ${hub.y * MAP_W}px` }}
              />
              {routed && !orbed && (
                <motion.circle
                  cx={hub.x * MAP_W}
                  cy={hub.y * MAP_W}
                  r={3.4}
                  fill="none"
                  stroke="#e0a35c"
                  strokeWidth={1}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 6, opacity: 0 }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
                  style={{ transformOrigin: `${hub.x * MAP_W}px ${hub.y * MAP_W}px` }}
                />
              )}
            </motion.svg>
          </motion.div>
        </motion.div>
      </div>

      <Seam beat={beat} />
    </motion.div>
  )
}

/**
 * The seam the card is fed through.
 *
 * It does not move. The slip goes into it from the left and the world comes
 * out of it to the right, which is the whole idea — a fixed edge with a strip
 * crossing it reads as one thing becoming another, where a travelling brush
 * just reads as drawing.
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
      style={{ left: LINE_X - 60, top: BASE_Y - 400, width: 120, height: 420 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: gone ? 0 : lit ? 1 : 0.45 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
    >
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
    </motion.div>
  )
}
