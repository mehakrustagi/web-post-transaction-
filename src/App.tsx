import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { Header } from './components/Header'
import { PrintScene } from './scenes/PrintScene'
import { type Beat, GiftScene } from './scenes/GiftScene'
import { PageScene, Ribbon, RibbonFold } from './scenes/PageScene'
import { PageBelow } from './scenes/PageBelow'

/** The design is a run of fixed frames; everything inside is in their coordinates. */
const FRAME_W = 1282
const FRAME_H = 915
/** The last frame is not a frame but a page, and it runs past the viewport. */
const PAGE_H = 2741
/** How far up the page can travel before its foot is on screen. */
const FLOOR = -(PAGE_H - FRAME_H)

/**
 * The sequence after the printer has finished, in seconds from the moment the
 * slip comes to rest. The printing itself is not on a clock — the rig runs the
 * machine's own script and says when it is done, because the feed slows over
 * every printed line and so takes as long as the slip is long.
 */
const BEATS = [
  /* The printer and the headline leave, so the slip has the frame to itself. */
  { at: 0.6, step: 'clearing' },
  /* The slip shrinks back to the middle; the card turns over behind it at the
     same moment, which is the only time the two cards share the screen. */
  { at: 1.2, step: 'detached' },
  /* The bare card and the truck's arrival say the same thing, so the gap
     between them is only as long as it takes the vehicle to appear. */
  { at: 2.6, step: 'gift' },
  /* Long enough to hold the line unrevealed, sweep it, and then look at it. */
  { at: 5.0, step: 'pickup' },
  { at: 9.6, step: 'detail' },
  { at: 12.6, step: 'page' },
  /* The page carries on below the fold, so it takes itself down it. */
  { at: 15.8, step: 'offers' },
  { at: 19.6, step: 'explore' },
  { at: 23.0, step: 'more' },
] as const

/** How far the page has scrolled at each stop, in frame pixels. */
const SCROLL: Record<string, number> = {
  page: 0,
  offers: -620,
  explore: -1300,
  more: -1830,
}

/**
 * Which blocks have been reached, from the scroll position rather than from
 * the clock — so a block still arrives when the page is scrolled by hand past
 * the point the tour would have stopped at.
 */
const STOPS = ['page', 'offers', 'explore', 'more'] as const
type Stop = (typeof STOPS)[number]
const stopAt = (y: number): Stop =>
  y > -400 ? 'page' : y > -1000 ? 'offers' : y > -1600 ? 'explore' : 'more'

const clamp = (v: number) => Math.min(0, Math.max(FLOOR, v))

type Step = (typeof BEATS)[number]['step'] | 'printing'

/** While one of these is current, the light card is the one on screen. */
const PRINT_STEPS: Step[] = ['printing', 'clearing']
/** While one of these is current, the slip is still somewhere on screen. */
const SLIP_STEPS: Step[] = [...PRINT_STEPS, 'detached']
const DARK_BEATS: Beat[] = ['gift', 'pickup', 'detail']

