import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { Header } from './components/Header'
import { PrintScene } from './scenes/PrintScene'
import { OrbScene, type OrbBeat } from './scenes/OrbScene'
import { MAP_PAGE_H, MAP_SCROLL, MAP_STOPS, MapPage, type MapStop } from './scenes/MapPage'
import { Ribbon } from './scenes/PageScene'
import { SparklesProvider } from './components/ui/sparkles'
import { MAP_OFFER } from './content'

const FRAME_W = 1282
const FRAME_H = 915
const FLOOR = -(MAP_PAGE_H - FRAME_H)

/**
 * The sequence after the printer has finished, in seconds from the moment the
 * slip comes to rest. The machine leaves, the slip comes apart into its own
 * dots, and they gather into the orb — which then takes its place in the card.
 * The map variant's world is simply not in it.
 */
const BEATS = [
  { at: 0.5, step: 'clearing' },
  { at: 1.2, step: 'crumble' },
  { at: 3.2, step: 'orb' },
  { at: 5.6, step: 'card' },
  /* Once it has settled it stops being a thing flying over the page and
     becomes the card's artwork, drawn behind the card's own text. */
  { at: 7.5, step: 'landed' },
  { at: 9.0, step: 'explore' },
  { at: 12.2, step: 'more' },
] as const

type Step = (typeof BEATS)[number]['step'] | 'printing'

/** And while one of these is, the dots are. */
const ORB_BEATS: OrbBeat[] = ['crumble', 'orb', 'card']

const clamp = (v: number) => Math.min(0, Math.max(FLOOR, v))
const stopAt = (y: number): MapStop => (y > -300 ? 'page' : y > -740 ? 'explore' : 'more')

export default function OrbApp() {
  const scale = useFitScale()
  const still = useReducedMotion()
  const [run, setRun] = useState(0)
  const [step, setStep] = useState<Step>('printing')
  const timers = useRef<number[]>([])

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
    return () => timers.current.forEach(clearTimeout)
  }, [run, still, y])

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

  const dusting = ORB_BEATS.includes(step as OrbBeat)
  const landed = step === 'landed' || step in MAP_SCROLL
  const page = step === 'card' || landed
  /*
   * The print scene stays mounted right up to the page. It owns the flag, the
   * country line and the headline — and their arrival — so keeping it is both
   * less code than a second copy of them and the only way they keep the
   * entrance they were written with.
   */
  const showPrint = !page
  const beat: OrbBeat = dusting ? (step as OrbBeat) : page ? 'card' : 'rest'

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
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeInOut' }}
              >
                <PrintScene
                  hero={!page}
                  leaving={step !== 'printing'}
                  detached={false}
                  /* From `crumble` on the slip belongs to `OrbScene`, which
                     starts it exactly where this one left it. */
                  handOver={dusting}
                  onRest={onRest}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/*
            Above the printing card, not under it. `PrintScene` paints the
            card's own gradient and stays mounted for the heading, so left
            after this it covered the map with it.
          */}
          {/* The page, and the orb that lands in it, travel together. */}
          <motion.div className="absolute inset-0" style={{ y }}>
            <motion.div
              className="absolute left-0 top-0 w-full bg-canvas"
              style={{ height: MAP_PAGE_H }}
              animate={{ opacity: page ? 1 : 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />

            <MapPage at={stop} show={page} landed={landed} />
            <Ribbon show={page} label={MAP_OFFER.ribbon} />

            {(dusting || page) && !landed && <OrbScene key={`orb-${run}`} beat={beat} />}
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
