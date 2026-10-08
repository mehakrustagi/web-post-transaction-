import { useEffect, useMemo } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, type MotionValue } from 'framer-motion'
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

/**
 * Where the orb settles once it has gathered (438:17412), and how big.
 *
 * Larger than the design states it, and deliberately: this is the only moment
 * the sphere is looked at on its own, and the whole point of that moment is
 * that you can read the gradient across it and watch the colour travel. At
 * 293 across neither is legible. It gives the size back on its way into the
 * card, where it is artwork again.
 */
const ORB_REST = { cx: 641, cy: 620, d: 430 }
/**
 * The card's own rectangle on the page, and the slot it keeps for its artwork
 * (438:16720) — the slot stated in the card's coordinates, because that is
 * what the surface carries it in.
 */
const CARD = { x: 281, y: 337, w: 785, h: 300, r: 24 }
const CARD_SLOT = { cx: 450 + 145, cy: 157 + 140, d: 290 }

/**
 * The canvas this scene hands to the card, exactly as it is drawing it.
 *
 * The card's copy has to be the *same* canvas at the *same* scale, not another
 * one sized to the same orb: a dot is drawn at a fixed number of canvas pixels,
 * so a differently-sized canvas showing an identically-sized sphere draws the
 * dots at a different size — which is the step you see at the swap.
 */
export const HANDOVER = { w: CANVAS, h: CANVAS, scale: 290 / ORB_D }

/** The canvas's own middle, in the surface's coordinates. */
const CANVAS_MID = { x: REST.cx, y: REST.cy }
/** The sheet's own rectangle inside the canvas. */
const SHEET = {
  x: CANVAS / 2 - PAPER_W / 2,
  y: CANVAS / 2 - PAPER_H / 2,
  w: PAPER_W,
  h: PAPER_H,
}

const GATHER_S = 1.5
const SETTLE_S = 1.0

export type OrbBeat = 'rest' | 'crumble' | 'card'

const ORDER: OrbBeat[] = ['rest', 'crumble', 'card']
const at = (beat: OrbBeat, stop: OrbBeat) => ORDER.indexOf(beat) >= ORDER.indexOf(stop)

/**
 * The slip comes apart into the orb.
 *
 * The same mechanic the map variant uses to gather its world — every dot
 * carries two positions and slides between them — with the sheet in the map's
 * place. So the paper is what disintegrates, rather than being swapped for
 * something that then disintegrates.
 */
export function OrbScene({
  beat,
  spin,
  tint,
}: {
  beat: OrbBeat
  /**
   * Both handed in and both driven by the app, not here. This scene is
   * unmounted the moment the orb becomes the card's artwork, and an animation
   * started in it would be stopped by that unmount — which is exactly what
   * left the sphere frozen on the last page.
   */
  spin: MotionValue<number>
  /** How far its gradient has travelled towards the card's own. */
  tint: MotionValue<number>
}) {
  const still = useReducedMotion()
  const reveal = useMotionValue(1)
  const morph = useMotionValue(0)

  /*
   * One beat, not two. The paper used to finish coming apart before anything
   * moved, which left a second of dots standing still in the shape of a
   * receipt. Now the sheet's dissolve and the dots' flight are the same event.
   */
  const crumbling = at(beat, 'crumble')
  const carded = at(beat, 'card')

  /*
   * Where the orb sits *inside the surface*. On the frame the surface is the
   * whole card, so that is the frame's own middle; once the surface has closed
   * in on the card the same point is the card's artwork slot.
   */
  const seat = carded ? CARD_SLOT : ORB_REST
  const to = {
    x: crumbling ? seat.cx - CANVAS_MID.x : 0,
    y: crumbling ? seat.cy - CANVAS_MID.y : 0,
    scale: crumbling ? seat.d / ORB_D : 1,
  }

  useEffect(() => {
    if (still) return
    const run = animate(morph, crumbling ? 1 : 0, { duration: GATHER_S, ease: [0.42, 0, 0.3, 1] })
    return () => run.stop()
  }, [crumbling, morph, still])


  const flap = useMemo(() => flapPath(PAPER_W), [])

  return (
    /*
     * The surface, which is the card. It is the whole frame to begin with and
     * the eSIM card at the end, and it clips what is on it — so the orb is not
     * an object flying across the page into a slot, it is carried on something
     * that closes in around it. Same move as the gift card's condense.
     *
     * It has no fill of its own. The gift card's does, because it is a dark
     * card on a light page; this one is the same light as what is behind it,
     * so painting it would only cover the heading it is sitting under.
     */
    <motion.div
      className="absolute overflow-hidden"
      initial={false}
      animate={{
        left: carded ? CARD.x : 0,
        top: carded ? CARD.y : 0,
        width: carded ? CARD.w : 1282,
        height: carded ? CARD.h : 915,
        borderRadius: carded ? CARD.r : 40,
      }}
      /*
       * No fade on the way in. It used to hand the rectangle over by fading
       * itself out part-way through the settle, which took the orb with it —
       * leaving the card empty for the best part of half a second before the
       * card's own copy was revealed. The swap is the only hand-over there is,
       * and it happens on `landed`.
       */
      transition={{ duration: SETTLE_S, ease: [0.5, 0, 0.2, 1] }}
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
        /* Paced to the wave of dots coming off it, with no hold in front of
           it: the sheet starts thinning the moment the first dots lift, so the
           paper is going exactly as the dust arrives rather than after it. */
        transition={{ duration: GATHER_S * 0.42, ease: [0.5, 0, 0.8, 0.5] }}
      >
        <svg
          className="absolute left-0 top-0"
          style={{ width: PAPER_W, height: flap.height }}
          viewBox={`0 0 ${PAPER_W} ${flap.height}`}
          aria-hidden
        >
          <defs>
            <linearGradient id="orbFold" gradientUnits="userSpaceOnUse" {...flap.grad}>
              <stop offset="0" stopColor="#DCDCE3" />
              <stop offset=".45" stopColor="#F4F4F7" />
              <stop offset="1" stopColor="#FFFFFF" />
            </linearGradient>
          </defs>
          <path d={flap.d} fill="url(#orbFold)" />
        </svg>
        <div
          className="paper still relative"
          style={{ width: PAPER_W, height: PAPER_H, clipPath: paperClip(PAPER_W, PAPER_W, true) }}
        >
          {/*
            The ink goes first, and quickly. What comes apart into dots has to
            be paper — a sheet of type dissolving into an even scatter reads as
            a cross-fade between two unrelated things, because the dots are not
            where the words were. By the time the sheet itself starts to thin
            it is blank, and the two halves of the effect agree with each other.
          */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: crumbling ? 0 : 1 }}
            transition={{ duration: 0.24, ease: 'easeIn' }}
          >
            <PaperFace />
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: REST.cx - CANVAS / 2, top: REST.cy - CANVAS / 2 }}
        initial={{ opacity: 0 }}
        /* It arrives at the weight the card's own copy sits at, so the swap
           is not a step in brightness either. */
        animate={{ opacity: carded ? 0.6 : crumbling ? 1 : 0, ...to }}
        transition={{
          opacity: { duration: 0.18 },
          default: carded
            ? { type: 'spring', stiffness: 86, damping: 17, mass: 1.15 }
            : { duration: GATHER_S, ease: [0.42, 0, 0.3, 1] },
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
          scatter={0.3}
          colour="#9aa0a6"
          orbFrom="#d1d1d1"
          orbTo="#666666"
          orbFromWarm="#dcf5f1"
          orbToWarm="#8fd3cc"
          tint={tint}
        />
      </motion.div>
    </motion.div>
  )
}
