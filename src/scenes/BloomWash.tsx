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
const COOK = 0.82

/** How its leading edge dissolves into the card in front of it. */
const FEATHER =
  'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.10) 90px, rgba(0,0,0,0.34) 190px, rgba(0,0,0,0.72) 290px, black 380px, black 100%)'
/** The launch. */
const FIRE_MS = 780
const FIRE_Y = 740
/** And how much further it travels on its way out, past the launch. */
const CLEAR_MS = 520
const CLEAR_Y = 420

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

type Beat = 'idle' | 'fired' | 'cleared' | 'done'

/** How long the wash takes to finish leaving, after which there is nothing. */
const DONE_MS = 820

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
    setBeat('fired')
    onFired?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fire, beat])

  useEffect(() => {
    if (beat !== 'fired' && beat !== 'cleared') return
    const t = window.setTimeout(
      () => setBeat(beat === 'fired' ? 'cleared' : 'done'),
      beat === 'fired' ? CLEAR_MS : DONE_MS,
    )
    return () => window.clearTimeout(t)
  }, [beat])

  const fired = beat === 'fired' || beat === 'cleared'
  const cleared = beat === 'cleared'
  const active = cook || fired

  /*
   * And then it is gone, rather than sitting at zero. The veil carries a
   * backdrop-filter, and a backdrop-filter that is merely transparent is still
   * a backdrop-filter — left mounted it held the whole page in a 30px blur
   * long after the colour had left the frame.
   */
  if (still || beat === 'done') return null

  return (
    /*
     * Multiplied onto the page rather than laid over it behind a frosted
     * sheet. The veil this was ported with carried a 30px backdrop-filter,
     * and that blur is what made the receipt illegible the moment the colour
     * arrived — the wash is supposed to cook on the page, not fog it. On
     * multiply, white areas leave the page exactly as it is and the coloured
     * ones only darken it, so the page stays as sharp under the colour as it
     * is beside it.
     *
     * And it sits under the slip rather than over it. The receipt is the one
     * thing on this card that is not the page: colour running across it made
     * it look tinted, which is a printed slip that has come out the wrong
     * shade. The wash cooks on the card behind it.
     */
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[40px]"
      style={{
        /*
         * Under the paper while it cooks, so the receipt is not stained by it;
         * over everything the moment it goes, because a wash that is meant to
         * take the card with it cannot be behind the card. Multiply is for the
         * tint — the sheet that does the wiping is opaque and blends normally.
         */
        zIndex: fired ? 3 : 1,
        mixBlendMode: fired ? 'normal' : 'multiply',
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
            maskImage: FEATHER,
            WebkitMaskImage: FEATHER,
          }}
          initial={{ opacity: 0, y: 120 }}
          animate={
            !active
              ? { opacity: 0, y: 120 }
              : cleared
                ? /* It carries on out of frame and dissolves. It has to
                     actually leave, not stop at the top and vanish in place. */
                  { opacity: 0, y: -(FIRE_Y + CLEAR_Y), scaleY: 1.12, scaleX: 1.05 }
                : fired
                  ? {
                      opacity: 1,
                      y: -FIRE_Y,
                      /* Stretches on the way up and recovers at the top — the
                         smear of something moving faster than it can hold its
                         shape. A rigid block travelling the same distance just
                         reads as a slide. */
                      scaleY: [1, 1.28, 1.04],
                      scaleX: [1, 1.07, 1.03],
                    }
                  : /* Cooking: up at the foot of the page, and no more of
                       itself than that needs. */
                    { opacity: COOK, y: 0, scaleY: 1, scaleX: 1 }
          }
          transition={
            cleared
              ? {
                  y: { duration: 0.72, ease: [0.4, 0, 0.7, 1] },
                  opacity: { duration: 0.6, ease: 'easeIn' },
                  scaleY: { duration: 0.72, ease: 'easeOut' },
                  scaleX: { duration: 0.72, ease: 'easeOut' },
                }
              : fired
                ? {
                    /* Fired, not lifted: near-zero initial slope and then a
                       hard pull away. An ease-out reads as released. */
                    y: { duration: FIRE_MS / 1000, ease: [0.72, 0, 0.24, 1] },
                    scaleY: { duration: FIRE_MS / 1000, ease: 'easeOut' },
                    scaleX: { duration: FIRE_MS / 1000, ease: 'easeOut' },
                  }
                : { duration: RISE_MS / 1000, ease: [0.33, 0, 0.2, 1] }
          }
        >
          {/*
            The gradient itself, as a sheet rather than as a tint.
            
            While it is only cooking this is not there at all — the colour at
            the foot of the card is the soft fields below, multiplied onto it,
            which is what lets the slip stand on the card without being stained
            by it. The moment it fires it becomes a real surface: the four
            stops laid left to right, opaque, travelling up the frame. That is
            the whole job — everything on the card goes because this passed
            over it, not because it was separately asked to leave.
          */}
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(104deg, #118388 0%, #0F7080 34%, #4270D3 71%, #0E528D 100%)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: fired ? 1 : 0 }}
            transition={{ duration: fired ? 0.26 : 0.2, ease: 'easeOut' }}
          />

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
  )
}
