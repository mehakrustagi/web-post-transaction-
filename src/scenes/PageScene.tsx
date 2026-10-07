import { motion } from 'framer-motion'
import { PAGE, RAIL_STEPS, RAIL_TICKS, STEPS } from '../content'
import { CARD } from './GiftScene'

const A = '/assets'

const EASE = [0.22, 0.8, 0.3, 1] as const

/** Where the bar sits, and how long the done segment takes to run out. */
const BAR_Y = 235
const BAR_H = 5

/**
 * The page the gift ends up on.
 *
 * Everything here arrives *around* the card, which is already on screen by the
 * time this mounts — the card is the thing the previous frame condensed into,
 * so this scene deliberately draws no card of its own. `App` stacks the two.
 */
export function PageScene({ show }: { show: boolean }) {
  const rise = (i: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    transition: { delay: show ? 0.15 + i * 0.08 : 0, duration: 0.6, ease: EASE },
  })

  /*
   * Hidden means transparent *and* out of the way: this sits over the print
   * frame in the stack, so leaving its background painted while the slip is
   * still feeding would hide the frame underneath it entirely.
   */
  return (
    <motion.div
      className="absolute inset-0 overflow-hidden rounded-[40px] bg-canvas"
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
      style={{ pointerEvents: show ? 'auto' : 'none' }}
    >
      <motion.p
        className="absolute whitespace-nowrap font-display text-[32px] font-medium leading-[40px] text-[#1c1f21]"
        style={{ left: 202, top: 135 }}
        {...rise(0)}
      >
        {PAGE.headline}
      </motion.p>

      <motion.div
        className="absolute flex items-center gap-[8px]"
        style={{ left: 204, top: 185, width: 510 }}
        {...rise(1)}
      >
        {PAGE.terms.map(([lead, tail], i) => (
          <span key={tail} className="flex items-center gap-[8px]">
            {i > 0 && <img src={`${A}/bullet4.svg`} alt="" aria-hidden className="size-[4px]" />}
            <span className="whitespace-nowrap text-[14px] font-semibold leading-[19px] tracking-[-0.14px]">
              <span className="text-grey900">{lead}</span>
              <span className="text-grey600">{tail}</span>
            </span>
          </span>
        ))}
      </motion.div>

      <motion.button
        type="button"
        className="absolute flex items-center justify-center gap-[6px] rounded-[30px] border border-light200 px-[20px] py-[8px]"
        style={{ left: 898, top: 138, width: 185, height: 40 }}
        {...rise(1)}
      >
        <img src={`${A}/receiptIcon.svg`} alt="" aria-hidden className="size-[14px]" />
        <span className="whitespace-nowrap text-[14px] font-semibold leading-[19px] tracking-[-0.14px] text-black">
          {PAGE.download}
        </span>
      </motion.button>

      <StepBar show={show} />
      <Rail show={show} />

      {/*
        The one line of colour on the page. The gradient starts black and only
        turns over partway along, so the sentence reads as plain text until it
        gets to the gift.
      */}
      <motion.p
        className="absolute bg-clip-text text-[20px] font-semibold leading-[25px] tracking-[-0.8px] text-transparent"
        style={{
          left: 285,
          top: 299,
          width: 785,
          backgroundImage:
            'linear-gradient(95.095deg, #000000 0.1177%, #000000 4.6858%, #5057ea 8.5822%, #d946ef 13.072%, #ef4444 21.077%, #edd758 28.064%)',
        }}
        {...rise(5)}
      >
        {PAGE.lede}
      </motion.p>

    </motion.div>
  )
}

/**
 * The four-step bar, with the pair already travelling riding the head of the
 * done segment. The segments are not evenly spaced — those numbers come off
 * the design's own export, not a guess.
 */
