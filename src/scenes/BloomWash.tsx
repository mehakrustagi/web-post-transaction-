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
const LEAD =
  'transparent 0px, rgba(0,0,0,0.07) 120px, rgba(0,0,0,0.26) 250px, rgba(0,0,0,0.6) 390px, black 540px'
const FEATHER = `linear-gradient(to bottom, ${LEAD}, black 100%)`

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
 * The card the whole thing turns into (438:16680).
 *
 * The eSIM card's own rectangle on the page, and its own gradient. This is why
 * the wash is in those colours: it is not passing over the card on its way
 * somewhere, it *is* the card, at the size of the screen, on its way down to
 * the size of a card.
 */
const CARD = { x: 281, y: 337, w: 785, h: 300, r: 24 }
const CARD_BG = 'linear-gradient(175.298deg, #0b5975 8.856%, #159d94 136.62%)'

/** How long the surface takes to rise and cover everything before it closes. */
const COVER_MS = 640
/**
 * The disc, at the three sizes it is ever drawn at.
 *
 * It comes up out of the pool as a circle rather than as a rising edge: a
 * straight edge crossing the frame is a wipe, and a wipe is a cut dressed up,
 * where something round growing out of the colour that is already there reads
 * as that colour becoming the thing it is about to hand you. It has to reach
 * the frame's diagonal to cover the corners, which is why it ends up half as
 * wide again as the frame itself.
 */
const SEED = { d: 120, cx: FRAME_W / 2, cy: FRAME_H + 70 }
const FULL = { d: 1702, cx: FRAME_W / 2, cy: FRAME_H / 2 }
const disc = (c: { d: number; cx: number; cy: number }) => ({
  left: c.cx - c.d / 2,
  top: c.cy - c.d / 2,
  width: c.d,
  height: c.d,
  /* In pixels, not `50%`, so it can go on to be the card's own 24 — a radius
     that is half the width at every size is a circle all the way up. */
  borderRadius: c.d / 2,
})
/** And how long the close itself takes. */
const CLOSE_MS = 1050

type Beat = 'idle' | 'cover' | 'close' | 'done' | 'gone'

