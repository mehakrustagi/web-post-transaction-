import { AnimatePresence, motion } from 'framer-motion'

/** The design's own headline box: 582 wide, clipped. */
const W = 582
const EASE = [0.22, 0.8, 0.3, 1] as const
/** Far enough out of the box that a leaving line is fully gone, every time. */
const OUT = '130%'

/**
 * The headline slot.
 *
 * Every frame in the sequence puts its headline in this same clipped box, and
 * the last frames are drawn with the previous line still sitting inside it,
 * above the one you can read. That is the transition, stated by the design: a
 * line does not fade into the next one, it is pushed up out of the box while
 * the next comes up from under it. The clip is what makes it legible — there
 * is no second copy of the text floating over the card, just the one window.
 *
 * The box itself moves and shrinks between frames, and the type with it, which
 * is why the size is animated here rather than set by a class.
 */
export function TextStage({
  left,
  top,
  height,
  size,
  lineHeight,
  align,
  lineKey,
  delay = 0,
  entrance = 'rise',
  move,
  children,
}: {
  left: number
  top: number
  height: number
  size: number
  lineHeight: number
  align: 'center' | 'end'
  /** Changing this is what swaps the line. */
  lineKey: string
  /** Held back on the frame where something else still has the screen. */
  delay?: number
  /**
   * How the line gets here. `rise` is the swap — pushed up out of the box
   * while the next comes up underneath. `solid` is the first arrival, where
   * there is nothing to swap with: it resolves in place, out of the screen
   * rather than up from under the edge of it.
   */
  entrance?: 'rise' | 'solid'
  /** How the box travels when the frame it is on re-lays-out. */
  move: object
  children: React.ReactNode
}) {
  return (
    <motion.div
      className="absolute z-30 overflow-hidden"
      style={{ width: W }}
      initial={false}
      animate={{ left, top, height }}
      transition={move}
    >
      <AnimatePresence initial>
        <motion.div
          key={lineKey}
          className={`absolute inset-0 flex flex-col items-center ${
            align === 'end' ? 'justify-end' : 'justify-center'
          } gap-[9px] text-center font-display font-medium`}
          /* The size is on `initial` too: a line that arrives at the browser
             default and grows to 36px over the move reads as a glitch. */
          initial={
            entrance === 'solid'
              ? { opacity: 0, scale: 1.14, filter: 'blur(10px)', fontSize: size, lineHeight: `${lineHeight}px` }
              : { y: OUT, fontSize: size, lineHeight: `${lineHeight}px` }
          }
          animate={{
            y: '0%',
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            fontSize: size,
            lineHeight: `${lineHeight}px`,
            transition:
              entrance === 'solid'
                ? { delay, duration: 1.05, ease: EASE, default: move }
                : { y: { delay, duration: 0.85, ease: EASE }, default: move },
          }}
          /*
           * The exit carries its own transition, and that is the whole point
           * of it being here rather than on a shared `transition` prop. A
           * leaving line keeps the props it last rendered with, so a line that
           * entered on a frame with a hold on it — the first dark frame waits
           * for the receipt to clear — inherited that hold on the way *out*
           * too, and sat in place for a second while its replacement arrived
           * on top of it.
           */
          exit={{ y: `-${OUT}`, transition: { duration: 0.85, ease: EASE } }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