function StepBar({ show }: { show: boolean }) {
  const head = STEPS[0]

  return (
    <motion.div
      className="absolute left-0 top-0 h-full w-full"
      initial={{ opacity: 0, y: 12 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ delay: show ? 0.3 : 0, duration: 0.6, ease: EASE }}
    >
      {STEPS.map((seg) => (
        <span
          key={seg.x}
          className="absolute rounded-full bg-black/10"
          style={{ left: seg.x, top: BAR_Y, width: seg.w, height: BAR_H }}
        />
      ))}

      {/* The done segment runs out from its own left edge. */}
      <motion.span
        className="absolute origin-left rounded-full bg-brand"
        style={{ left: head.x, top: BAR_Y, width: head.w, height: BAR_H }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: show ? 1 : 0 }}
        transition={{ delay: show ? 0.45 : 0, duration: 0.85, ease: EASE }}
      />

      <motion.div
        className="absolute isolate flex items-center"
        style={{ left: 405, top: 221 }}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
        transition={{ delay: show ? 1.1 : 0, type: 'spring', stiffness: 460, damping: 24 }}
      >
        {PAGE.travellers.map((t, i) => (
          <span
            key={t.initials}
            className="relative flex size-[30px] flex-col items-center justify-center rounded-full border border-white"
            style={{
              marginRight: i === 0 ? -3 : 0,
              zIndex: PAGE.travellers.length - i,
              filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.04)) drop-shadow(0px 8px 8px rgba(0,0,0,0.08))',
            }}
          >
            <img src={`${A}/${t.face}`} alt="" aria-hidden className="absolute inset-0 size-full" />
            <span className="relative text-[11px] font-medium leading-[16px] tracking-[-0.22px] text-white">
              {t.initials}
            </span>
          </span>
        ))}
      </motion.div>
    </motion.div>
  )
}

/**
 * The ruler down the left margin, with the step number set into the gap it
 * leaves. The ticks are plain rules in the design — degenerate zero-height
 * vectors — so they are drawn rather than fetched as 28 near-identical files.
 */
function Rail({ show }: { show: boolean }) {
  return (
    <motion.div
      className="absolute left-0 top-0 w-full"
      style={{ height: 2741 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: show ? 1 : 0 }}
      transition={{ delay: show ? 0.55 : 0, duration: 0.7 }}
    >
      {RAIL_TICKS.map(([top, w]) => (
        <span
          key={top}
          className="absolute h-px bg-light200"
          style={{ top, left: 230 - w / 2, width: w }}
        />
      ))}
      {RAIL_STEPS.map((step) => (
        <div
          key={step.value}
          className="absolute flex flex-col items-center"
          style={{ left: 216.5, top: step.top }}
        >
          <span className="whitespace-nowrap text-[10px] font-semibold uppercase leading-[14px] tracking-[0.4px] text-black">
            {PAGE.step.label}
          </span>
          <span className="w-[26px] text-center font-display text-[20px] font-medium leading-[25px] text-black">
            {step.value}
          </span>
        </div>
      ))}
    </motion.div>
  )
}

/**
 * The corner the banner is tucked into.
 *
 * Split out from the banner because the two sit on opposite sides of the card:
 * the flash lies across the card's face, the fold goes behind it. Both are
 * exported because the card is not this scene's to draw, so `App` is the only
 * place that can put one above it and the other below.
 */
export function RibbonFold({ show }: { show: boolean }) {
  return (
    <motion.span
      className="absolute flex items-center justify-center"
      style={{ left: 1041.15, top: 376.22, width: 44.168, height: 32.745 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ delay: show ? 0.9 : 0, type: 'spring', stiffness: 320, damping: 26 }}
    >
      <span className="shrink-0 -scale-y-100 rotate-[17.29deg]">
        <span className="relative block" style={{ width: 39.401, height: 22.033 }}>
          <img
            src={`${A}/ribbonFold.svg`}
            alt=""
            aria-hidden
            className="absolute max-w-none"
            style={{ left: 5.32, top: 0.97, width: 33.07, height: 21.06 }}
          />
        </span>
      </span>
    </motion.span>
  )
}

/** The flash across the card's top-right corner, which lies over it. */
export function Ribbon({ show }: { show: boolean }) {
  return (
    <motion.div
      className="absolute left-0 top-0 h-full w-full"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={show ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      style={{ transformOrigin: `${CARD.x + CARD.w}px ${CARD.y}px` }}
      transition={{ delay: show ? 0.9 : 0, type: 'spring', stiffness: 320, damping: 26 }}
    >
      <span
        className="absolute flex items-center justify-center"
        style={{ left: 881, top: 304, width: 208.954, height: 94.652 }}
      >
        <span className="shrink-0 rotate-[17.29deg]">
          <span className="relative block" style={{ width: 208.148, height: 34.352 }}>
            <img
              src={`${A}/ribbon.svg`}
              alt=""
              aria-hidden
              className="absolute max-w-none"
              style={{ left: -16.01, top: -7.86, width: 240.17, height: 66.21 }}
            />
          </span>
        </span>
      </span>

      <span
        className="absolute flex items-center justify-center"
        style={{ left: 980.61, top: 345.2, width: 90.557, height: 36.817 }}
      >
        <span className="shrink-0 rotate-[15deg] whitespace-nowrap text-[11px] font-bold uppercase leading-[14px] tracking-[0.88px] text-white">
          {PAGE.ribbon}
        </span>
      </span>

    </motion.div>
  )
}