export default function App() {
  const scale = useFitScale()
  const still = useReducedMotion()
  /* Bumping this restarts the sequence, which is the whole replay mechanism. */
  const [run, setRun] = useState(0)
  const [step, setStep] = useState<Step>('printing')
  const timers = useRef<number[]>([])

  /*
   * The page's own scroll. The tour drives it until the reader does, and from
   * then on it is theirs — a page that keeps yanking itself back to the next
   * stop under the hand is worse than one that does not move at all.
   */
  const y = useMotionValue(0)
  const byHand = useRef(false)
  const [stop, setStop] = useState<Stop>('page')

  useEffect(() => {
    /* `stop` only ever goes forward: a block that has arrived has arrived. */
    const seen = (next: Stop) =>
      setStop((cur) => (STOPS.indexOf(next) > STOPS.indexOf(cur) ? next : cur))
    seen(stopAt(y.get()))
    return y.on('change', (v) => seen(stopAt(v)))
  }, [y])

  useEffect(() => {
    if (byHand.current || !(step in SCROLL)) return
    const run = animate(y, SCROLL[step], { duration: 1.6, ease: [0.5, 0, 0.2, 1] })
    return () => run.stop()
  }, [step, y])

  useEffect(() => {
    setStep(still ? 'page' : 'printing')
    byHand.current = false
    setStop('page')
    y.set(0)
    return () => timers.current.forEach(clearTimeout)
  }, [run, still, y])

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!(step in SCROLL)) return
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

  /*
   * The light card stays up through the detach — it is the slip's own fade
   * that ends it, not the clock, so the dark card can start coming up
   * underneath while the paper is still visible.
   */
  /* The light card is the one being read … */
  const printing = PRINT_STEPS.includes(step)
  /* … but it stays mounted past that, because the slip is still leaving it. */
  const showPrint = SLIP_STEPS.includes(step)
  /* Every stop from `page` on is the same frame, just scrolled further. */
  const page = step in SCROLL
  const beat: Beat = DARK_BEATS.includes(step as Beat)
    ? (step as Beat)
    : step === 'detached'
      ? 'logo'
      : page
        ? 'card'
        : 'detail'

  return (
    <main
      className="grid min-h-screen cursor-pointer place-items-center bg-canvas"
      onClick={() => setRun((n) => n + 1)}
      onWheel={onWheel}
    >
      <div
        className="relative origin-top-left select-none"
        style={{
          width: FRAME_W * scale,
          height: FRAME_H * scale,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[40px]"
          style={{ width: FRAME_W, height: FRAME_H, transform: `scale(${scale})` }}
        >
          {/*
            The page and everything on it travel together. The frame is 2741
            tall and the viewport is 915, so the stops below just move this.
          */}
          <motion.div
            className="absolute inset-0"
            style={{ y }}
          >
            <motion.div
              className="absolute left-0 top-0 w-full bg-canvas"
              style={{ height: 2741 }}
              animate={{ opacity: page ? 1 : 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />

            <PageScene show={page} />

            {/* The tucked corner goes under the card; the flash goes over it. */}
            <RibbonFold show={page} />

          {/*
              The gift, from the bare card through to the one on the page.

              It is one scene with two layouts, not a full-frame scene and a
              card that cross-fade: the last beat moves every part of it into
              the card's box rather than handing over to a copy of itself. See
              `GiftScene`.
            */}
            <AnimatePresence initial={false}>
              {!printing && (
                <motion.div
                  key={`gift-${run}`}
                  className="absolute inset-0"
                  /*
                   * No fade in. It is stacked *under* the light card and simply
                   * uncovered as that one dissolves — a cross-fade between a
                   * near-white card and a near-black one spends half a second
                   * averaging the two into grey, which looks like a fault.
                   */
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                >
                  <GiftScene beat={beat} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Over the card, where the design puts it. */}
            <Ribbon show={page} />

            {page && <PageBelow at={stop} />}
          </motion.div>

          <AnimatePresence initial={false}>
            {showPrint && (
              <motion.div
                key={`print-${run}`}
                className="absolute inset-0"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                /* Short, so the two cards spend as little time as possible
                   averaging each other out into grey. */
                transition={{ duration: 0.55, ease: 'easeInOut' }}
              >
                <PrintScene
                  leaving={step !== 'printing'}
                  detached={step === 'detached'}
                  onRest={onRest}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <Header dark={!printing && !page} onPage={page} />
        </div>
      </div>
    </main>
  )
}

/** Keeps the fixed frame fully on screen whatever the window is. */
function useFitScale() {
  const [scale, setScale] = useState(1)

  const measure = useCallback(() => {
    const pad = 48
    setScale(
      Math.min(1, (window.innerWidth - pad) / FRAME_W, (window.innerHeight - pad) / FRAME_H),
    )
  }, [])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  return scale
}
