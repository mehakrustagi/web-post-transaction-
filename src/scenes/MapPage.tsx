import { motion, type MotionValue } from 'framer-motion'
import { EXPLORE, LINKS, MAP_OFFER, MAP_RAIL_STEPS, MAP_RAIL_TICKS } from '../content'
import { CountryCard, OfferCard } from './PageBelow'
import { CardOrb } from '../features/map/CardOrb'
import { PageScene } from './PageScene'

const A = '/assets'
const EASE = [0.22, 0.8, 0.3, 1] as const

/** The map variant's page is shorter: one card, then the countries and links. */
export const MAP_PAGE_H = 1800
export const MAP_STOPS = ['page', 'explore', 'more'] as const
export type MapStop = (typeof MAP_STOPS)[number]
export const MAP_SCROLL: Record<MapStop, number> = { page: 0, explore: -560, more: -885 }

/**
 * Where the sequence lands (438:16680).
 *
 * The same page as the other variant with the gift taken out of it: there is
 * no black card and no travel insurance, so the eSIM is step two and the orb
 * is its artwork. Everything below is unchanged, which is the point — only the
 * thing that was being introduced is different.
 */
export function MapPage({
  at,
  show,
  landed = false,
  spin,
  canvas,
}: {
  at: MapStop
  show: boolean
  /** The orb has finished travelling and is this card's artwork now. */
  landed?: boolean
  /** The turning it arrived with, which it carries on. */
  spin: MotionValue<number>
  /** And the canvas it arrived on — see `CardOrb`. */
  canvas: { w: number; h: number; scale: number }
}) {
  const seen = (stop: MapStop) => MAP_STOPS.indexOf(at) >= MAP_STOPS.indexOf(stop)

  const rise = (i: number, stop: MapStop) => ({
    initial: { opacity: 0, y: 22 },
    animate: seen(stop) && show ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { delay: seen(stop) ? 0.3 + i * 0.12 : 0, duration: 0.7, ease: EASE },
  })

  return (
    <>
      <PageScene show={show} lede={false} ticks={MAP_RAIL_TICKS} steps={MAP_RAIL_STEPS} height={MAP_PAGE_H} />

      <div className="absolute left-0 top-0 w-full" style={{ height: MAP_PAGE_H }}>
        <motion.p
          className="absolute whitespace-nowrap text-[20px] font-semibold leading-[25px] tracking-[-0.8px] text-black"
          style={{ left: 281, top: MAP_OFFER.top }}
          {...rise(0, 'page')}
        >
          {MAP_OFFER.kicker}
        </motion.p>
        <motion.div
          className="absolute"
          style={{ left: 281, top: MAP_OFFER.top + 41 }}
          {...rise(1, 'page')}
        >
          {/* No artwork: the orb is flying into that slot from outside. */}
          {/* Mounted with the page, revealed when the orb arrives — see `CardOrb`. */}
          <OfferCard
            offer={MAP_OFFER}
            art={false}
            slot={show ? <CardOrb show={landed} spin={spin} canvas={canvas} /> : null}
          />
        </motion.div>

        <Rule top={735} show={seen('explore') && show} />

        <motion.div className="absolute" style={{ left: 208, top: 834, width: 866 }} {...rise(0, 'explore')}>
          <p
            className="bg-clip-text pl-[8px] text-center text-[24px] font-semibold leading-[28px] tracking-[-0.96px] text-transparent"
            style={{ backgroundImage: 'linear-gradient(to right, #000000, #666666)' }}
          >
            {EXPLORE.heading}
          </p>
          <p className="mx-auto mt-[15px] w-[524px] text-center text-[14px] font-medium leading-[19px] tracking-[-0.28px] text-grey600">
            {EXPLORE.blurb}
          </p>
          <span className="mx-auto mt-[15px] flex h-[28px] w-[175px] items-center justify-center gap-[4px] rounded-full bg-black/10 backdrop-blur-[10.6px]">
            <img src={`${A}/iconTakeoff.svg`} alt="" aria-hidden className="size-[11px]" />
            <span className="whitespace-nowrap text-[12px] font-semibold leading-[16px] tracking-[-0.12px] text-[#0b0b0b]">
              {EXPLORE.tag}
            </span>
          </span>
        </motion.div>

        <div className="absolute flex items-center justify-center gap-[32px]" style={{ left: 208, top: 982, width: 866 }}>
          {EXPLORE.cards.map((card, i) => (
            <motion.div key={card.country} {...rise(i + 1, 'explore')}>
              <CountryCard card={card} />
            </motion.div>
          ))}
        </div>

        <Rule top={1390} show={seen('more') && show} />

        <div className="absolute" style={{ left: 245, top: 1450, width: 793 }}>
          {LINKS.map((link, i) => (
            <motion.div key={link.label} {...rise(i, 'more')}>
              <div className="flex items-start justify-between pb-[20px] pt-[18px]">
                <span>
                  <span className="block text-[20px] font-semibold leading-[25px] tracking-[-0.8px] text-black">
                    {link.label}
                  </span>
                  {link.sub && (
                    <span className="mt-[4px] block text-[12px] font-medium leading-[16px] tracking-[-0.24px] text-grey600">
                      {link.sub}
                    </span>
                  )}
                </span>
                <img src={`${A}/chevR.svg`} alt="" aria-hidden className="size-[18px] opacity-50" />
              </div>
              {i < LINKS.length - 1 && <span className="block h-px w-full bg-light200" />}
            </motion.div>
          ))}
        </div>
      </div>
    </>
  )
}

function Rule({ top, show }: { top: number; show: boolean }) {
  return (
    <motion.span
      className="absolute h-px origin-left bg-light200"
      style={{ left: 208, top, width: 876 }}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: show ? 1 : 0 }}
      transition={{ duration: 0.8, ease: EASE }}
    />
  )
}
