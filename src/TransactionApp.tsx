import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { FRAME_H, FRAME_W, useFrameFit } from './useFrameFit'
import { Header } from './components/Header'
import { PrintScene } from './scenes/PrintScene'
import { HANDOVER } from './scenes/OrbScene'
import { EDGE_H, WashEdge, WashTrace } from './scenes/BloomWash'
import { MAP_PAGE_H, MAP_SCROLL, MAP_STOPS, MapPage, type MapStop } from './scenes/MapPage'
import { Ribbon } from './scenes/PageScene'
import { SparklesProvider } from './components/ui/sparkles'
import { MAP_OFFER } from './content'

const FLOOR = -(MAP_PAGE_H - FRAME_H)
/**
 * Where the incoming page waits while the printer is still working.
 *
 * Measured from the glow rather than from the page: the band's own top edge
 * lands about two thirds down the card, so the colour fills the foot and
 * fades to nothing before it reaches the heading. The page itself is still
 * far below. Tying this to the page's height instead is what flooded the
 * whole screen the moment the band grew.
 */
const PARK = Math.round(FRAME_H * 0.68) + EDGE_H

/**
 * The orb variant with its middle replaced.
 *
 * Same opening, same page, same everything below — what goes is the pair of
 * beats in between: the slip coming apart into dots and the sphere settling
 * into the card. The colour wash from the onboarding build's post-payment
 * screen does that work instead, which is a different kind of transition
 * altogether: the dots are the receipt *becoming* the thing it introduces,
 * where the wash simply covers the card and hands back a different one. It is
 * the move a payment makes, and this is what happens after a payment.
 */
/**
 * What happens once the slip is down, in seconds from the moment it lands.
 *
 * One clock, and it starts at the drop. The colour has been cooking at the
 * foot of the page the whole time the printer was working, so there is nothing
 * to wait for: the slip lands, the wash goes up and takes the receipt with it,
 * and only once the frame is actually empty does the last page come up into
 * it. Nothing here shares the frame with anything else — the gaps are the
 * point, not slack to be tightened out.
 */
const AFTER = [
  /*
   * Half a second after the slip is down. The receipt is allowed to land and
   * be read before anything starts taking it away — arriving on the same beat
   * it settled, the colour was competing with it.
   */
  { at: 0.5, step: 'cook' },
  /* Up it goes, and the receipt goes with it. */
  { at: 1.9, step: 'fire' },
  /*
   * Six tenths into the rise, by which point the page's own background has
   * covered the middle of the card and there is nothing left of the receipt
   * to see go.
   */
  { at: 2.5, step: 'card' },
  /* And the card's own artwork arrives once the page has landed. */
  /*
   * And everything on the page arrives together.
   *
   * There is no tour down it any more: the blocks below were revealed by
   * being scrolled to, which meant the page sat two thirds empty waiting to
   * be driven. It loads as a page, and the reader scrolls it themselves.
   */
  { at: 3.4, step: 'landed' },
] as const

const ORDER = ['printing', 'cook', 'fire', 'card', 'landed', 'explore', 'more'] as const

type Step = (typeof ORDER)[number]

const reached = (step: Step, mark: Step) => ORDER.indexOf(step) >= ORDER.indexOf(mark)

const clamp = (v: number) => Math.min(0, Math.max(FLOOR, v))
const stopAt = (y: number): MapStop => (y > -300 ? 'page' : y > -740 ? 'explore' : 'more')

