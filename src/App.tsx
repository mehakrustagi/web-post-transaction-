import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'framer-motion'
import { FRAME_H, FRAME_W, useFrameFit } from './useFrameFit'
import { Header } from './components/Header'
import { PrintScene } from './scenes/PrintScene'
import { type Beat, GiftScene } from './scenes/GiftScene'
import { PageScene, Ribbon, RibbonFold } from './scenes/PageScene'
import { PageBelow } from './scenes/PageBelow'
import { HANDOVER } from './scenes/OrbScene'

/** The design is a run of fixed frames; everything inside is in their coordinates. */
/** The last frame is not a frame but a page, and it runs past the viewport. */
/** How far up the page can travel before its foot is on screen. */
const FLOOR = -620

/**
 * The sequence after the printer has finished, in seconds from the moment the
 * slip comes to rest. The printing itself is not on a clock — the rig runs the
 * machine's own script and says when it is done, because the feed slows over
 * every printed line and so takes as long as the slip is long.
 */
const BEATS = [
  /* The printer goes, the instant the slip is down. The heading has been
     gone since the cut started. */
  { at: 0.04, step: 'clearing' },
  /* And the slip shrinks straight back into the gift, which is what the cut
     was for — the card turns over behind it at the same moment, the only time
     the two cards share the screen. */
  { at: 0.16, step: 'detached' },
  /* The bare card and the truck's arrival say the same thing, so the gap
     between them is only as long as it takes the vehicle to appear. */
  { at: 0.95, step: 'gift' },
  /* Long enough to hold the line unrevealed, sweep it, and then look at it. */
  { at: 2.75, step: 'pickup' },
  /*
   * Straight off the back of the reveal. The sweep now finishes at about 5.2
   * and this used to wait until 7, which is nearly two seconds of a revealed
   * line being looked at after it has finished revealing — long past the point
   * where the next thing is what you are waiting for.
   */
  { at: 4.95, step: 'detail' },
  { at: 7.25, step: 'page' },
  /* The page carries on below the fold, so it takes itself down it. */
  { at: 9.75, step: 'offers' },
] as const

/** How far the page has scrolled at each stop, in frame pixels. */
/**
 * One stop, and it ends on the eSIM card.
 *
 * The page carries on below it, but the tour does not: everything the sequence
 * is introducing is on screen by here, and the two stops past this were the
 * page scrolling for its own sake. The floor matches, so a hand on the wheel
 * stops where the tour does rather than running off into the rest of the page.
 */
const SCROLL: Record<string, number> = {
  page: 0,
  offers: -620,
}

/**
 * Which blocks have been reached, from the scroll position rather than from
 * the clock — so a block still arrives when the page is scrolled by hand past
 * the point the tour would have stopped at.
 */
const STOPS = ['page', 'offers'] as const
type Stop = (typeof STOPS)[number]
const stopAt = (y: number): Stop => (y > -400 ? 'page' : 'offers')

const clamp = (v: number) => Math.min(0, Math.max(FLOOR, v))

type Step = (typeof BEATS)[number]['step'] | 'printing' | 'tearing'

/** While one of these is current, the light card is the one on screen. */
const PRINT_STEPS: Step[] = ['printing', 'tearing', 'clearing']
/** While one of these is current, the slip is still somewhere on screen. */
const SLIP_STEPS: Step[] = [...PRINT_STEPS, 'detached']
const DARK_BEATS: Beat[] = ['gift', 'pickup', 'detail']

export default function App() {
  const scale = useFrameFit()
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
  /* The eSIM card's artwork turns from here, not from inside the card — see
     `PageBelow`. */
  const spin = useMotionValue(0)

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

  /*
   * The rig calls this the moment the cut starts running.
   *
   * Everything that was keeping the slip company goes here rather than after
   * it has landed: the heading and the country line are what the slip was
   * printed under, and once it is being cut free they are the old frame. The
   * machine and the paper close up to the middle of the card together, so what
   * is left being torn is the only thing on screen.
   */
  const onTearing = useCallback(() => setStep((s) => (s === 'printing' ? 'tearing' : s)), [])

  /* And this when the slip has stopped swinging. */
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
  /* The card's artwork turns for as long as the page is up. */
  useEffect(() => {
    if (still || !page) return
    const run = animate(spin, Math.PI * 2, { duration: 34, ease: 'linear', repeat: Infinity })
    return () => run.stop()
  }, [page, spin, still])

  const beat: Beat = DARK_BEATS.includes(step as Beat)
    ? (step as Beat)
    : step === 'detached'
      ? 'logo'
      : page
        ? 'card'
        : 'detail'

  return (
    <main
      className="h-screen w-screen cursor-pointer overflow-hidden bg-canvas"
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

            {page && <PageBelow at={stop} spin={spin} canvas={HANDOVER} />}
          </motion.div>

          {/*
            No `initial={false}` here, and that is the whole opening: it
            suppresses mount animations for everything inside it, so the blank
            beat, the headline arriving and the printer rising only ever played
            on replay — on a cold load the first frame was already the printer.
          */}
          <AnimatePresence>
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
                  hero={step === 'printing'}
                  /* The machine stays for the cut — it is the thing doing the
                     cutting — and goes once the slip is down. */
                  leaving={step !== 'printing' && step !== 'tearing'}
                  centre={step !== 'printing'}
                  detached={step === 'detached'}
                  onTearing={onTearing}
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