/**
 * The colour wash, cooking at the foot of the page and then leaving up it.
 *
 * It keeps no clock of its own beyond its own exit. It used to run rise → hold
 * → fire on internal timers while the page it was covering ran a second set
 * anchored to the slip, and two clocks for one sequence is one clock too many:
 * whenever the wash took longer to pool than the page's timer allowed, the
 * page simply arrived first and the colour was left cooking over the thing it
 * was supposed to be covering. Now the launch is told to it.
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
  onFired?: () => void
}) {
  const [beat, setBeat] = useState<Beat>('idle')
  const still = useReducedMotion()

  useEffect(() => {
    if (!fire || beat !== 'idle') return
    setBeat('cover')
  }, [fire, beat])

  useEffect(() => {
    if (beat === 'idle' || beat === 'gone') return
    const t = window.setTimeout(
      () => {
        if (beat === 'cover') {
          /* The page is swapped in under a surface that is already covering
             everything, so there is nothing to see it happen. */
          onFired?.()
          setBeat('close')
        } else setBeat(beat === 'close' ? 'done' : 'gone')
      },
      beat === 'cover' ? COVER_MS : beat === 'close' ? CLOSE_MS : 300,
    )
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat])

  const fired = beat !== 'idle'
  const closing = beat === 'close' || beat === 'done' || beat === 'gone'
  const active = cook || fired

  /*
   * And then it is gone, rather than sitting at zero. The veil carries a
   * backdrop-filter, and a backdrop-filter that is merely transparent is still
   * a backdrop-filter — left mounted it held the whole page in a 30px blur
   * long after the colour had left the frame.
   */
  if (still || beat === 'gone') return null

  /*
   * The cooking colour is multiplied onto the page rather than laid over it
   * behind a frosted sheet. The veil this was ported with carried a 30px
   * backdrop-filter, and that blur is what made the receipt illegible the
   * moment the colour arrived — the wash is supposed to cook on the page, not
   * fog it. On multiply, white areas leave the page exactly as it is and the
   * coloured ones only darken it.
   *
   * And it sits under the slip rather than over it. The receipt is the one
   * thing on this card that is not the page: colour running across it made it
   * look tinted, which is a printed slip that has come out the wrong shade.
   */
  return (
    <>
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[40px]"
      style={{
        /*
         * Under the paper while it cooks, so the receipt is not stained by it;
         * over everything the moment it goes, because a wash that is meant to
         * take the card with it cannot be behind the card. Multiply is for the
         * tint — the sheet that does the wiping is opaque and blends normally.
         */
        zIndex: 1,
        mixBlendMode: 'multiply',
      }}
    >
      <div
        className="absolute left-0 top-0"
        style={{ width: SRC_W, height: SRC_H, transform: `scale(${SX}, ${SY})`, transformOrigin: '0 0' }}
      >
        {/* The bloom itself. Three soft colour fields drifting behind a bright
            luminous bar, all heavily blurred — much larger than the area they
            light and sitting partly below the bottom edge, so you see the glow
            and never the shape making it. */}
        <motion.div
          className="absolute"
          style={{
            left: 0,
            /* Starts well above the halfway line so the wash owns the bottom
               of the card outright rather than hugging the edge — that reach
               is most of what makes it prominent. */
            top: 360,
            width: 440,
            /* Runs way past the bottom edge on purpose: at rest the surplus is
               off-screen and costs nothing, and once the wash fires it is
               exactly what keeps the lower half covered. */
            height: 1240,
            isolation: 'auto',
            /* Feathered along its top edge the whole way, because that edge is
               the one crossing the screen: it is what the card disappears
               behind, and a hard line there is a shutter, not a wash. */
            /* It stretches from its own base rather than about its middle, so
               the smear runs ahead of it instead of pulling both edges apart. */
            transformOrigin: '50% 100%',
            maskImage: FEATHER,
            WebkitMaskImage: FEATHER,
          }}
          initial={{ opacity: 0, y: 120 }}
          animate={
            !active || fired
              ? /* Handed over. The surface above is already covering the card
                   by the time this goes, so there is nothing to watch it go. */
                { opacity: 0, y: fired ? -40 : 120 }
              : /* Cooking: up at the foot of the page, and no more of itself
                   than that needs. */
                { opacity: COOK, y: 0 }
          }
          transition={
            fired
              ? { duration: 0.45, ease: 'easeOut' }
              : { duration: RISE_MS / 1000, ease: [0.33, 0, 0.2, 1] }
          }
        >
          <BloomFields />

          {/* The floor pool. The drifting fields give the wash its movement,
              but movement alone reads as weightless — this is the ballast: a
              wide, flat, near-static band pinned to the bottom edge that the
              moving colour sits on. */}
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

          {/* Light travelling through the colour, on plus-lighter so it adds
              light where it passes rather than painting over — what it crosses
              brightens and blooms instead of being covered. Its period is off
              the fields' so it never keeps catching the same one. */}
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
              /* Peaks softly in the middle of the run and is already dimming
                 by the time it reaches either side, so it never has a hard
                 start or stop — light welling up and receding rather than a
                 highlight entering and leaving frame. */
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

      {/*
        The surface, which is the card.
        
        Rather than sweeping the page away and handing over to a card that
        arrives separately, the colour covers the whole frame and then closes
        in on the card's own rectangle — so what you watch is this page
        becoming that card, not one thing leaving and another turning up. It
        is the gift card's condense, in the eSIM card's own gradient, which is
        the gradient the wash has been in all along: it was never passing over
        the card on its way somewhere, it was the card at the size of a screen.
      */}
      {fired && (
        <motion.div
          className="absolute overflow-hidden"
          style={{ zIndex: 3, backgroundImage: CARD_BG }}
          /*
           * Out of the pool, up the screen, and then down onto the card. One
           * element through all three, because they are one move: what grows
           * is what travels is what lands.
           */
          initial={{ ...disc(SEED), opacity: 0 }}
          animate={
            closing
              ? {
                  left: CARD.x,
                  top: CARD.y,
                  width: CARD.w,
                  height: CARD.h,
                  borderRadius: CARD.r,
                  opacity: beat === 'done' ? 0 : 1,
                }
              : { ...disc(FULL), opacity: 1 }
          }
          transition={{
            opacity: { duration: beat === 'done' ? 0.26 : 0.22, ease: 'easeOut' },
            default: closing
              ? { duration: CLOSE_MS / 1000, ease: [0.5, 0, 0.18, 1] }
              : { duration: COVER_MS / 1000, ease: [0.33, 0, 0.2, 1] },
          }}
        />
      )}
    </>
  )
}
