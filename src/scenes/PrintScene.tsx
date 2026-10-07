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

/** When each thing happens, in seconds from the start of the sequence. */
export const AT = { flag: 0.15, namer: 0.42, headline: 0.62, machine: 0.95, feed: 1.35 }

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

      <motion.div
        className="absolute left-0 w-full"
        style={{ top: MACHINE_Y, height: MACHINE_H }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: AT.machine, duration: 1.2, ease: [0.22, 0.8, 0.3, 1] }}
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
