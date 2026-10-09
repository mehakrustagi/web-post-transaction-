import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/*
 * The post-payment wash, carried over from the onboarding build
 * (`src/screens/PostPaymentScreen.tsx` and `src/components/BloomFields.tsx`).
 *
 * The tuning is theirs and is kept intact — the field table, the periods, the
 * mask, the launch. What changed is the shape of the hole it has to fill:
 * that build is a 440×965 phone and this is a 1282×915 card, so the whole
 * thing is drawn in its original coordinates and the group is scaled to fit.
 * A non-uniform scale is exactly right here rather than a compromise: the
 * fields are soft ellipses with no edge to distort, and stretching them is
 * how a wash tuned for a tall screen comes to own a wide one.
 */

/** The coordinates everything below is written in. */
const SRC_W = 440
const SRC_H = 965
const FRAME_W = 1282
const FRAME_H = 915
const SX = FRAME_W / SRC_W
const SY = FRAME_H / SRC_H

/** How long the colour takes to come up and settle at the foot of the page. */
const RISE_MS = 900
/**
 * How much of itself it shows while it is only cooking.
 *
 * It is under a printer that is still working at this point, and the one thing
 * it must not do is ask to be looked at — it is a warmth at the bottom of the
 * page that you notice having been there, not an event. Full weight is for the
 * launch, which is when it does have something to say.
 */
const COOK = 0.72

/** How its leading edge dissolves into the card in front of it. */
/*
 * Short enough that there is a pool left under it.
 *
 * The group starts 360 down a 965-tall card, so only about 600 of it is ever
 * on screen — a 540 ramp meant the fade was still running at the bottom edge
 * and the colour never reached full strength anywhere you could see it. That
 * did not matter while an opaque disc was doing the covering. Now that this
 * is the whole effect, it does.
 */
const LEAD =
  'transparent 0px, rgba(0,0,0,0.10) 70px, rgba(0,0,0,0.34) 150px, rgba(0,0,0,0.72) 230px, black 320px'
const FEATHER = `linear-gradient(to bottom, ${LEAD}, black 100%)`
/** And how its trailing edge dissolves into the page behind it on the way up. */
const FEATHER_OUT = `linear-gradient(to bottom, ${LEAD}, black calc(100% - 420px), rgba(0,0,0,0.5) calc(100% - 210px), transparent 100%)`

/**
 * The colour.
 *
 * The onboarding build's wash is the brand's four hues; this one is the eSIM
 * card's own gradient — #118388 → #0F7080 → #4270D3 → #0E528D — because the
 * card is what the wash hands you, and arriving in the colours of the thing
 * you are about to be shown is the difference between a transition and an
 * interstitial. Laid left to right in the gradient's own order, which is
 * already a smooth walk from teal to deep blue, so the fields compound into
 * colours that still belong to the set wherever they overlap.
 *
 * Lifted well toward white, though, and that is not a softening of the brief:
 * these fields multiply, multiply darkens whatever it lands on, and two
 * overlapping fields darken it twice. Mixed at their true brightness on a
 * near-white card they come out as ink. These are those four colours taken
 * 42% of the way to white — enough that they read as light diffusing through
 * the surface rather than as paint laid over it, and no further, because past
 * that the gradient stops being teal and blue and starts being grey.
 */
const FIELDS = [
  // #118388 — teal
  { color: 'rgba(117,183,186,0.95)', fade: 'rgba(117,183,186,0.34)', x: -250, y: 250, w: 640, h: 360, blur: 64, drift: 250, lift: 70, swell: 1.14, dur: 5.6 },
  // #0F7080 — deep teal, at the 80% the stop itself carries
  { color: 'rgba(116,172,181,0.76)', fade: 'rgba(116,172,181,0.27)', x: -60, y: 300, w: 620, h: 340, blur: 70, drift: -215, lift: 84, swell: 1.17, dur: 7.1 },
  // #4270D3 — blue
  { color: 'rgba(145,172,230,0.95)', fade: 'rgba(145,172,230,0.34)', x: 110, y: 235, w: 630, h: 350, blur: 66, drift: 230, lift: 62, swell: 1.12, dur: 4.8 },
  // #0E528D — deep blue
  { color: 'rgba(115,155,189,0.95)', fade: 'rgba(115,155,189,0.34)', x: 250, y: 285, w: 620, h: 330, blur: 68, drift: -240, lift: 76, swell: 1.15, dur: 6.3 },
] as const

