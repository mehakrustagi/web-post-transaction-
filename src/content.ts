/**
 * Everything the sequence says, in one place. The design is a run of fixed
 * 1282x915 frames, so these are their literal strings.
 */
export const INTRO = {
  country: 'Vietnam',
  travellers: '2',
  headline: 'Visa guaranteed on 18 Oct, 6:30 pm',
}

export const RECEIPT = {
  title: 'VIETNAM',
  terms: ['Single entry', '30 day stay', '60 day validity'],
  groups: [
    {
      label: 'Paid so far',
      amount: '₹3,200',
      settled: true,
      lines: ['Government fee', 'Travel Insurance'],
    },
    {
      label: 'Due on approval',
      amount: '₹1,600',
      settled: false,
      lines: ['Atlys service fee'],
    },
  ],
  total: { label: 'Total amount due', amount: '₹4,800' },
}

export const GIFT = {
  thanks: 'As a thank you for choosing atlys, we gift you a',
  pickup: 'Tesla Cybertruck airport pick-up',
  blurb:
    'Just refer 3 friends to sign up, and a Tesla Cybertruck will drop you from the airport to your accommodation.',
  progress: { label: 'Progress', value: '0/3 friends', slots: 3 },
  /* The frame holds six of these but clips to the first three. */
  rows: [
    { label: 'Valid until', value: '27 Jun, 8:00 am' },
    { label: 'You pay', value: '₹0' },
    { label: 'Friends referred so far', value: '0' },
  ],
}

export const PAGE = {
  headline: 'UAE visa guaranteed on 18 Oct, 6:30 pm',
  terms: [
    ['60 day ', 'validity'],
    ['30 days ', 'stay'],
    ['Single ', 'entry'],
  ],
  download: 'Download Receipt',
  step: { label: 'step', value: '2' },
  lede: 'We have a gift for you',
  ribbon: 'just for you',
  cta: 'Refer Friends',
  customers: 'See our latest customers',
  /* Who is already on the booking, shown riding the progress bar. */
  travellers: [
    { initials: 'SB', face: 'avatarSB.svg' },
    { initials: 'MS', face: 'avatarMS.svg' },
  ],
}

/**
 * The step bar, in the frame's own coordinates. Taken off the exported SVG
 * rather than eyeballed: the segments are not evenly spaced.
 */
export const STEPS = [
  { x: 208, w: 213, done: true },
  { x: 426, w: 211, done: false },
  { x: 642, w: 213, done: false },
  { x: 860, w: 213, done: false },
]

/** The ruler down the left margin. Each entry is [top, width]. */
export const RAIL: [number, number][] = [
  [270, 21], [281, 21], [292, 21],
  [353, 21], [364, 21], [375, 27], [386, 35], [397, 27],
  [408, 21], [419, 21], [430, 21], [441, 21], [452, 21], [463, 21],
  [474, 21], [485, 21], [496, 21], [507, 21], [518, 21], [529, 21],
  [540, 21], [551, 21], [562, 21], [573, 21], [584, 21], [595, 21],
  [606, 21], [617, 21],
]

/** The two upsell cards under the gift, and the step each sits on. */
export const OFFERS = [
  {
    step: '3',
    kicker: 'Mandatory for everyone before take-off',
    top: 696,
    icon: 'iconShield.svg',
    /* Weather, not a photograph of weather — see `CloudShader`. */
    sky: true,
    art: { src: 'cardCloud.png', left: 228, top: 177, width: 328, height: 158, opacity: 0.14, flip: true },
    bg: 'linear-gradient(175.298deg, #0b3299 8.856%, #6a9eff 136.62%)',
    title: 'Travel Insurance',
    blurb:
      'The Vietnam government mandates you to purchase travel insurance for all days of your trip',
    figureLabel: 'Coverage up to',
    figure: '₹40 Lakh',
    figureGrad: 'linear-gradient(105.936deg, #c3fdff 0.744%, #ffffff 54.93%, #c3c6ff 99.604%)',
    counter: '10 Days',
    rowsLabel: "What's Covered",
    rowsRight: 'Insured',
    rows: [
      ['Emergency Medical Cover', '$300'],
      ['Loss of passport', '$300'],
      ['Loss of checked baggage', '$300'],
    ],
    footnote: 'view more',
    underline: true,
    cta: 'Add for ₹6,900',
    ribbon: 'requirement',
  },
  {
    step: '4',
    kicker: 'Best to have upon touchdown',
    top: 1084,
    icon: 'iconEsim.svg',
    art: { src: 'cardWave.png', left: 450, top: 157, width: 290, height: 280, opacity: 1, flip: false },
    bg: 'linear-gradient(175.298deg, #0b5975 8.856%, #159d94 136.62%)',
    title: 'eSIM data',
    blurb:
      'Your current mobile sim WILL NOT work internationally. Don\u2019t rely on spotty wifi. Top up anytime!',
    figureLabel: 'Data up to',
    figure: '3 GB',
    figureGrad: 'linear-gradient(96.38deg, #c3fdff 0.744%, #ffffff 54.93%, #c3fff0 99.604%)',
    counter: '3 GB',
    rowsLabel: 'You can top up your data anytime',
    rowsRight: '',
    rows: [
      ['Total GB Data', '3 GB'],
      ['Duration', '3-4 days'],
      ['Average speed', '100 MBPS'],
    ],
    footnote: '77% users add this',
    underline: false,
    cta: 'Add for ₹6,900',
    ribbon: '',
  },
] as const

