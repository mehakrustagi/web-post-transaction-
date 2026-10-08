import { motion } from 'framer-motion'
import { INTRO } from '../content'
import { PAPER_H } from '../components/Receipt'
import { EXIT_Y, MACHINE_H, PrintRig, REST_Y } from '../components/PrintRig'
import { EMERGES } from './GiftScene'

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
  flag: 1,
  namer: 1.25,
  headline: 1.45,
  lift: 2.9,
  machine: 3.3,
  /*
   * Only a breath after the machine, not a pause. Left at two thirds of a
   * second this was long enough to screenshot: a printer sitting there with
   * an empty mouth, which reads as the thing having stalled rather than as
   * the beat before it starts.
   */
  feed: 3.6,
}

/** How far down the group starts: enough to sit centred on the frame. */
const HERO_DROP = 240
const LIFT_S = 1.5

/**
 * The slip does not fly away — it recedes, into the exact spot the Cybertruck
 * is about to come out of. Everything here is in the frame's coordinates:
 * the slip's box is centred on the frame, its own centre sits half a sheet
 * below the slot, and the fall has already carried it REST_Y further down.
 */
const AWAY_SCALE = 0.34
const REST_CX = 641
const REST_CY = PAPER_TOP + PAPER_H / 2
const AWAY = {
  x: EMERGES.x - REST_CX,
  y: EMERGES.y - REST_CY - REST_Y * AWAY_SCALE,
  scale: AWAY_SCALE,
}

export function PrintScene({
  leaving,
  detached,
  onRest,
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
}) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[40px]">
      {/*
        The card's own fill, on its own layer. It goes the moment the slip
        starts travelling — that is the background changing — while the slip
        itself carries on over whatever comes up underneath.
      */}
      <motion.div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(101.874deg, #dedede 15.131%, #ffffff 57.588%, #cdcdcd 100.56%)',
        }}
        animate={{ opacity: detached ? 0 : 1 }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: leaving ? 0 : 1, y: leaving ? -12 : 0 }}
        transition={{ duration: 0.45, ease: 'easeIn' }}
      >
        {/*
          The three of them travel as one block. They are written in the
          frame's own coordinates and the whole group is dropped to the middle
          of the card to begin with, so the glide up is a single move rather
          than three that have to be kept in step.
        */}
        <motion.div
          className="absolute inset-0"
          initial={{ y: HERO_DROP }}
          animate={{ y: 0 }}
          transition={{ delay: AT.lift, duration: LIFT_S, ease: [0.5, 0, 0.2, 1] }}
        >
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
          initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: AT.headline, duration: 0.72, ease: [0.22, 0.8, 0.3, 1] }}
        >
          <p className="whitespace-nowrap font-display text-[36px] font-medium leading-[44px] text-black">
            {INTRO.headline}
          </p>
        </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute left-0 w-full"
        style={{ top: MACHINE_Y, height: MACHINE_H }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        /* Still on its way up when the paper starts, as in the source. */
        transition={{ delay: AT.machine, duration: 0.9, ease: [0.22, 0.8, 0.3, 1] }}
      >
        <PrintRig
          delay={AT.feed}
          leaving={leaving}
          detached={detached}
          away={AWAY}
          onRest={onRest}
        />
      </motion.div>
    </div>
  )
}