/* Long sweeps across the full width rather than a gentle wobble in place: the
   fields have to physically cross each other for the colours to mix, and
   drifting fifty pixels never let them overlap enough to make a new hue. */
function BloomFields() {
  return (
    <>
      {FIELDS.map((f, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: f.x,
            top: f.y,
            width: f.w,
            height: f.h,
            borderRadius: '50%',
            background: `radial-gradient(closest-side, ${f.color} 0%, ${f.fade} 55%, rgba(0,0,0,0) 100%)`,
            filter: `blur(${f.blur}px)`,
            mixBlendMode: 'multiply',
          }}
          animate={{
            x: [0, f.drift, -f.drift * 0.75, f.drift * 0.4, 0],
            y: [0, -f.lift * 0.35, f.lift, -f.lift * 0.2, 0],
            scale: [1, f.swell, 1 / f.swell, f.swell * 0.94, 1],
          }}
          transition={{
            x: { duration: f.dur, repeat: Infinity, ease: 'easeInOut' },
            y: { duration: f.dur * 1.31, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: f.dur * 0.83, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      ))}
    </>
  )
}

/**
 * How far it travels on the way out, and how long it takes.
 *
 * Far enough to be gone: the group is 1240 tall and sits 360 down, so
 * anything short of 1600 leaves its own bottom edge somewhere on the card.
 */
const FIRE_Y = 1680
const FIRE_MS = 1150
/**
 * And when, part-way up, the page underneath is swapped in.
 *
 * Not at the start and not at the end — at the moment the colour is over the
 * middle of the card, which is the only moment there is nothing to see the
 * swap happen against.
 */
const SWAP_MS = 340

type Beat = 'idle' | 'fired' | 'gone'

/**
 * The wash, doing the one thing it was written to do.
 *
 * It used to grow into a disc, cover the frame and close onto the eSIM card —
 * the card arriving as the colour rather than behind it. That was a good
 * trick and it was three moves and a second element to keep in step with the
 * page, for a card the page already has. This is the onboarding build's own
 * behaviour and nothing else: it cooks at the foot of the card while the
 * printer works, and when the slip is down it goes up and off, taking the
 * receipt with it and leaving the page.
 */
export function BloomWash({
  cook,
  fire,
  onFired,
}: {
  /** Warm up at the foot of the page. */
  cook: boolean
  /** And go. */
  fire: boolean
  /** Called part-way up, under cover, for the page to be swapped in. */
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

  /*
   * Multiplied onto the card rather than laid over it. White areas leave the
   * page exactly as it is and the coloured ones only darken it, so the slip
   * stays as sharp under the colour as it is beside it — and it sits under
   * the paper while it cooks, because the receipt is the one thing on this
   * card that is not the page and colour across it reads as a slip printed in
   * the wrong shade.
   */
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[40px]"
      style={{ zIndex: fired ? 3 : 1, mixBlendMode: 'multiply' }}
    >
      <div
        className="absolute left-0 top-0"
        style={{ width: SRC_W, height: SRC_H, transform: `scale(${SX}, ${SY})`, transformOrigin: '0 0' }}
      >
        <motion.div
          className="absolute"
          style={{
            left: 0,
            top: 360,
            width: SRC_W,
            /* Runs well past the bottom edge on purpose: at rest the surplus
               costs nothing, and on the way up it is what keeps the lower
               half covered. */
            height: 1240,
            isolation: 'auto',
            transformOrigin: '50% 100%',
            /* Soft at the top always, because that edge crosses the card and
               a hard line there is a shutter. Soft at the bottom only once it
               is going — pooled, that edge is off the foot of the screen, and
               feathering it there would fade the pool out short of the edge. */
            maskImage: fired ? FEATHER_OUT : FEATHER,
            WebkitMaskImage: fired ? FEATHER_OUT : FEATHER,
          }}
          initial={{ opacity: 0, y: 120 }}
          animate={
            !active
              ? { opacity: 0, y: 120 }
              : fired
                ? {
                    y: -FIRE_Y,
                    /* Up to full as it crosses, and gone by the time it has
                       left — it leaves by leaving, and the fade only keeps it
                       from being a coloured band sliding off a white page. */
                    opacity: [COOK, 1, 1, 0],
                    /* The smear of something moving faster than it can hold
                       its shape. A rigid block reads as a slide. */
                    scaleY: [1, 1.26, 1.06],
                  }
                : { opacity: COOK, y: 0, scaleY: 1 }
          }
          transition={
            fired
              ? {
                  y: { duration: FIRE_MS / 1000, ease: [0.62, 0, 0.26, 1] },
                  opacity: { duration: FIRE_MS / 1000, times: [0, 0.18, 0.66, 1], ease: 'linear' },
                  scaleY: { duration: FIRE_MS / 1000, ease: 'easeOut' },
                }
              : { duration: RISE_MS / 1000, ease: [0.33, 0, 0.2, 1] }
          }
        >
          <BloomFields />

          {/* The ballast. The drifting fields give the wash its movement, but
              movement alone reads as weightless — this is a wide, flat,
              near-static band pinned to the foot that the moving colour sits
              on. */}
          <motion.div
            className="absolute"
            style={{
              left: -150,
              top: 340,
              width: 740,
              height: 320,
              borderRadius: '50%',
              background:
                'radial-gradient(closest-side, rgba(124,187,190,0.86) 0%, rgba(120,176,184,0.58) 38%, rgba(149,176,232,0.4) 70%, rgba(119,158,192,0.24) 100%)',
              filter: 'blur(72px)',
              mixBlendMode: 'multiply',
            }}
            animate={{ x: [0, 46, -34, 0], scaleX: [1, 1.06, 0.97, 1] }}
            transition={{
              x: { duration: 9.5, repeat: Infinity, ease: 'easeInOut' },
              scaleX: { duration: 7.2, repeat: Infinity, ease: 'easeInOut' },
            }}
          />

          {/* Light travelling through the colour, on plus-lighter so what it
              crosses brightens rather than being covered. */}
          <motion.div
            className="absolute"
            style={{
              left: -340,
              top: 290,
              width: 560,
              height: 300,
              borderRadius: '50%',
              background:
                'radial-gradient(closest-side, rgba(236,250,255,0.62) 0%, rgba(228,246,255,0.4) 30%, rgba(222,242,255,0.2) 62%, rgba(255,255,255,0) 100%)',
              filter: 'blur(96px)',
              mixBlendMode: 'plus-lighter',
            }}
            animate={{
              x: [0, 820],
              opacity: [0, 0.35, 0.62, 0.4, 0],
              scaleY: [0.92, 1.2, 1, 1.12, 0.92],
              scaleX: [1, 1.18, 1],
            }}
            transition={{
              x: { duration: 9.4, repeat: Infinity, ease: 'easeInOut' },
              opacity: {
                duration: 9.4,
                repeat: Infinity,
                ease: 'easeInOut',
                times: [0, 0.22, 0.5, 0.78, 1],
              },
              scaleY: { duration: 5.7, repeat: Infinity, ease: 'easeInOut' },
              scaleX: { duration: 7.9, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </motion.div>
      </div>
    </div>
  )
}
