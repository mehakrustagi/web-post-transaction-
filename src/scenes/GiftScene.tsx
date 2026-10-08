import { motion, useReducedMotion } from 'framer-motion'
import { GIFT, PAGE } from '../content'
import { TextReveal } from '../components/TextReveal'
import { TextStage } from '../components/TextStage'

const A = '/assets'

export type Beat = 'logo' | 'gift' | 'pickup' | 'detail' | 'card'

const EASE = [0.22, 0.8, 0.3, 1] as const
/** How long the full frame takes to settle into the card. */
const SQUEEZE = 1.3

/** The card's own fill, as the bare frame is drawn. */
const CARD_BG =
  'linear-gradient(101.883deg, #14151a 15.131%, #404650 57.588%, #292b2f 100.56%)'

/**
 * The same gradient with the lights down.
 *
 * The truck does not simply appear on the card — the card dims first and the
 * truck resolves out of it, which is why this is a second gradient faded over
 * the first rather than a cut between two backgrounds.
 */
const CARD_BG_DIM =
  'linear-gradient(101.883deg, #0b0c0f 15.131%, #262a30 57.588%, #171819 100.56%)'

/** The card's box on the last frame. Everything else is measured off it. */
export const CARD = { x: 281, y: 336, w: 785, h: 300, r: 24 }

/**
 * The empty set, and the vehicle standing on it.
 *
 * They are two files — the ground is a finished plate and the truck is a
 * cut-out with its own alpha, cropped to its edges so the box laid out below
 * *is* the vehicle. That split is what lets the truck change size between
 * frames while the horizon stays where it is: the only picture available
 * before had the truck baked into it, so the two had to move together, and
 * the frames' own separate cut-out was a second copy of the same vehicle.
 *
 * GROUND_LINE is where the ground falls in the plate, as a fraction of its
 * height. Every `top` is derived from it, so the wheels land on it.
 */
const GROUND_ASPECT = 3200 / 2284
/*
 * Where the wheels belong in the plate, as a fraction of its height.
 *
 * The new plate has two horizons: a lit bank at 0.736 and the near ground
 * that starts just under it. The old one's 0.731 put the wheels on the bank,
 * and on this plate that is the top edge of a dark trough — the vehicle came
 * out standing a clear forty pixels above anything it could be standing on.
 * This is the near ground, which is the surface it is actually on.
 */
const GROUND_LINE = 0.766
const TRUCK_ASPECT = 3068 / 1019

/** Ground line, truck height, and the truck's centre, per frame. */
const SHOT = {
  /* Both ground lines are 46 lower than the design states them, which is five
     per cent of the frame's height — the plate and the vehicle standing on it
     both hang off this, so moving it moves the pair of them together. */
  wide: { ground: 799, truckH: 301, cx: 665.5, plateW: 1600, across: 1282 },
  tight: { ground: 838, truckH: 282, cx: 663, plateW: 1600, across: 1282 },
  /* On the card the horizon drops past the bottom edge and the vehicle is
     wholly below it. It used to sit twelve pixels higher, which left the roof
     peaking over the card's foot — not a hint of a truck, just a dark wedge
     with no explanation, and the arrival has nothing left to arrive from. */
  card: { ground: 318, truckH: 173, cx: CARD.w / 2, plateW: 980, across: CARD.w, roof: 302 },
}

type Shot = (typeof SHOT)[keyof typeof SHOT]

function plate(s: Shot) {
  const height = s.plateW / GROUND_ASPECT
  return {
    left: (s.across - s.plateW) / 2,
    top: s.ground - GROUND_LINE * height,
    width: s.plateW,
    height,
  }
}

function vehicle(s: Shot, roof?: number) {
  const width = s.truckH * TRUCK_ASPECT
  return {
    left: s.cx - width / 2,
    top: roof ?? s.ground - s.truckH,
    width,
    height: s.truckH,
  }
}

/**
 * Where the vehicle comes out of the plate — the centre of its box on the
 * frame it arrives on. The receipt recedes into this point, so the two read as
 * the same doorway: the paper goes back into the screen exactly where the
 * truck is about to come out of it.
 */
