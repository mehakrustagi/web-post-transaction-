import { motion } from 'framer-motion'
import { INTRO } from '../content'
import { PAPER_H } from '../components/Receipt'
import { EXIT_Y, MACHINE_H, PrintRig, REST_Y } from '../components/PrintRig'
import { SpeedBurst } from '../components/SpeedBurst'

const A = '/assets'

/** Where the machine sits: under the headline, with air between the two. */
const MACHINE_Y = 329
/** The line the leading edge comes through. */
export const PAPER_TOP = MACHINE_Y + EXIT_Y

/**
 * When each thing happens, in seconds from the start of the sequence.
 *
 * The card holds blank for a beat first. Then the flag, the country line and
 * the headline arrive in the middle of it, where there is nothing else to look
 * at, and only once they have been read do they glide up to the positions the
 * frame draws them in — which is what makes room for the printer. The machine
 * rises in underneath while they are still settling, and starts feeding before
 * it has finished arriving.
 */
export const AT = {
  flag: 0.25,
  namer: 0.42,
  /*
   * The heading and the machine are one arrival, in the middle of the card.
   *
   * They used to be three separate moves — heading in the middle, group glides
   * up, printer rises in underneath — which cost three and a half seconds
   * before a single line printed, most of it spent rearranging a card nobody
   * had been given a reason to look at twice. Same delay, same curve, same
   * distance: that is what makes them read as one thing rather than as two
   * that agree.
   */
  headline: 0.58,
  /*
   * And then the pair of them go up together, as the block they are.
   */
  rise: 1.25,
  /*
   * The slip is already on its way out before the block has finished arriving.
   *
   * Lining the feed up with the rise still left a gap, because the feed is
   * where the paper starts *moving* and not where it starts being visible —
   * it has a slot to clear first. Started under the arrival, the first of the
   * slip is at the lip exactly as the machine finishes fading in, so there is
   * no moment of a complete printer with an empty mouth.
   */
  feed: 1.0,
}

/** Everything in this opening arrives on this, so that it arrives as a piece. */
const ARRIVE = { duration: 0.72, ease: [0.22, 0.8, 0.3, 1] as const }
/** How far anything lifts as it fades in. */
const RISE = 18
/**
 * How far down the block starts.
 *
 * The heading, the country line and the machine together run from 138 to 431,
 * so centring that on a 915 card puts its top at 311 — which is this much
 * below where it ends up.
 */
const DROP = 172
/**
 * How far the pair of them lift to sit centred once the heading has gone.
 *
 * The machine's top is at 329 and the slip's foot reaches about 854, so the
 * block's own middle is at 591 against the frame's 457.
 */
const CENTRE_Y = -134
const RISE_UP = { duration: 0.95, ease: [0.5, 0, 0.2, 1] as const }

/**
 * The slip does not fly away — it recedes, into the exact spot the Cybertruck
 * is about to come out of. Everything here is in the frame's coordinates:
 * the slip's box is centred on the frame, its own centre sits half a sheet
 * below the slot, and the fall has already carried it REST_Y further down.
 */
/**
 * How small the slip is by the time it has merged.
 *
 * It was 0.34, which is 160 tall around the frame's middle — the thanks line
 * runs to about 407 and the slip's top landed at 377, so the paper finished
 * its recede sitting across the last word of it.
 */
const AWAY_SCALE = 0.19
/**
 * And it settles a little below the middle rather than on it.
 *
 * Size alone does not clear the line: even at this scale the slip's top is
 * within a few pixels of the text, and a few pixels is near enough to read as
 * touching. Below the middle there is nothing else on the card.
 */
const MERGE_DROP = 26
const FRAME_MID = 915 / 2
const REST_CX = 641
const REST_CY = PAPER_TOP + PAPER_H / 2
/**
 * And it goes to the middle of the frame.
 *
 * It used to recede into the exact spot the vehicle comes out of, which is a
 * good idea when the vehicle is the next thing you see — but the slip is the
 * only thing on the card by then, and anything that leaves off-centre leaves
 * the frame lopsided for the beat before the gift arrives.
 */
const AWAY = {
  x: 641 - REST_CX,
  y: FRAME_MID + MERGE_DROP - REST_CY - REST_Y * AWAY_SCALE,
  scale: AWAY_SCALE,
}

