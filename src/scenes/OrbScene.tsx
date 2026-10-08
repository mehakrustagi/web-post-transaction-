import { useEffect, useMemo } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { PAPER_H, PAPER_W, PaperFace } from '../components/Receipt'
import { flapPath, paperClip } from '../components/PrintRig'
import { WorldDots } from '../features/map/WorldDots'

/** Where the printer leaves the slip. The dots take over from exactly there. */
const REST = { cx: 641, cy: 616 }

/**
 * One canvas for the whole thing: big enough to hold the sheet at its full
 * size and the sphere it becomes, so no dot ever has to cross a boundary.
 */
const CANVAS = 560
const ORB_D = CANVAS * 0.42 * 2

/** Where the orb settles once it has gathered (438:17412). */
const ORB_REST = { cx: 641, cy: 620, d: 293 }
/** And the slot the eSIM card keeps for its artwork (438:16720). */
const CARD_SLOT = { cx: 876, cy: 634, d: 290 }
const CARD_CLIP = 'inset(337px 216px 278px 281px round 24px)'
const NO_CLIP = 'inset(0px 0px 0px 0px round 0px)'

const CANVAS_MID = { x: REST.cx, y: REST.cy }
/** The sheet's own rectangle inside the canvas. */
const SHEET = {
  x: CANVAS / 2 - PAPER_W / 2,
  y: CANVAS / 2 - PAPER_H / 2,
  w: PAPER_W,
  h: PAPER_H,
}

const CRUMBLE_S = 1.6
const GATHER_S = 1.9
const SETTLE_S = 1.3

export type OrbBeat = 'rest' | 'crumble' | 'orb' | 'card'

const ORDER: OrbBeat[] = ['rest', 'crumble', 'orb', 'card']
const at = (beat: OrbBeat, stop: OrbBeat) => ORDER.indexOf(beat) >= ORDER.indexOf(stop)

/**
 * The slip comes apart into the orb.
 *
 * The same mechanic the map variant uses to gather its world — every dot
 * carries two positions and slides between them — with the sheet in the map's
 * place. So the paper is what disintegrates, rather than being swapped for
 * something that then disintegrates.
 */
export function OrbScene({ beat }: { beat: OrbBeat }) {
  const still = useReducedMotion()
  const reveal = useMotionValue(1)
  const morph = useMotionValue(0)
  const spin = useMotionValue(0)

  const crumbling = at(beat, 'crumble')
  const orbed = at(beat, 'orb')
  const carded = at(beat, 'card')

  const seat = carded ? CARD_SLOT : ORB_REST
  const to = {
    x: orbed ? seat.cx - CANVAS_MID.x : 0,
    y: orbed ? seat.cy - CANVAS_MID.y : 0,
    scale: orbed ? seat.d / ORB_D : 1,
  }

  useEffect(() => {
    if (still) return
    const run = animate(morph, orbed ? 1 : 0, { duration: GATHER_S, ease: [0.5, 0, 0.2, 1] })
    return () => run.stop()
  }, [orbed, morph, still])

  useEffect(() => {
    if (still || !orbed) return
    const run = animate(spin, Math.PI * 2, {
      duration: 34,
      ease: 'linear',
      repeat: Infinity,
      delay: GATHER_S * 0.5,
    })
    return () => run.stop()
  }, [orbed, spin, still])

  const flap = useMemo(() => flapPath(PAPER_W), [])

  return (
    <motion.div
      className="absolute inset-0"
      initial={false}
      animate={{ clipPath: carded ? CARD_CLIP : NO_CLIP }}
      transition={{ duration: SETTLE_S * 0.55, ease: [0.4, 0, 0.2, 1] }}
    >
      {/*
        The sheet itself, which fades as its dots take over. They start on the
        same rectangle it occupies, so for a moment the paper and the dust of
        it are in the same place and the one becomes the other.
      */}
      <motion.div
        className="absolute"
        style={{
          left: REST.cx - PAPER_W / 2,
          top: REST.cy - PAPER_H / 2,
          width: PAPER_W,
          height: PAPER_H,
          filter:
            'drop-shadow(0 3px 4px rgba(20,22,35,.07)) drop-shadow(0 28px 36px rgba(20,22,35,.14))',
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: crumbling ? 0 : 1 }}
        transition={{ duration: CRUMBLE_S * 0.55, ease: 'easeIn' }}
      >
        <svg
          className="absolute left-0 top-0"
          style={{ width: PAPER_W, height: flap.height }}
          viewBox={`0 0 ${PAPER_W} ${flap.height}`}
          aria-hidden
        >
          <defs>
            <linearGradient id="orbFold" gradientUnits="userSpaceOnUse" {...flap.grad}>
              <stop offset="0" stopColor="#E4E4E9" />
              <stop offset=".45" stopColor="#F7F7F9" />
              <stop offset="1" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>
          <path d={flap.d} fill="url(#orbFold)" />
        </svg>
        <div
          className="paper relative"
          style={{ width: PAPER_W, height: PAPER_H, clipPath: paperClip(PAPER_W, PAPER_W, true) }}
        >
          <PaperFace />
        </div>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: REST.cx - CANVAS / 2, top: REST.cy - CANVAS / 2 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: crumbling ? 1 : 0, ...to }}
        transition={{
          opacity: { duration: CRUMBLE_S * 0.5, ease: 'easeOut' },
          default: carded
            ? { type: 'spring', stiffness: 86, damping: 17, mass: 1.15 }
            : { duration: GATHER_S, ease: [0.5, 0, 0.2, 1] },
        }}
      >
        <WorldDots
          width={CANVAS}
          height={CANVAS}
          reveal={reveal}
          morph={morph}
          spin={spin}
          source="sheet"
          sheet={SHEET}
          colour={carded ? '#bfe9e4' : '#9aa0a6'}
          orbFrom={carded ? '#dcf5f1' : '#d1d1d1'}
          orbTo={carded ? '#8fd3cc' : '#666666'}
        />
      </motion.div>
    </motion.div>
  )
}