export const EMERGES = (() => {
  const v = vehicle(SHOT.wide)
  return { x: v.left + v.width / 2, y: v.top + v.height / 2 }
})()

/**
 * The whole scene, in two layouts.
 *
 * This is one component and not two on purpose. The last frame is the one
 * before it, condensed — the same headline, the same figures, the same
 * photograph, re-laid-out smaller — so every part of it has a position in the
 * full frame and a position in the card, and moves between them. Drawing a
 * separate card component and cross-fading to it put two copies of the same
 * sentence on screen at once, half-faded and 80px apart, which is the one
 * thing the condense must not look like.
 *
 * Positions below are in the frame's coordinates throughout; the card's own
 * numbers (which the design states relative to the card) have CARD.x / CARD.y
 * already added.
 */
export function GiftScene({ beat }: { beat: Beat }) {
  const still = useReducedMotion()
  const card = beat === 'card'
  const lit = beat !== 'logo'
  const panel = beat === 'detail' || card
  /*
   * Just enough of a hold to let the slip start moving, not enough to wait for
   * it. The two overlap on purpose: the receipt is thinning out as it shrinks
   * away while the headline resolves in over it, so the line is legible
   * through the paper before the paper has gone. Waiting for a clear frame
   * first cost the best part of a second and bought nothing.
   */
  const wait = beat === 'logo' ? 0.2 : 0
  /*
   * The bare card and the one the truck arrives on carry the same line
   * (424:11042 and 424:9784), so the headline is written once and then stands
   * while the vehicle appears under it. It is replaced exactly once in the
   * whole run, on the frame after that.
   */
  const thanks = beat === 'logo' || beat === 'gift'

  /** The headline's box, which the design moves on every frame. */
  const box = card
    ? { left: 203, top: 362, h: 22, size: 20, lh: 25 }
    : beat === 'detail'
      ? { left: 350, top: 222, h: 53, size: 36, lh: 44 }
      : beat === 'logo'
        ? { left: 350, top: 269, h: 120, size: 36, lh: 44 }
        : { left: 350, top: 335, h: 88, size: 36, lh: 44 }

  /*
   * The mark and the headline sit high on the bare card and settle down onto
   * the vehicle's frame when it arrives — the design's own move, and the one
   * that makes the truck read as having come up underneath them.
   */
  const mark = card || beat === 'detail' ? 139 : beat === 'logo' ? 186 : 236

  const move = { duration: SQUEEZE, ease: EASE }
  /** Shows up with the panel on the detail frame, then travels to the card. */
  const part = (i: number) => ({
    initial: { opacity: 0, y: 16 },
    transition: panel
      ? { delay: beat === 'detail' ? 0.35 + i * 0.09 : 0, ...move }
      : { duration: 0.5, ease: EASE },
  })

  return (
    <div className="absolute inset-0">
      {/*
        The surface. It is the frame to begin with and the card at the end, and
        the photograph inside it is clipped by it — so the picture does not cut
        to a smaller picture, the window over it closes in.
      */}
      <motion.div
        className="absolute overflow-hidden"
        style={{ backgroundImage: CARD_BG }}
        initial={false}
        animate={{
          left: card ? CARD.x : 0,
          top: card ? CARD.y : 0,
          width: card ? CARD.w : 1282,
          height: card ? CARD.h : 915,
          borderRadius: card ? CARD.r : 40,
        }}
        transition={move}
      >
        <Glare still={still} />

        {/* The lights going down, a little ahead of the truck arriving. */}
        <motion.div
          aria-hidden
          className="absolute inset-0"
          style={{ backgroundImage: CARD_BG_DIM }}
          initial={false}
          animate={{ opacity: lit ? 1 : 0 }}
          transition={{ duration: 1.5, ease: EASE }}
        />

        <Backdrop beat={beat} still={still} />
      </motion.div>

      {/* The car chip the card puts where the frame had the Tesla mark. */}
      <motion.div
        className="absolute flex flex-col items-center justify-center rounded-[10px] border border-[#e5e7eb] bg-canvas"
        style={{ left: CARD.x + 26, top: CARD.y + 25.5, width: 36, height: 36 }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: card ? 1 : 0, scale: card ? 1 : 0.8 }}
        transition={{ delay: card ? SQUEEZE * 0.6 : 0, duration: 0.45, ease: EASE }}
      >
        <span className="relative block overflow-hidden" style={{ width: 28, height: 14 }}>
          <img
            src={`${A}/carIcon.png`}
            alt=""
            aria-hidden
            className="absolute max-w-none"
            style={{ left: '-20.37%', top: '-91.68%', width: '140.74%', height: '241.31%' }}
          />
        </span>
      </motion.div>

      <motion.img
        src={`${A}/tesla.png`}
        alt="Tesla"
        className="absolute max-w-none object-cover"
        style={{ left: 641 - 36.5, width: 73, height: 74 }}
        initial={{ opacity: 0, top: mark + 14 }}
        animate={{ opacity: card ? 0 : 0.4, top: mark }}
        transition={{ delay: wait, duration: 0.9, ease: EASE }}
      />

      <TextStage
        left={box.left}
        top={box.top}
        height={box.h}
        size={box.size}
        lineHeight={box.lh}
        align={beat === 'detail' || card ? 'end' : 'center'}
        delay={wait}
        move={move}
        lineKey={thanks ? 'thanks' : 'pickup'}
      >
        {thanks ? (
          <span className="block w-[520px] text-white">{GIFT.thanks}</span>
        ) : (
          <TextReveal text={GIFT.pickup} className="min-w-full" stars={beat === 'pickup'} />
        )}
      </TextStage>

      <motion.p
        className="absolute whitespace-nowrap font-semibold text-white"
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: panel ? 0.7 : 0,
          y: 0,
          left: card ? CARD.x + 77 : 283,
          top: card ? CARD.y + 52 : 284,
          fontSize: card ? 12 : 14,
          lineHeight: card ? '16px' : '19px',
        }}
        transition={part(0).transition}
      >
        {GIFT.blurb}
      </motion.p>

      {/* The two rules that box the panel in. */}
      <motion.div
        className="absolute h-px origin-left bg-white/10"
        initial={{ scaleX: 0 }}
        animate={{
          scaleX: panel ? 1 : 0,
          left: card ? CARD.x + 26 : 278,
          top: card ? CARD.y + 104.22 : 341.22,
          width: 726,
        }}
        transition={panel ? { delay: beat === 'detail' ? 0.3 : 0, ...move } : { duration: 0.5 }}
      />
      <motion.div
        className="absolute w-px origin-top bg-white/10"
        initial={{ scaleY: 0 }}
        animate={{
          scaleY: panel ? 1 : 0,
          left: card ? CARD.x + 269 : 515,
          top: card ? CARD.y + 127 : 341,
          height: card ? 131 : 158,
        }}
        transition={panel ? { delay: beat === 'detail' ? 0.5 : 0, ...move } : { duration: 0.5 }}
      />

      <motion.p
        className="absolute w-[60px] whitespace-nowrap text-center text-[14px] font-semibold leading-[19px] tracking-[-0.14px] text-white"
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: panel ? 1 : 0,
          y: 0,
          left: card ? CARD.x + 106 : 352,
          top: card ? CARD.y + 124 : 369.22,
        }}
        transition={part(1).transition}
      >
        {GIFT.progress.label}
      </motion.p>

      <motion.div
        className="absolute flex flex-col gap-[5px]"
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: panel ? 1 : 0,
          y: 0,
          left: card ? CARD.x + 37 : 283,
          /* Four lower than it was, which is where the figure's own middle
             lands once the rules above and below it have gone. */
          top: card ? CARD.y + 163 : 403,
          width: 198,
        }}
        transition={part(2).transition}
      >
        {/*
          No rules around the figure. The design has none — just the label, the
          count and the three slots under it — and a horizontal line above and
          below turned a column of three things into a boxed row, which is why
          the whole panel read as cramped against a frame that is otherwise all
          air.
        */}
        <span className="flex h-[43px] items-center justify-center">
          <span
            className="bg-clip-text font-display text-[32px] font-medium leading-[40px] text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(104.375deg, #c3fdff 0.744%, #ffffff 54.93%, #c3fff0 99.604%)',
              filter: 'drop-shadow(0px 2px 12px rgba(0,0,0,0.39))',
            }}
          >
            {GIFT.progress.value}
          </span>
        </span>
      </motion.div>

      <Slots card={card} show={panel} transition={part(3).transition} />

      <motion.div
        className="absolute flex flex-col gap-[10px] overflow-hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{
          opacity: panel ? 1 : 0,
          y: 0,
          left: card ? CARD.x + 309 : 555,
          top: card ? CARD.y + 131 : 370.22,
          width: card ? 443 : 449,
          height: card ? 67 : 82.784,
          fontSize: card ? 12 : 14,
        }}
        transition={part(2).transition}
      >
        {GIFT.rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between whitespace-nowrap text-white"
            style={{ lineHeight: card ? '16px' : '19px', letterSpacing: '-0.12px' }}
          >
            <span className="font-semibold opacity-75">{row.label}</span>
            <span className="font-bold">{row.value}</span>
          </div>
        ))}
      </motion.div>

      {/*
        The only two things the card adds. Everything above it was already on
        screen a moment ago and merely got smaller; these arrive, so these are
        the only ones allowed to look like they are arriving.
      */}
      <motion.p
        className="absolute whitespace-nowrap text-[12px] font-semibold leading-[16px] tracking-[-0.12px] text-white underline"
        style={{ left: CARD.x + 308, top: CARD.y + 217 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: card ? 1 : 0, y: card ? 0 : 6 }}
        transition={{ delay: card ? SQUEEZE * 0.75 : 0, duration: 0.45, ease: EASE }}
      >
        {PAGE.customers}
      </motion.p>

      <motion.button
        type="button"
        className="absolute rounded-full bg-white text-[14px] font-semibold leading-[19px] tracking-[-0.14px] text-black"
        style={{ left: CARD.x + 577, top: CARD.y + 235, width: 179, height: 38 }}
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={{ opacity: card ? 1 : 0, y: card ? 0 : 10, scale: card ? 1 : 0.94 }}
        transition={{ delay: card ? SQUEEZE * 0.8 : 0, type: 'spring', stiffness: 420, damping: 26 }}
      >
        {PAGE.cta}
      </motion.button>
    </div>
  )
}

