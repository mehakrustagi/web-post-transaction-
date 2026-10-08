import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { FRAME_H, FRAME_W, useFrameFit } from './useFrameFit'
import { Header } from './components/Header'
import { PrintScene } from './scenes/PrintScene'
import { HANDOVER } from './scenes/OrbScene'
import { BloomWash } from './scenes/BloomWash'
import { MAP_PAGE_H, MAP_SCROLL, MAP_STOPS, MapPage, type MapStop } from './scenes/MapPage'
import { Ribbon } from './scenes/PageScene'
import { SparklesProvider } from './components/ui/sparkles'
import { MAP_OFFER } from './content'

const FLOOR = -(MAP_PAGE_H - FRAME_H)

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
  /* Up it goes, and the card goes with it. */
  { at: 1.9, step: 'fire' },
  /*
   * A third of a second into the launch — while the sheet is over everything
   * from the heading down, not after it has gone. Swapping once it had passed
   * left the frame genuinely empty for a beat, which is the one thing worse
   * than an overlap. Hidden under an opaque wash, the overlap costs nothing:
   * the card goes and the page starts climbing in the same covered moment,
   * and what you actually see is the tail of that climb as the sheet clears.
   */
  { at: 2.25, step: 'card' },
  /* As the surface finishes closing and lets go of the card beneath it, which
     is identical to it — so the hand-over is the content appearing rather
     than the colour changing. */
  { at: 3.5, step: 'landed' },
  { at: 4.9, step: 'explore' },
  { at: 7.5, step: 'more' },
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
    if (byHand.current || !(step in MAP_SCROLL)) return
    const run = animate(y, MAP_SCROLL[step as MapStop], { duration: 1.6, ease: [0.5, 0, 0.2, 1] })
    return () => run.stop()
  }, [step, y])

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

            {/* On the card, under the paper. */}
            <BloomWash cook={cooking} fire={firing} key={`wash-${run}`} />

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
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.01 }}
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
              initial={false}
              animate={{ opacity: page ? 1 : 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
            <motion.div className="absolute inset-0" style={{ y }}>
              <motion.div
                className="absolute left-0 top-0 w-full bg-canvas"
                style={{ height: MAP_PAGE_H }}
                animate={{ opacity: page ? 1 : 0 }}
                /* Snappier than the orb page's nine tenths of a second. There
                   it had the gathering to hide behind; here it is happening
                   under a wash that is already leaving. */
                transition={{ duration: 0.45, ease: 'easeInOut' }}
              />

              <MapPage at={stop} show={page} landed={landed} spin={spin} canvas={HANDOVER} />
              <Ribbon show={page} label={MAP_OFFER.ribbon} />
            </motion.div>
            </motion.div>

            <Header dark={false} onPage={page} />
          </div>
        </div>
      </main>
    </SparklesProvider>
  )
}