export default function TransactionApp() {
  const scale = useFrameFit()
  const still = useReducedMotion()
  const [run, setRun] = useState(0)
  const [step, setStep] = useState<Step>('printing')
  const timers = useRef<number[]>([])

  /* The card's artwork turns and warms exactly as it does on the orb page —
     it is simply already in the card rather than having flown there. */
  const spin = useMotionValue(0)
  const tint = useMotionValue(0)

  const y = useMotionValue(0)
  const byHand = useRef(false)
  const [stop, setStop] = useState<MapStop>('page')

  useEffect(() => {
    const seen = (next: MapStop) =>
      setStop((cur) => (MAP_STOPS.indexOf(next) > MAP_STOPS.indexOf(cur) ? next : cur))
    seen(stopAt(y.get()))
    return y.on('change', (v) => seen(stopAt(v)))
  }, [y])

  useEffect(() => {
    setStep(still ? 'card' : 'printing')
    byHand.current = false
    setStop('page')
    y.set(0)
    spin.set(0)
    tint.set(0)
    return () => timers.current.forEach(clearTimeout)
  }, [run, still, y, spin, tint])

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!(step in MAP_SCROLL)) return
      byHand.current = true
      y.stop()
      y.set(clamp(y.get() - e.deltaY))
    },
    [step, y],
  )

  /* The rig calls this when the slip has stopped swinging. */
  const onRest = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = AFTER.map((b) => window.setTimeout(() => setStep(b.step), b.at * 1000))
  }, [])

  const landed = step === 'landed' || step in MAP_SCROLL
  const page = step === 'card' || landed

  /* Everything below is shown the moment the page is up, rather than as it
     is scrolled past. */
  useEffect(() => {
    if (!landed) return
    setStop(MAP_STOPS[MAP_STOPS.length - 1])
  }, [landed])
  const cooking = reached(step, 'cook')
  const firing = reached(step, 'fire')
  /*
   * The print scene stays mounted right up to the page. It owns the flag, the
   * country line and the headline — and their arrival — so keeping it is both
   * less code than a second copy of them and the only way they keep the
   * entrance they were written with.
   */
  /*
   * The card stays exactly where it is until the sheet has taken it. It used
   * to fly up and out on its own curve at the same moment the wash went, which
   * is two things leaving at once — the overlap. There is nothing for it to do
   * here: it is removed by being passed over.
   */
  const showPrint = !reached(step, 'card')

  useEffect(() => {
    if (still || !page) return
    const run = animate(spin, Math.PI * 2, { duration: 34, ease: 'linear', repeat: Infinity })
    const warming = animate(tint, 1, { delay: 0.6, duration: 1.1, ease: 'easeInOut' })
    return () => {
      run.stop()
      warming.stop()
    }
  }, [page, spin, tint, still])

  return (
    <SparklesProvider>
      <main
        className="h-screen w-screen cursor-pointer overflow-hidden bg-canvas"
        onClick={() => setRun((n) => n + 1)}
        onWheel={onWheel}
      >
        {/* Centred and scaled to cover, so the design fills the window instead
          of sitting on it as a card. */}
      <div className="relative h-full w-full select-none overflow-hidden">
        <div
          className="absolute left-1/2 top-1/2 overflow-hidden"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
            {/* The card itself, which this route owns so the colour can go
                between it and the paper standing on it. */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'linear-gradient(101.874deg, #dedede 15.131%, #ffffff 57.588%, #cdcdcd 100.56%)',
              }}
            />

            {/*
              And what the card becomes. The last page climbs into frame from
              below, so for the length of that climb there is a strip above it
              with nothing of the page in it — against the card's own grey that
              strip read as a band across the top. Switching the base to the
              page's colour as the sheet fires means whatever is behind the
              page on its way up is already the page's background.
            */}
            <motion.div
              className="absolute inset-0 bg-canvas"
              initial={{ opacity: 0 }}
              animate={{ opacity: firing ? 1 : 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />


            <AnimatePresence>
              {showPrint && (
                <motion.div
                  key={`print-${run}`}
                  className="absolute inset-0 z-[2]"
                  initial={{ opacity: 1 }}
                  /* Cut, not animated. By the time this unmounts the sheet is
                     over the top of it, so anything it did here would be work
                     nobody can see — and a card fading under an opaque wash is
                     exactly the kind of second movement that reads as clutter. */
                  /* Carried off rather than cut. The dome is over it when
                     this runs, so what little shows reads as the colour
                     taking it with it. */
                  exit={{ opacity: 0, y: -70 }}
                  transition={{ duration: 0.45, ease: [0.5, 0, 0.3, 1] }}
                >
                  <PrintScene
                    hero={!page}
                    leaving={step !== 'printing'}
                    detached={false}
                    handOver={false}
                    fill={false}
                    onRest={onRest}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/*
              The last page. It does not travel at all any more: the surface
              above is closing onto the card that is already sitting here, so
              everything this page does happens under cover and all a slide
              would add is a movement nobody can see.
            */}
            <motion.div
              className="absolute inset-0 z-[2]"
              initial={{ y: FRAME_H + EDGE_H }}
              /*
               * It comes up a little as it arrives. The swap itself happens
               * under the dome's core, so this is not how the page gets here
               * — it is the tail of the move you actually see as the colour
               * clears, and it is what makes the screen feel like it went
               * with the wash rather than being replaced behind it.
               */
              /*
               * The one thing that moves.
               *
               * Parked below the card while the printer works, far enough
               * down that only the top of its glow reaches the foot. Then it
               * comes all the way up, and because the page's own background
               * is opaque the receipt is covered by the page arriving rather
               * than by anything laid over it. Nothing cross-fades with
               * anything, which is the whole reason it reads as smooth.
               */
              animate={{ y: firing ? 0 : cooking ? PARK : FRAME_H + EDGE_H }}
              transition={{
                duration: firing ? 1.35 : 0.9,
                ease: firing ? [0.42, 0, 0.18, 1] : [0.33, 0, 0.2, 1],
              }}
            >
              <WashEdge show={cooking} full={firing} />

              {/*
                The surface itself, opaque from the moment it starts moving.
                The page's own content only fades up once it has landed, so
                without this the thing rising is a gradient with nothing
                behind it — and the receipt went on showing underneath the
                white instead of being covered by it. This is what the
                receipt disappears behind.
              */}
              <div
                className="absolute left-0 top-0 w-full bg-canvas"
                style={{ height: MAP_PAGE_H }}
              />

              {/* What the page keeps of what brought it in. */}
              <WashTrace />
            <motion.div className="absolute inset-0" style={{ y }}>
              <MapPage at={stop} show={page} landed={landed} spin={spin} canvas={HANDOVER} fill={false} />
              <Ribbon show={page} label={MAP_OFFER.ribbon} />
            </motion.div>
            </motion.div>

            {/*
              No bar behind it on this route.
              
              `onPage` gives the header an opaque fill and a hairline, and it
              turns on the moment the page step lands — which is six tenths
              into the rise, so a white strip snapped across the top while
              the colour was still travelling under it and cut the band in
              two. The design has the lockup sitting straight on the wash
              with nothing behind it, which is also the only version of this
              that lets the gradient past.
            */}
            <Header dark={false} />
          </div>
        </div>
      </main>
    </SparklesProvider>
  )
}

