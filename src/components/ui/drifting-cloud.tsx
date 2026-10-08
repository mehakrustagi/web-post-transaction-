import { motion } from 'framer-motion'

/*
 * The cloud on the travel insurance card, moving.
 *
 * It was a still PNG at 14%, which is fine until you look at it twice — cloud
 * that does not move is smoke damage. This is the card's own artwork
 * (444:17598) drifting rather than anything generated: three copies of it at
 * different sizes crossing the card at different speeds. One cloud sliding
 * past reads as a sticker on a conveyor; three at different rates read as
 * distance.
 *
 * An earlier pass did this as a WebGL fragment shader. It was the wrong trade:
 * it needed a context that is not always there, it could not use the design's
 * own cloud, and a canvas whose program fails to link is not an empty canvas
 * but an opaque one — which took the card's gradient and its text out with it.
 * This needs nothing but the image that was already on the card.
 */

const A = '/assets'

/** Each layer: how big, how far down, how long it takes to cross, how faint. */
const BANK = [
  { w: 300, top: 148, dur: 46, offset: 0.12, opacity: 0.1, flip: true },
  { w: 430, top: 174, dur: 72, offset: 0.58, opacity: 0.15, flip: true },
  { w: 225, top: 206, dur: 37, offset: 0.81, opacity: 0.08, flip: false },
] as const

export function DriftingCloud({
  className,
  style,
  weight = 1,
  width = 785,
}: {
  className?: string
  style?: React.CSSProperties
  /** Scales all three layers together, for cards that want less of it. */
  weight?: number
  /** How wide the card is, which is how far each layer has to travel. */
  width?: number
}) {
  return (
    <div aria-hidden className={className} style={{ overflow: 'hidden', ...style }}>
      {BANK.map((c, i) => {
        const h = Math.round((c.w * 158) / 328)
        /*
         * Each one runs from fully off one side to fully off the other, so the
         * moment it jumps back there is nothing of it on screen to see jump.
         * They start at different points along that run rather than together,
         * which is what stops them being a convoy.
         */
        const span = width + c.w
        return (
          <motion.img
            key={i}
            src={`${A}/cardCloud.png`}
            alt=""
            className="absolute max-w-none"
            style={{
              top: c.top,
              left: -c.w,
              width: c.w,
              height: h,
              opacity: c.opacity * weight,
              transform: c.flip ? 'scaleY(-1)' : undefined,
            }}
            initial={{ x: c.offset * span }}
            animate={{ x: [c.offset * span, span, 0, c.offset * span] }}
            transition={{
              duration: c.dur,
              times: [0, 1 - c.offset, 1 - c.offset, 1],
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )
      })}
    </div>
  )
}