/** The three empty seats, which shrink with everything else. */
function Slots({
  card,
  show,
  transition,
}: {
  card: boolean
  show: boolean
  transition: object
}) {
  const size = card ? 31 : 38
  const ring = card ? 32.824 : 40.235
  const icon = card ? 24.949 : 30.582
  /*
   * Spacing goes on the children, not on the parent's `gap` — Framer does not
   * reliably apply an animated `gap`, and the three seats ended up touching.
   * It is also measured wider than the design's 16.9/20.7, because the dashed
   * ring is drawn larger than the box it sits in and eats most of the gap back.
   */
  const apart = card ? 24 : 28

  return (
    <motion.div
      className="absolute flex items-center"
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: show ? 1 : 0,
        y: 0,
        left: card ? CARD.x + 72.59 : 304.27,
        top: card ? CARD.y + 227 : 463,
      }}
      transition={transition}
    >
      {Array.from({ length: GIFT.progress.slots }, (_, i) => (
        <motion.span
          key={i}
          className="flex items-center justify-center"
          animate={{
            width: size,
            height: size,
            marginRight: i === GIFT.progress.slots - 1 ? 0 : apart,
          }}
          transition={transition}
        >
          <motion.span
            className="flex items-center justify-center rounded-full border-dashed border-[#b2b2b2]"
            animate={{ width: ring, height: ring, borderWidth: card ? 0.912 : 1.118 }}
            transition={transition}
          >
            <motion.img
              src={`${A}/avatarSlot.svg`}
              alt=""
              aria-hidden
              className="max-w-none"
              animate={{ width: icon, height: icon }}
              transition={transition}
            />
          </motion.span>
        </motion.span>
      ))}
    </motion.div>
  )
}