/** What an upsell card needs, loosened off `OFFERS` so a variant can vary it. */
export type Offer = {
  kicker: string
  top: number
  icon: string
  art: { src: string; left: number; top: number; width: number; height: number; opacity: number; flip: boolean }
  bg: string
  /** Whether the card's backdrop is a running cloud shader. */
  sky?: boolean
  title: string
  blurb: string
  figureLabel: string
  figure: string
  figureGrad: string
  counter: string
  rowsLabel: string
  rowsRight: string
  rows: readonly (readonly [string, string])[]
  footnote: string
  underline: boolean
  cta: string
  ribbon: string
}

export const EXPLORE = {
  heading: '60% of travellers club these countries in one trip!',
  blurb:
    'Just an hour away from Vietnam, and all your paperwork is already technically submitted. No extra work, and an extra country within one trip!',
  tag: '1 hr away from Vietnam',
  cards: [
    { country: 'Qatar', place: 'Doha', photo: 'cQatar.jpg' },
    { country: 'Oman', place: 'Mutrah corniche', photo: 'cOman.jpg' },
    { country: 'Egypt', place: 'Sphinx of Giza', photo: 'cEgypt.jpg' },
  ],
  rows: [
    ['Visa on', '12 Oct, 2026'],
    ['Stay up to', '30 days'],
  ],
  cta: 'Add for ₹1170',
}

export const LINKS = [
  { label: 'Cancellation Policy', sub: '' },
  { label: 'Recent Reviews', sub: 'What travelers have said in the last 7 days' },
  { label: 'Contact Support', sub: '' },
]

/**
 * The ruler down the left margin. The design restarts the tick series after
 * each step number rather than running one continuous rhythm, so this is four
 * runs, and the three wide ticks under each number are stated outright.
 */
const ARROWS = new Set([375, 386, 397, 788, 799, 810, 1223, 1234, 1245])
const ARROW_W: Record<number, number> = { 375: 27, 386: 35, 397: 27, 788: 27, 799: 35, 810: 27, 1223: 27, 1234: 35, 1245: 27 }
export const RAIL_TICKS: [number, number][] = [
  [270, 303],
  [353, 694],
  [744, 1085],
  [1135, 1465],
].flatMap(([from, to]) => {
  const out: [number, number][] = []
  for (let y = from; y < to; y += 11) out.push([y, ARROWS.has(y) ? ARROW_W[y] : 21])
  return out
})

/** Where each step number sits on the rail. */
export const RAIL_STEPS = [
  { top: 303, value: '2' },
  { top: 694, value: '3' },
  { top: 1085, value: '4' },
]

/**
 * The map variant's page has one step, not three, so its ruler stops where the
 * card does (438:16680). Same two runs either side of the number.
 */
export const MAP_RAIL_TICKS: [number, number][] = [
  [270, 303],
  [353, 597],
].flatMap(([from, to]) => {
  const out: [number, number][] = []
  for (let y = from; y < to; y += 11) out.push([y, ARROWS.has(y) ? ARROW_W[y] : 21])
  return out
})

export const MAP_RAIL_STEPS = [{ top: 303, value: '2' }]

/** The one card on that page: the eSIM, with the orb where its mesh was. */
export const MAP_OFFER: Offer = {
  ...OFFERS[1],
  kicker: 'Best to have upon touchdown',
  top: 296,
  ribbon: 'CHEAPEST',
}
