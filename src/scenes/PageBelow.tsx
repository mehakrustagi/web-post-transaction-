import { motion } from 'framer-motion'
import { EXPLORE, LINKS, OFFERS } from '../content'

const A = '/assets'
const EASE = [0.22, 0.8, 0.3, 1] as const

/**
 * Everything on the last frame below the gift card.
 *
 * Laid out in the page's own coordinates — the frame is 2741 tall and `App`
 * scrolls it under a 915 viewport — so every `top` here is the design's.
 */
export function PageBelow({ at }: { at: 'page' | 'offers' | 'explore' | 'more' }) {
  const seen = (stop: typeof at) =>
    ['page', 'offers', 'explore', 'more'].indexOf(at) >=
    ['page', 'offers', 'explore', 'more'].indexOf(stop)

  const rise = (i: number, stop: Parameters<typeof seen>[0]) => ({
    initial: { opacity: 0, y: 22 },
    animate: seen(stop) ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { delay: seen(stop) ? 0.25 + i * 0.12 : 0, duration: 0.7, ease: EASE },
  })

  return (
    <div className="absolute left-0 top-0 w-full" style={{ height: 2741 }}>
      {OFFERS.map((offer, i) => (
        <div key={offer.title}>
          <motion.p
            className="absolute whitespace-nowrap text-[20px] font-semibold leading-[25px] tracking-[-0.8px] text-black"
            style={{ left: 281, top: offer.top }}
            {...rise(i * 2, 'offers')}
          >
            {offer.kicker}
          </motion.p>
          <motion.div
            className="absolute"
            style={{ left: 281, top: offer.top + 40 }}
            {...rise(i * 2 + 1, 'offers')}
          >
            <OfferCard offer={offer} />
          </motion.div>
        </div>
      ))}

      <Rule top={1537} show={seen('explore')} />

      <motion.div className="absolute" style={{ left: 208, top: 1636, width: 866 }} {...rise(0, 'explore')}>
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

      <div className="absolute flex items-center justify-center gap-[32px]" style={{ left: 208, top: 1784, width: 866 }}>
        {EXPLORE.cards.map((card, i) => (
          <motion.div key={card.country} {...rise(i + 1, 'explore')}>
            <CountryCard card={card} />
          </motion.div>
        ))}
      </div>

      <Rule top={2192} show={seen('more')} />

      <div className="absolute" style={{ left: 245, top: 2252, width: 793 }}>
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
  )
}

/** The hairlines that separate the page's three lower blocks. */
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

/**
 * The two upsells share a shape: a title block top left, dates top right, a
 * rule, then a figure with a stepper on the left and a table on the right.
 * Only the fill, the artwork and the words change.
 */
