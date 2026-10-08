import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { Header } from './components/Header'
import { PrintScene } from './scenes/PrintScene'
import { HANDOVER } from './scenes/OrbScene'
import { BloomWash } from './scenes/BloomWash'
import { MAP_PAGE_H, MAP_SCROLL, MAP_STOPS, MapPage, type MapStop } from './scenes/MapPage'
import { Ribbon } from './scenes/PageScene'
import { SparklesProvider } from './components/ui/sparkles'
import { MAP_OFFER } from './content'

const FRAME_W = 1282
const FRAME_H = 915
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
  /* The launch, and the receipt leaving on it. */
  { at: 0, step: 'fire' },
  /* A clear beat later than the receipt's 0.78s exit, so the page is coming
     up into an empty frame rather than past a slip still on its way out. */
  { at: 0.9, step: 'card' },
  { at: 1.8, step: 'landed' },
  { at: 3.2, step: 'explore' },
  { at: 5.8, step: 'more' },
] as const

type Step = (typeof AFTER)[number]['step'] | 'printing'

const clamp = (v: number) => Math.min(0, Math.max(FLOOR, v))
const stopAt = (y: number): MapStop => (y > -300 ? 'page' : y > -740 ? 'explore' : 'more')

export default function TransactionApp() {
  const scale = useFitScale()
  const still = useReducedMotion()
  const [run, setRun] = useState(0)
  const [step, setStep] = useState<Step>('printing')
  /** The slip is all the way out. Nothing about the card changes before this. */
  const [printed, setPrinted] = useState(false)
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
    setPrinted(false)
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
  /*
   * It warms up only once the slip is all the way out, and is at full strength
   * by the time it lands. Started with the print it was colour arriving on a
   * card that was still being worked on — there is nothing to transition away
   * from until the thing being transitioned away from actually exists.
   */
  const cooking = printed && !page
  const firing = step !== 'printing'
  /*
   * The print scene stays mounted right up to the page. It owns the flag, the
   * country line and the headline — and their arrival — so keeping it is both
   * less code than a second copy of them and the only way they keep the
   * entrance they were written with.
   */
  const showPrint = step === 'printing'

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
        className="grid min-h-screen cursor-pointer place-items-center bg-canvas"
        onClick={() => setRun((n) => n + 1)}
        onWheel={onWheel}
      >
        {/* The frame inside is absolute, so this has to be what it is absolute to. */}
        <div
          className="relative select-none"
          style={{ width: FRAME_W * scale, height: FRAME_H * scale }}
        >
          <div
            className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[40px]"
            style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}
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

            {/* On the card, under the paper. */}
            <BloomWash cook={cooking} fire={firing} key={`wash-${run}`} />

            <AnimatePresence>
              {showPrint && (
                <motion.div
                  key={`print-${run}`}
                  className="absolute inset-0 z-[2]"
                  initial={{ opacity: 1 }}
                  /*
                   * Swept up, not faded out. The wash launches at this exact
                   * moment and the receipt is under the thickest part of it,
                   * so it leaves on the wash's own curve rather than on its
                   * own — the colour is not passing over a card that quietly
                   * dissolves, it is taking the card with it.
                   */
                  exit={{ opacity: 0, y: -300 }}
                  transition={{
                    y: { duration: 0.78, ease: [0.72, 0, 0.24, 1] },
                    opacity: { duration: 0.5, ease: 'easeIn' },
                  }}
                >
                  <PrintScene
                    hero={!page}
                    leaving={step !== 'printing'}
                    detached={false}
                    handOver={false}
                    fill={false}
                    onRest={onRest}
                    onPrinted={() => setPrinted(true)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/*
              The last page, pulled up into a frame the wash has just emptied.
              It waits for the receipt to be gone rather than crossing it on
              the way in — the two travelling at once is the clutter, not the
              speed.
            */}
            <motion.div
              className="absolute inset-0 z-[2]"
              initial={false}
              animate={{ y: page ? 0 : 150, opacity: page ? 1 : 0 }}
              transition={{
                y: { duration: 0.86, ease: [0.18, 0.72, 0.24, 1] },
                opacity: { duration: 0.5, ease: 'easeOut' },
              }}
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

function useFitScale() {
  const [scale, setScale] = useState(1)
  const measure = useCallback(() => {
    const pad = 48
    setScale(Math.min(1, (window.innerWidth - pad) / FRAME_W, (window.innerHeight - pad) / FRAME_H))
  }, [])
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])
  return scale
}
