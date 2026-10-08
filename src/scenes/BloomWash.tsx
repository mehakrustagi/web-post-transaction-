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

/** How long the wash takes to pool at the foot of the card. */
const RISE_MS = 620
/** How long it sits there before it goes. */
const HOLD_MS = 1500
/** The launch. */
const FIRE_MS = 780
const FIRE_Y = 740
/** And how much further it travels on its way out, past the launch. */
const CLEAR_MS = 520
const CLEAR_Y = 420

const IN_EASE = [0.22, 1, 0.36, 1] as const

/**
 * The colour, straight from the onboarding build.
 *
 * All four brand hues (#5057EA indigo, #D946EF magenta, #EF4444 red, #EDD758
 * yellow), laid left to right so neighbours are adjacent on the wheel —
 * ordering matters because the fields overlap and multiply, and adjacent hues
 * compound into colours that still belong to the set where indigo next to
 * yellow would mix toward mud. They sit well lighter than the target colour
 * on purpose: multiply darkens whatever it lands on, and the card is
 * near-white, so these are those hues lifted toward pastel.
 */
const FIELDS = [
  { color: 'rgba(188,168,238,0.95)', fade: 'rgba(188,168,238,0.34)', x: -250, y: 250, w: 640, h: 360, blur: 64, drift: 250, lift: 70, swell: 1.14, dur: 5.6 },
  { color: 'rgba(240,182,250,0.95)', fade: 'rgba(240,182,250,0.34)', x: -60, y: 300, w: 620, h: 340, blur: 70, drift: -215, lift: 84, swell: 1.17, dur: 7.1 },
  { color: 'rgba(250,182,178,0.95)', fade: 'rgba(250,182,178,0.34)', x: 110, y: 235, w: 630, h: 350, blur: 66, drift: 230, lift: 62, swell: 1.12, dur: 4.8 },
  { color: 'rgba(250,238,186,0.95)', fade: 'rgba(250,238,186,0.34)', x: 250, y: 285, w: 620, h: 330, blur: 68, drift: -240, lift: 76, swell: 1.15, dur: 6.3 },
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

type Beat = 'rise' | 'settled' | 'fired' | 'cleared' | 'done'

/** How long the wash takes to finish leaving, after which there is nothing. */
const DONE_MS = 820

/** Everything the wash has covered is gone by the time it reports this. */
export function BloomWash({ active, onFired }: { active: boolean; onFired?: () => void }) {
  const [beat, setBeat] = useState<Beat>('rise')
  const still = useReducedMotion()

  useEffect(() => {
    if (!active) return
    const next: Record<Beat, [Beat, number] | null> = {
      rise: ['settled', RISE_MS],
      settled: ['fired', HOLD_MS],
      fired: ['cleared', CLEAR_MS],
      cleared: ['done', DONE_MS],
      done: null,
    }
    const step = next[beat]
    if (!step) return
    const t = window.setTimeout(() => setBeat(step[0]), step[1])
    return () => window.clearTimeout(t)
  }, [active, beat])

  /*
   * The page underneath is uncovered at the launch, not at the end of it. The
   * wash is travelling and stretched at that moment and the card is behind the
   * thickest part of it, so the swap happens under cover — waiting for the
   * wash to leave would mean swapping on an empty screen.
   */
  useEffect(() => {
    if (beat === 'fired') onFired?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat])

  const fired = beat === 'fired' || beat === 'cleared'
  const cleared = beat === 'cleared'

  /*
   * And then it is gone, rather than sitting at zero. The veil carries a
   * backdrop-filter, and a backdrop-filter that is merely transparent is still
   * a backdrop-filter — left mounted it held the whole page in a 30px blur
   * long after the colour had left the frame.
   */
  if (still || beat === 'done') return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[40px]" style={{ zIndex: 30 }}>
      <div
        className="absolute left-0 top-0"
        style={{ width: SRC_W, height: SRC_H, transform: `scale(${SX}, ${SY})`, transformOrigin: '0 0' }}
      >
        {/*
          The frosted veil. It carries its weight in blur rather than in flat
          white, so the slip and the machine still read as shapes underneath
          it rather than being painted out — and it eases off toward the foot,
          because every point of opacity here is colour you cannot see and the
          gradient lives down there.
        */}
        <motion.div
          className="absolute"
          style={{
            left: 0,
            top: -1.79,
            width: 440.908,
            height: 968,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.76) 0%, rgba(255,255,255,0.70) 38%, rgba(255,255,255,0.40) 72%, rgba(255,255,255,0.22) 100%)',
            backdropFilter: 'blur(30px) saturate(105%)',
            WebkitBackdropFilter: 'blur(30px) saturate(105%)',
          }}
          initial={{ opacity: 0 }}
          /* Breathes rather than sitting flat, and only just: a veil that
             pulses hard makes what is under it flicker in and out of
             legibility, which reads as a rendering fault. */
          animate={
            !active
              ? { opacity: 0 }
              : cleared
                ? /* Goes with the colour. It is the frost the wash travelled
                     under, so it has no business outliving it. */
                  { opacity: 0 }
                : fired
                  ? { opacity: 1 }
                  : { opacity: [1, 0.88, 1] }
          }
          transition={
            cleared
              ? { duration: 0.5, ease: 'easeOut' }
              : fired
              ? { duration: FIRE_MS / 1000, ease: 'easeOut' }
              : active
                ? { opacity: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' } }
                : { duration: 0.55, ease: IN_EASE }
          }
        />

        {/* The swell on top of it, which is what carries most of the pulse:
            brightening one area reads as the frost thickening and thinning,
            where pulsing the whole veil just dims the screen. Its period is
            off the veil's so the two never peak together. */}
        <motion.div
          className="absolute"
          style={{
            left: 0,
            top: -1.79,
            width: 440.908,
            height: 968,
            background:
              'radial-gradient(58% 38% at 50% 34%, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.12) 52%, rgba(255,255,255,0) 100%)',
          }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={
            active
              ? fired
                ? { opacity: 0, scale: 1.04 }
                : { opacity: [0.4, 0.8, 0.4], scale: [0.97, 1.04, 0.97] }
              : { opacity: 0, scale: 0.94 }
          }
          transition={
            active
              ? {
                  opacity: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
                  scale: { duration: 3.7, repeat: Infinity, ease: 'easeInOut' },
                }
              : { duration: 0.55, ease: IN_EASE }
          }
        />

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
            /* The feathering flips once it has fired — it fades the wash out
               at whichever edge it is travelling away from. Fixed, it would
               put a hard line across the top the moment it arrived. */
            transition: 'mask-image 0.5s ease',
            maskImage: fired
              ? 'linear-gradient(to bottom, black 0px, black 100%)'
              : 'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.10) 90px, rgba(0,0,0,0.34) 190px, rgba(0,0,0,0.72) 290px, black 380px, black 100%)',
            WebkitMaskImage: fired
              ? 'linear-gradient(to bottom, black 0px, black 100%)'
              : 'linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.10) 90px, rgba(0,0,0,0.34) 190px, rgba(0,0,0,0.72) 290px, black 380px, black 100%)',
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
                  : { opacity: 1, y: 0, scaleY: 1, scaleX: 1 }
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
                : { duration: RISE_MS / 1000, ease: [0.4, 0, 0.2, 1] }
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
                'radial-gradient(closest-side, rgba(200,182,240,0.86) 0%, rgba(238,186,246,0.58) 38%, rgba(250,188,182,0.4) 70%, rgba(250,236,186,0.24) 100%)',
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
                'radial-gradient(closest-side, rgba(255,246,232,0.62) 0%, rgba(255,242,224,0.4) 30%, rgba(255,238,214,0.2) 62%, rgba(255,255,255,0) 100%)',
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