function OfferCard({ offer }: { offer: (typeof OFFERS)[number] }) {
  return (
    <div
      className="relative overflow-hidden rounded-[24px]"
      style={{ width: 785, height: 300, backgroundImage: offer.bg }}
    >
      <img
        src={`${A}/${offer.art.src}`}
        alt=""
        aria-hidden
        className="absolute max-w-none object-cover"
        style={{
          left: offer.art.left,
          top: offer.art.top,
          width: offer.art.width,
          height: offer.art.height,
          opacity: offer.art.opacity,
          transform: offer.art.flip ? 'scaleY(-1)' : undefined,
        }}
      />

      <img
        src={`${A}/${offer.icon}`}
        alt=""
        aria-hidden
        className="absolute size-[36px]"
        style={{ left: 27, top: 24 }}
      />
      <div className="absolute" style={{ left: 79, top: 22, width: 374 }}>
        <p className="font-display text-[20px] font-medium leading-[25px] text-white">{offer.title}</p>
        <p
          className="mt-[6px] text-[12px] font-medium leading-[16px] tracking-[-0.24px]"
          style={{ color: 'rgba(255,255,255,0.72)' }}
        >
          {offer.blurb}
        </p>
      </div>

      {/* Dates, as a joined pair of fields. */}
      <div className="absolute flex items-center" style={{ left: 457, top: 31 }}>
        {[
          ['Arrival Date', '28 Oct, 2026', false],
          ['Departure Date', 'dd/mm/yyyy', true],
        ].map(([label, value, dim], i) => (
          <span
            key={label as string}
            className="flex h-[49px] flex-col justify-center border border-white/20 px-[12px] py-[8px] text-white"
            style={{
              width: i === 0 ? 155 : 146,
              marginRight: i === 0 ? -1 : 0,
              borderRadius: i === 0 ? '8px 0 0 8px' : '0 8px 8px 0',
            }}
          >
            <span className="text-[11px] font-semibold leading-[16px] tracking-[-0.11px]">{label}</span>
            <span
              className="text-[14px] font-medium leading-[20px] tracking-[-0.56px]"
              style={{ opacity: dim ? 0.6 : 1 }}
            >
              {value}
            </span>
          </span>
        ))}
      </div>

      <span className="absolute left-1/2 h-px w-[731px] -translate-x-1/2 bg-white/15" style={{ top: 102 }} />
      <span className="absolute w-px bg-white/15" style={{ left: 267, top: 117, height: 131 }} />

      {/* The figure, with its stepper under it. */}
      <p
        className="absolute -translate-x-1/2 text-center text-[12px] font-semibold leading-[16px] tracking-[-0.12px] text-white"
        style={{ left: 130, top: 124 }}
      >
        {offer.figureLabel}
      </p>
      <p
        className="absolute -translate-x-1/2 whitespace-nowrap bg-clip-text text-center font-display text-[32px] font-bold leading-[40px] text-transparent"
        style={{
          left: 130,
          top: 154,
          backgroundImage: offer.figureGrad,
          filter: 'drop-shadow(0px 2px 12px rgba(0,0,0,0.39))',
        }}
      >
        {offer.figure}
      </p>
      <span className="absolute h-px bg-white/15" style={{ left: 35, top: 217, width: 192 }} />
      <div
        className="absolute flex items-center justify-center gap-[10px]"
        style={{ left: 35, top: 217, width: 198, height: 43 }}
      >
        <span className="flex size-[20px] items-center justify-center rounded-full border border-light200 opacity-90">
          <img src={`${A}/stepMinus.svg`} alt="" aria-hidden className="size-[16px]" />
        </span>
        <span className="w-[98px] text-center text-[12px] font-medium leading-[16px] tracking-[-0.24px] text-white">
          {offer.counter}
        </span>
        <span className="flex size-[20px] items-center justify-center rounded-full border border-light200 opacity-90">
          <img src={`${A}/stepPlus.svg`} alt="" aria-hidden className="size-[16px]" />
        </span>
      </div>
      <span className="absolute h-px bg-white/15" style={{ left: 35, top: 260, width: 192 }} />

      {/* The table. */}
      <p
        className="absolute text-[12px] font-semibold leading-[16px] tracking-[-0.12px] text-white"
        style={{ left: 307, top: 124 }}
      >
        {offer.rowsLabel}
      </p>
      {offer.rowsRight && (
        <p
          className="absolute whitespace-nowrap text-[12px] font-semibold leading-[16px] tracking-[-0.12px] text-white"
          style={{ left: 682, top: 124 }}
        >
          {offer.rowsRight}
        </p>
      )}
      <div
        className="absolute flex flex-col gap-[6px] overflow-hidden"
        style={{ left: 307, top: 154, width: 419.41, height: 60 }}
      >
        {offer.rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between whitespace-nowrap text-[12px] leading-[16px] text-white">
            <span className="font-medium tracking-[-0.24px] opacity-75">{label}</span>
            <span className="font-semibold tracking-[-0.12px]">{value}</span>
          </div>
        ))}
      </div>
      <p
        className={`absolute text-[12px] font-medium leading-[16px] tracking-[-0.24px] text-white ${
          offer.underline ? 'underline' : 'font-semibold'
        }`}
        style={{ left: 307, top: offer.underline ? 223 : 229 }}
      >
        {offer.footnote}
      </p>

      <button
        type="button"
        className="absolute flex items-center justify-center gap-[4px] rounded-[30px] bg-white text-[14px] font-semibold leading-[19px] tracking-[-0.14px] text-black"
        style={{
          left: 577,
          top: 235,
          width: 179,
          height: 38,
          filter: 'drop-shadow(0px 0px 2px rgba(0,0,0,0.04)) drop-shadow(0px 8px 8px rgba(0,0,0,0.08))',
        }}
      >
        {offer.cta}
      </button>
    </div>
  )
}

/** One of the three neighbouring countries. */
function CountryCard({ card }: { card: (typeof EXPLORE.cards)[number] }) {
  return (
    <div className="relative h-[315px] w-[206px] overflow-hidden rounded-[24px] border border-light200 bg-white">
      <div className="absolute left-[8px] top-[11px] h-[188px] w-[182px] overflow-hidden rounded-[16px]">
        <img src={`${A}/${card.photo}`} alt={card.country} className="absolute inset-0 size-full object-cover" />
        <p className="absolute left-[18px] top-[16px] whitespace-nowrap text-[16px] font-semibold leading-[20px] tracking-[-0.64px] text-white">
          {card.country}
        </p>
        {/* The carousel's own banner, at rest on its first frame. */}
        <div
          className="absolute left-0 flex h-[67px] w-full flex-col justify-center gap-[8px] px-[12px] pt-[8px] backdrop-blur-[2px]"
          style={{
            top: 121,
            backgroundImage: 'linear-gradient(179.344deg, rgba(0,0,0,0) 1.5%, #000000 98.5%)',
          }}
        >
          <div className="flex items-center gap-[8px]">
            <span className="flex size-[18px] rotate-180 items-center justify-center rounded-full border-[0.5px] border-white/20">
              <img src={`${A}/chevR.svg`} alt="" aria-hidden className="size-[12px]" />
            </span>
            <span className="flex-1 text-[12px] font-semibold leading-[16px] tracking-[-0.12px] text-white">
              {card.place}
            </span>
            <span className="flex size-[18px] items-center justify-center rounded-full border-[0.5px] border-white/50">
              <img src={`${A}/chevR.svg`} alt="" aria-hidden className="size-[12px]" />
            </span>
          </div>
          <div className="flex items-start justify-between">
            {[true, false, false].map((filled, i) => (
              <span key={i} className="relative h-[2px] w-[52px] rounded-[40px] bg-white/[0.16]">
                {filled && <span className="absolute inset-0 rounded-[40px] bg-white" />}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute left-[14px] top-[216px] flex w-[174px] flex-col gap-[3px] text-[12px] font-semibold leading-[16px]">
        {EXPLORE.rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="tracking-[-0.24px] text-grey600">{label}</span>
            <span className="whitespace-nowrap tracking-[-0.12px] text-black">{value}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="absolute left-1/2 flex h-[36px] w-[179px] -translate-x-1/2 items-center justify-center rounded-[30px] bg-black text-[14px] font-semibold leading-[19px] tracking-[-0.14px] text-white"
        style={{ top: 263 }}
      >
        {EXPLORE.cta}
      </button>
    </div>
  )
}
