import { RECEIPT } from '../content'

const A = '/assets'

/** The slip's own size, from the design (node 424:10041). */
export const PAPER_W = 320.507
export const PAPER_H = 470

/**
 * Everything printed on the sheet, in the sheet's own coordinates.
 *
 * `data-line` marks the rows the feed slows over. `PrintRig` reads their
 * offsets to build the bands where the paper crawls — that stutter is the
 * printer working through a line of text, so the marks have to be on the
 * things that are actually text.
 */
export function PaperFace() {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute flex flex-col items-center gap-[10px]"
        style={{ left: 33.84, top: 69.62, width: 253.818 }}
        data-line
      >
        <p className="w-full text-center text-[12px] font-bold uppercase leading-[14px] tracking-[0.96px] text-grey900">
          {RECEIPT.title}
        </p>
        <div className="flex h-[20px] w-full items-center gap-[8.638px]">
          {RECEIPT.terms.map((term, i) => (
            <span key={term} className="flex items-center gap-[8.638px]">
              {i > 0 && <img src={`${A}/dot.svg`} alt="" aria-hidden className="size-[3.702px]" />}
              <span className="whitespace-nowrap text-[12px] font-medium leading-[16px] tracking-[-0.24px] text-grey600">
                {term}
              </span>
            </span>
          ))}
        </div>
      </div>

      <Rule top={147.62} />

      {/*
        The spine: a filled dot on what is already paid, a hollow one on what
        is not, joined by the line between them. It is one drawing in the
        design, so it stays one asset here rather than two dots and a border
        that would have to be kept in step with the rows by hand.
      */}
      <img
        src={`${A}/timeline.svg`}
        alt=""
        aria-hidden
        className="absolute max-w-none"
        style={{ left: 28.34, top: 188.23, width: 7.37, height: 105.74 }}
      />

      {RECEIPT.groups.map((group, i) => (
        <Group key={group.label} group={group} top={i === 0 ? 180.62 : 277.62} />
      ))}

      <Rule top={357.62} />

      <div
        className="absolute flex items-center justify-between text-[17.277px] font-semibold leading-[23.447px] tracking-[-0.1728px] text-grey900"
        style={{ left: 28.87, top: 388.62, width: 257.948 }}
        data-line
      >
        <span>{RECEIPT.total.label}</span>
        <span>{RECEIPT.total.amount}</span>
      </div>
    </div>
  )
}

/** One perforation line across the slip. */
function Rule({ top }: { top: number }) {
  return (
    <img
      src={`${A}/dashedRule.svg`}
      alt=""
      aria-hidden
      className="absolute max-w-none"
      style={{ left: 26.87, top, width: 266.757, height: 1.23405 }}
    />
  )
}

/** A heading line with its amount, and the fees folded under it. */
function Group({ group, top }: { group: (typeof RECEIPT.groups)[number]; top: number }) {
  return (
    <div className="absolute" style={{ left: 47.99, top, width: 238.295 }} data-line>
      <div
        className="flex h-[23.447px] items-center justify-between text-[16px] font-semibold leading-[20px] tracking-[-0.64px]"
        style={{ color: group.settled ? '#000' : 'rgba(0,0,0,0.66)' }}
      >
        <span>{group.label}</span>
        <span>{group.amount}</span>
      </div>
      <div className="mt-[2.7px] flex flex-col gap-[2.85px]">
        {group.lines.map((line) => (
          <p
            key={line}
            className="text-[14px] font-semibold leading-[19px] tracking-[-0.14px]"
            style={{ color: 'rgba(0,0,0,0.4)' }}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  )
}
