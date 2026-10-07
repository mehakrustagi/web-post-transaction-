import { motion } from 'framer-motion'

/*
 * Ported from kokonutui's `shimmer-text`
 * (npx shadcn@latest add @kokonutui/shimmer-text — @dorianbaffier, MIT,
 * https://kokonutui.com). Three things differ from the registry copy:
 *
 *  - `cn` and the `@/lib/utils` import are gone; this project has neither.
 *  - The gradient stops are the design's (424:9963), pushed brighter and given
 *    a wider white core. The design's own stops are a still: swept across the
 *    glyphs they leave the line sitting in the gradient's dark ends most of
 *    the time, which reads as grey text rather than as a sheen. The pale edges
 *    hold the line bright and the highlight carries a trace of the cyan the
 *    `0/3 friends` figure is set in, so the two read as the same light.
 *  - SWEEP is 5s, not the registry's 2.5s. At 2.5s the line reads as a
 *    progress indicator, which is not what this headline is doing.
 *
 *  - The demo wrapper's padding and its mount animation are dropped. The
 *    caller owns both: it positions the line and slides it in, and `py-2`
 *    inside a 22px headline box on the last frame clipped the type in half.
 */
const SWEEP_S = 5

export function ShimmerText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className="relative block">
      <motion.span
        className={`block bg-clip-text text-transparent ${className}`}
        style={{
          backgroundImage:
            'linear-gradient(to right, #c3d1d4 4%, #ffffff 30%, #eafdff 46%, #ffffff 62%, #bcc9cc 96%)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% center', '-200% center'] }}
        transition={{ duration: SWEEP_S, ease: 'linear', repeat: Infinity }}
      >
        {text}
      </motion.span>
    </span>
  )
}