export function PrintScene({
  leaving,
  detached,
  onRest,
  onPrinted,
  onTearing,
  centre = false,
  hero = true,
  handOver = false,
  fill = true,
}: {
  /*
   * The card's furniture goes before its background does, and before the slip
   * starts travelling. Everything leaving at one rate had the printer head
   * sitting on top of the slip while the slip was trying to shrink past it,
   * and this headline sharing the frame with the next card's headline. The
   * stage is cleared first; then the slip moves through an empty frame.
   */
  leaving: boolean
  detached: boolean
  onRest: () => void
  /** Passed through from the rig: the slip is fully out of the machine. */
  onPrinted?: () => void
  /** And that the cut has started. */
  onTearing?: () => void
  /**
   * Bring the machine and the slip hanging off it to the middle of the frame.
   *
   * They are printed where the heading leaves room for them, which is not the
   * middle of anything — once the heading has gone there is nothing else on
   * the card, and a printer sitting high with a slip hanging below it reads as
   * a thing waiting for the rest of its layout to come back.
   */
  centre?: boolean
  /**
   * Whether the flag, the country line and the headline are still wanted. The
   * map variant keeps them up while the slip turns and the map prints beside
   * it, so the machine leaving and the heading leaving are two things.
   */
  hero?: boolean
  /** Passed through: another scene has taken the slip on. */
  handOver?: boolean
  /**
   * Whether this scene paints the card it sits on.
   *
   * It normally does. `/transaction` takes it over, because the colour wash
   * has to go *between* the card and the slip — on the card, under the paper —
   * and a scene that paints its own background is one layer, with no between
   * to put anything in.
   */
  fill?: boolean
}) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[40px]">
      {/*
        The card's own fill, on its own layer. It goes the moment the slip
        starts travelling — that is the background changing — while the slip
        itself carries on over whatever comes up underneath.
      */}
      {fill && (
        <motion.div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(101.874deg, #dedede 15.131%, #ffffff 57.588%, #cdcdcd 100.56%)',
          }}
          animate={{ opacity: detached ? 0 : 1 }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        />
      )}
      {/*
        The block: the heading, the country line and the machine under them.
        They come in together in the middle of the card and go up together,
        and the slip starts feeding on that same move — so what travels is one
        object, and the printing is part of its arrival rather than something
        that waits for it.
      */}
      <motion.div
        className="absolute inset-0"
        initial={{ y: DROP }}
        animate={{ y: centre ? CENTRE_Y : 0 }}
        transition={centre ? { duration: 0.75, ease: [0.4, 0, 0.2, 1] } : { delay: AT.rise, ...RISE_UP }}
      >
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: hero ? 1 : 0, y: hero ? 0 : -12 }}
        transition={{ duration: 0.45, ease: 'easeIn' }}
      >
        {/*
          Written in the frame's own coordinates and left there. The group used
          to be dropped to the middle of the card and glided up into this; what
          that bought was a card rearranging itself, and what it cost was a
          second and a half before anything could print.
        */}
        <div className="absolute inset-0">
        {/* Centred on the line, which is now simply where the line is. */}
        <SpeedBurst at={AT.headline} cx={642} cy={274} />

        <motion.div
          className="absolute"
          style={{ left: 613, top: 138, width: 54, height: 52 }}
          initial={{ opacity: 0, scale: 0.72, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: AT.flag, type: 'spring', stiffness: 420, damping: 26 }}
        >
          {/* The ring sits behind the roundel and is wider than it. */}
          <img
            src={`${A}/flagRing.svg`}
            alt=""
            aria-hidden
            className="absolute max-w-none"
            style={{ left: -6.25, top: 19.75, width: 66.5, height: 38.5 }}
          />
          <img
            src={`${A}/flag.svg`}
            alt="Vietnam"
            className="absolute max-w-none"
            style={{ left: 3, top: 0, width: 48, height: 48 }}
          />
        </motion.div>

        <motion.div
          className="absolute flex items-center justify-center gap-[8px]"
          style={{ left: 587, top: 210, height: 20 }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: AT.namer, duration: 0.5, ease: [0.22, 0.8, 0.3, 1] }}
        >
          <span className="whitespace-nowrap text-[16px] font-semibold leading-[20px] tracking-[-0.64px] text-grey900">
            {INTRO.country}
          </span>
          <img src={`${A}/divider.svg`} alt="" aria-hidden className="h-[9px] w-px" />
          <span className="flex items-center">
            <img src={`${A}/person.svg`} alt="" aria-hidden className="size-[20px]" />
            <span className="whitespace-nowrap text-[16px] font-semibold leading-[20px] tracking-[-0.64px] text-grey600">
              {INTRO.travellers}
            </span>
          </span>
        </motion.div>

        {/*
          The headline. It is the last thing to settle before the slip starts
          feeding. It sits closer to the country line than the frame draws it
          and keeps a gap above the machine, so the three read as one block
          with the printer standing under them rather than welded to them.
        */}
        <motion.div
          className="absolute z-20 flex flex-col items-center overflow-hidden"
          style={{ left: 351, top: 252, width: 582, height: 44 }}
          initial={{ opacity: 0, y: RISE, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: AT.headline, ...ARRIVE }}
        >
          <p className="whitespace-nowrap font-display text-[36px] font-medium leading-[44px] text-black">
            {INTRO.headline}
          </p>
        </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="absolute left-0 w-full"
        style={{ top: MACHINE_Y, height: MACHINE_H }}
        /* The heading's own arrival, to the millisecond and to the pixel. Any
           difference between the two — a longer rise, a different curve — is
           the difference that stops them being one object. */
        initial={{ opacity: 0, y: RISE }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: AT.headline, ...ARRIVE }}
      >
        <PrintRig
          onPrinted={onPrinted}
          onTearing={onTearing}
          delay={AT.feed}
          leaving={leaving}
          detached={detached}
          handOver={handOver}
          away={centre ? { ...AWAY, y: AWAY.y - CENTRE_Y } : AWAY}
          onRest={onRest}
        />
      </motion.div>
      </motion.div>
    </div>
  )
}
