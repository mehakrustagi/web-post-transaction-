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
const BEATS = [
  { at: 0.41, step: 'clearing' },
  /* The machine is most of the way gone before the colour starts, so the wash
     is washing over a resting slip rather than over a printer mid-exit. */
  { at: 0.95, step: 'wash' },
  /*
   * Everything from here is pinned to the wash's own clock, which runs
   * 620ms up, 1500ms held, then the launch. `card` is not in this list: the
   * wash calls it at the moment it fires, so the page is uncovered under the
   * thickest part of it rather than on a timer that has to be kept in step.
   */
  { at: 3.9, step: 'landed' },
  { at: 5.3, step: 'explore' },
  { at: 7.9, step: 'more' },
] as const

type Step = (typeof BEATS)[number]['step'] | 'printing' | 'card'

const clamp = (v: number) => Math.min(0, Math.max(FLOOR, v))
const stopAt = (y: number): MapStop => (y > -300 ? 'page' : y > -740 ? 'explore' : 'more')

export default function TransactionApp() {
  const scale = useFitScale()
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
    timers.current = BEATS.map((b) => window.setTimeout(() => setStep(b.step), b.at * 1000))
  }, [])

  const washing = step === 'wash' || step === 'card' || step === 'landed' || step in MAP_SCROLL
  const landed = step === 'landed' || step in MAP_SCROLL
  const page = step === 'card' || landed
  /*
   * The print scene stays mounted right up to the page. It owns the flag, the
   * country line and the headline — and their arrival — so keeping it is both
   * less code than a second copy of them and the only way they keep the
   * entrance they were written with.
   */
  const showPrint = !page

  useEffect(() => {
    if (still || !page) return
    const run = animate(spin, Math.PI * 2, { duration: 34, ease: 'linear', repeat: Infinity })
    const warming = animate(tint, 1, { delay: 0.6, duration: 1.1, ease: 'easeInOut' })
    return () => {
      run.stop()
      warming.stop()
    }
  }, [page, spin, tint, still])

  /* Called the instant the wash launches, which is the only moment the card is
     covered thickly enough for the page to appear without being seen to. */
  const uncover = useCallback(() => setStep((s) => (s === 'wash' ? 'card' : s)), [])

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
            <AnimatePresence>
              {showPrint && (
                <motion.div
                  key={`print-${run}`}
                  className="absolute inset-0"
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
                    onRest={onRest}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/*
              The page, which the wash does not so much uncover as drag into
              frame behind itself. It comes up from below on the same beat the
              receipt goes up and out, so the two of them read as one movement
              through the card rather than as a swap that happened under cover.
            */}
            <motion.div
              className="absolute inset-0"
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

            {/* Over everything, because covering everything is its whole job. */}
            <BloomWash active={washing} onFired={uncover} key={`wash-${run}`} />

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
