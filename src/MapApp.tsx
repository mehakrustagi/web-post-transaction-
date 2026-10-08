import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { Header } from './components/Header'
import { PrintScene } from './scenes/PrintScene'
import { MapScene, type MapBeat } from './scenes/MapScene'
import { MAP_PAGE_H, MAP_SCROLL, MAP_STOPS, MapPage, type MapStop } from './scenes/MapPage'
import { Ribbon } from './scenes/PageScene'
import { SparklesProvider } from './components/ui/sparkles'
import { MAP_OFFER } from './content'

const FRAME_W = 1282
const FRAME_H = 915
const FLOOR = -(MAP_PAGE_H - FRAME_H)

/**
 * The sequence after the printer has finished, in seconds from the moment the
 * slip comes to rest. The machine leaves, the slip turns on its side, a line
 * walks across the card printing the world behind it, the routes draw, and the
 * dots gather into the orb — which then takes its place in the card.
 */
const BEATS = [
  { at: 0.4, step: 'clearing' },
  { at: 0.88, step: 'turn' },
  { at: 2.08, step: 'scan' },
  { at: 4.48, step: 'routes' },
  { at: 7.84, step: 'orb' },
  { at: 9.7, step: 'card' },
  /* Once it has settled it stops being a thing flying over the page and
     becomes the card's artwork, drawn behind the card's own text. */
  { at: 11.2, step: 'landed' },
  { at: 12.4, step: 'explore' },
  { at: 15.0, step: 'more' },
] as const

type Step = (typeof BEATS)[number]['step'] | 'printing'

/** And while one of these is, the map is. */
const MAP_BEATS: MapBeat[] = ['turn', 'scan', 'routes', 'orb', 'card']

const clamp = (v: number) => Math.min(0, Math.max(FLOOR, v))
const stopAt = (y: number): MapStop => (y > -300 ? 'page' : y > -740 ? 'explore' : 'more')

export default function MapApp() {
  const scale = useFitScale()
  const still = useReducedMotion()
  const [run, setRun] = useState(0)
  const [step, setStep] = useState<Step>('printing')
  const timers = useRef<number[]>([])

  /*
   * The orb's turning and its colour live up here, not in the scene that
   * starts them. The scene is swapped for one drawn inside the card when it
   * lands, and if the sphere began its revolution again there the swap would
   * be a visible snap — it has to stay the same orb all the way through.
   */
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

  const mapping = MAP_BEATS.includes(step as MapBeat)
  const landed = step === 'landed' || step in MAP_SCROLL
  const page = step === 'card' || landed
  /*
   * The print scene stays mounted right up to the page. It owns the flag, the
   * country line and the headline — and their arrival — so keeping it is both
   * less code than a second copy of them and the only way they keep the
   * entrance they were written with.
   */
  const showPrint = !page
  const beat: MapBeat = mapping ? (step as MapBeat) : page ? 'card' : 'turn'


  /*
   * The orb's turning outlives the scene that gave it to us: that scene is
   * unmounted when the orb becomes the card's artwork, so an animation started
   * inside it would stop there. Driven from here it simply carries on.
   */
  const turning = step === 'orb' || page
  useEffect(() => {
    if (still || !turning) return
    const run = animate(spin, Math.PI * 2, { duration: 34, ease: 'linear', repeat: Infinity })
    const warming = animate(tint, 1, { duration: 1.5, ease: 'easeInOut' })
    return () => {
      run.stop()
      warming.stop()
    }
  }, [turning, spin, tint, still])

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
                  /* From `turn` on the slip belongs to `MapScene`, which
                     starts it exactly where this one left it. */
                  handOver={mapping}
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

            <MapPage at={stop} show={page} landed={landed} spin={spin} />
            <Ribbon show={page} label={MAP_OFFER.ribbon} />

            {(mapping || page) && !landed && <MapScene spin={spin} tint={tint} key={`map-${run}`} beat={beat} />}
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