/**
 * The sheen on the bare card.
 *
 * The gradient alone is flat once there is no photograph over it, so a soft
 * band drifts across it — wide, slow and barely there, the way a light source
 * moves over a dark panel.
 */
function Glare({ still }: { still: boolean | null }) {
  if (still) return null
  return (
    <motion.div
      aria-hidden
      className="absolute inset-0"
      style={{
        backgroundImage:
          'linear-gradient(104deg, rgba(255,255,255,0) 22%, rgba(255,255,255,0.055) 42%, rgba(255,255,255,0.1) 52%, rgba(255,255,255,0.04) 64%, rgba(255,255,255,0) 84%)',
        backgroundSize: '220% 100%',
      }}
      animate={{ backgroundPosition: ['22% center', '78% center', '22% center'] }}
      transition={{ duration: 16, ease: 'easeInOut', repeat: Infinity }}
    />
  )
}

/**
 * The photograph, and the lamp behind it.
 *
 * Three layers: the plate, the lamp, the vehicle — in that order, so the star
 * burns behind the truck rather than over it. All three are positioned against
 * the surface, so when the surface closes in on the card they are carried and
 * clipped with it.
 */
function Backdrop({ beat, still }: { beat: Beat; still: boolean | null }) {
  const show = beat !== 'logo'
  const shot = beat === 'card' ? SHOT.card : beat === 'detail' ? SHOT.tight : SHOT.wide
  const ground = plate(shot)
  const truck = vehicle(shot, beat === 'card' ? SHOT.card.roof : undefined)
  const bloom =
    beat === 'detail'
      ? { left: -26.6, top: -44.6, size: 1336.2 }
      : { left: 189.4, top: 107.4, size: 906.2 }

  return (
    <>
      {/* The plate. Opaque, and the card's gradient is behind it. */}
      <motion.img
        src={`${A}/ground.jpg`}
        alt=""
        aria-hidden
        className="absolute max-w-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 1 : 0, ...ground }}
        /* Held back so the dimming leads and the plate resolves into it. */
        transition={{
          opacity: { delay: show ? 0.3 : 0, duration: 1.3, ease: EASE },
          default: { duration: SQUEEZE, ease: EASE },
        }}
      />

      {/*
        The star behind the truck turns. It is a lamp, not a decal — holding it
        still is what made the frame look like a still. One slow revolution,
        with the size breathing on its own cycle so the two never line up and
        the light never looks like it is on a loop.
      */}
      <motion.img
        src={`${A}/bloomB.svg`}
        alt=""
        aria-hidden
        className="absolute max-w-none mix-blend-overlay"
        initial={false}
        animate={{
          opacity: show && beat !== 'card' ? 1 : 0,
          left: bloom.left,
          top: bloom.top,
          width: bloom.size,
          height: bloom.size,
          rotate: still ? 90 : [90, 450],
          scale: still ? 1 : [1, 1.05, 1],
        }}
        transition={{
          default: { duration: SQUEEZE, ease: EASE },
          rotate: { duration: 56, ease: 'linear', repeat: Infinity },
          scale: { duration: 11, ease: 'easeInOut', repeat: Infinity },
        }}
      />

      {/*
        What the cut-out does not bring with it. A vehicle with no shadow does
        not stand on the floor, it hovers above it — so the contact goes back
        in by hand, under the wheels and under the truck rather than over it.
      */}
      <motion.div
        aria-hidden
        className="absolute"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at center, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.42) 42%, rgba(0,0,0,0) 72%)',
        }}
        initial={{ opacity: 0 }}
        animate={{
          opacity: show ? 1 : 0,
          left: truck.left + truck.width * 0.04,
          top: shot.ground - truck.height * 0.1,
          width: truck.width * 0.92,
          height: truck.height * 0.26,
        }}
        transition={{
          opacity: { delay: show ? 0.45 : 0, duration: 1.2, ease: EASE },
          default: { duration: SQUEEZE, ease: EASE },
        }}
      />

      <motion.img
        src={`${A}/truck.webp`}
        alt="Tesla Cybertruck"
        className="absolute max-w-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: show ? 1 : 0, ...truck }}
        transition={{
          opacity: { delay: show ? 0.45 : 0, duration: 1.2, ease: EASE },
          default: { duration: SQUEEZE, ease: EASE },
        }}
      />
    </>
  )
}
