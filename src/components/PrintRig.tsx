import { useEffect, useRef, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import { PAPER_H, PAPER_W, PaperFace } from './Receipt'

/*
 * The printer, ported from `atlys-visa-submitted-animated_2.html`.
 *
 * The mechanic is that file's, kept intact: a velocity-driven feed that slows
 * over every printed line, then a serrated tear front that travels left to
 * right while the freed side sags, then the corner curling over as the sheet
 * drops and swings to rest. What changed is only what the sheet says and how
 * big it is — the receipt is this design's, so W and H are ours.
 *
 * The paper is a clip-path on a plain div rather than an exported SVG, because
 * the tear has to be redrawn every frame as the front moves: the serration is
 * geometry, not artwork.
 */

/**
 * The machine, at the source's proportions.
 *
 * Every number below is that file's, scaled by how much narrower this slip is
 * than the one it was drawn for (361px). Scaling the width alone left the body
 * too tall for its own slot and the headline sitting on the lid.
 */
const S = PAPER_W / 361
export const MACHINE_W = 433 * S
export const MACHINE_H = 115 * S
const HOLE_X = 20 * S
const HOLE_Y = 24 * S
const HOLE_H = 17 * S
const BODY_R = 20 * S
const HOLE_R = 9 * S
/** Where the sheet comes through, measured from the top of the machine. */
export const EXIT_Y = 27 * S

/**
 * How the machine goes once it has nothing left to print.
 *
 * Short, accelerating, and dropping a little as it goes. A half-second linear
 * dissolve on a thing this size reads as it being slowly rubbed out; it should
 * get out of the way.
 */
const BOW_OUT =
  'opacity .2s cubic-bezier(.4,0,1,.6), transform .26s cubic-bezier(.4,0,1,.6)'

/** Tear line, px below the top of the paper window — just under the slot lip. */
const T = 15 * S
/** Tooth width and depth. The torn edge and the sheet's foot are the same cut. */
const TW = 7
const TD = 4
/**
 * The fold.
 *
 * Not a corner curl — paper this thin does not keep a 40px crease, it flops.
 * Once the sheet is cut the whole top-right of it comes over on the diagonal
 * and lies across the face, covering what is printed under it. Proportional to
 * the sheet, because that is what decides how far it falls.
 */
/*
 * The corner that comes over, now at the top *left*.
 *
 * Which is the end the tear starts from, and that is the whole reason: the
 * left of the sheet is free before the cut is a third of the way across, so it
 * has something to curl with while the rest of the tear is still running. A
 * corner on the right cannot move until the last tooth is cut, which is why it
 * used to arrive as a separate event after the fact.
 *
 * Proportioned so the crease meets the top edge about a fifth of the way
 * along — early enough to curl while the cut carries on — and steeper down
 * the side to keep the roll the same size it was.
 */
const FW = PAPER_W * 0.18
/**
 * How deep down the side the crease reaches once the cut is finished.
 *
 * Shallow, and it has to be: the paper above the crease is not hidden, it is
 * *gone* — rolled into the tube — so a deep crease means a large wedge of
 * missing slip and a tube far too slim to account for it. A thin strip along
 * the top rolls into a tube you can believe.
 */
const FH = PAPER_H * 0.13
/** And how far along the top edge it reaches, which is a corner, not the lot. */
const FX = 0.5

/**
 * The cloth, as geometry rather than as a filter.
 *
 * A displacement map smears pixels, so at any amplitude worth looking at it
 * chews the sheet's own outline into steps. This is the trick from the CSS
 * ribbon pens instead: the slip is a chain of horizontal slices, each one a
 * child of the slice above it, hinged on their shared edge and rotated a
 * little further round. Nesting is what makes it paper — the slices cannot
 * come apart, because every one of them is carried by the one it is attached
 * to, so the surface is continuous by construction and the edge stays an edge.
 *
 * Eighteen is enough that the fold between slices reads as curve rather than
 * facet, and few enough that the slip is eighteen copies of itself and not
 * eighty.
 */
const RIBS = 18
const RIB_H = PAPER_H / RIBS
const RAD = Math.PI / 180
/** How much of the sheet's length one full wave occupies. */
const WAVES = 1.35

/**
 * How far a slice is allowed to move, by how far down the sheet it is.
 *
 * Zero at the rollers and full at the hem. The slot is holding the paper, so
 * nothing happens at the top however hard it is blowing — which is also what
 * keeps the serrated edge sitting straight in the mouth of the machine.
 */
const envelope = (i: number) => Math.pow(i / (RIBS - 1), 1.15)

const px = (v: number | string) => (typeof v === 'number' ? `${v.toFixed(2)}px` : v)
const poly = (pts: [number | string, number | string][]) =>
  `polygon(${pts.map(([x, y]) => `${px(x)} ${px(y)}`).join(',')})`

type Pt = [number | string, number | string]

function bottomZig(W: number): Pt[] {
  const pts: Pt[] = []
  for (let x = W; x >= 0; x -= TW) {
    pts.push([x, `calc(100% - ${TD}px)`], [Math.max(x - TW / 2, 0), '100%'])
  }
  pts.push([0, `calc(100% - ${TD}px)`])
  return pts
}

/** Serrated tear line from x0 to x1. The teeth point up, into the stub. */
function tearLine(x0: number, x1: number): Pt[] {
  const pts: Pt[] = []
  for (let x = x0; x < x1; x += TW) {
    pts.push([x, T + TD])
    if (x + TW / 2 < x1) pts.push([x + TW / 2, T])
  }
  pts.push([x1, T + TD])
  return pts
}

/**
 * The sheet's outline: torn up to `front`, still whole beyond it.
 *
 * With `withFlap` the top-left corner has been taken off along the crease, so
 * the edge starts part-way down the left side, climbs to where the crease
 * meets the top, and only then runs its teeth to wherever the cut has got to.
 */
export function paperClip(W: number, front: number, withFlap?: boolean) {
  let top: Pt[]
  if (withFlap) {
    /* Cut to the crease the curl is actually rolling on, so the two cannot
       drift apart: the sheet ends where the roll begins. */
    const c = flapPath(front)
    top = [[0, c.depth], [c.crest, T + TD], ...tearLine(c.crest, Math.min(front, W))]
    if (front < W) top.push([front + 2, 0], [W, 0])
  } else if (front <= 0) top = [[0, 0], [W, 0]]
  else
    top = [
      ...tearLine(0, Math.min(front, W)),
      ...(front < W ? ([[front + 2, 0], [W, 0]] as Pt[]) : []),
    ]
  return poly([...top, ...bottomZig(W)])
}

/**
 * The curl, as the tear makes it.
 *
 * It is not a corner that appears once the cut is finished — it is the cut.
 * The crease's top end *is* the tear front, so the roll extends rightward
 * exactly as fast as the sheet is being freed, and its far end runs further
 * down the left edge the further the cut has got: the more is torn, the lower
 * it hangs.
 *
 * The roll tapers the other way from a folded corner. It is tight to nothing
 * at the front, where the paper is being released this instant and has had no
 * time to come over at all, and fullest at the left edge, which was freed
 * first and has been rolling the longest. That taper — a point at one end and
 * the round mouth of a tube at the other — is the whole look of paper peeling.
 */
export function flapPath(front = PAPER_W) {
  const W = PAPER_W
  const f = Math.max(FW, Math.min(front, W))
  const g = (f - FW) / (W - FW)

  /*
   * The crease: it reaches further along the top edge and further down the
   * side the more of the sheet has been let go, and it is still a corner at
   * the end of it — the teeth to the right of it are the cut, and they stay.
   */
  const ax = W * (FW / W + (FX - FW / W) * g)
  const ay = T + TD
  const bx = 0
  const by = T + TD + FH * (0.4 + 0.6 * g)
  const L = Math.hypot(bx - ax, by - ay)
  const nx = (bx - ax) / L
  const ny = (by - ay) / L
  /* Across the crease, on the side the paper lands — over the face of the
     sheet, not off into space. */
  let mx = -ny
  let my = nx
  if (-ax * mx > 0) {
    mx = -mx
    my = -my
  }

  /**
   * How fat the tube is where it is fattest.
   *
   * Slim. Paper rolls on a tight radius, and a roll that stands a long way off
   * its own crease is not a roll — it is a flap again, sweeping across the
   * middle of the slip and covering what is printed there.
   */
  const H = FH * 0.5

  const N = 56
  const pts: [number, number][] = []
  for (let i = 0; i <= N; i++) {
    const s = i / N
    /*
     * Zero at the front and full at the left edge, with the shoulder well
     * along — which is what makes it a tube with a mouth rather than a lens.
     */
    const k = Math.pow(s, 1.7) * (1 - Math.pow(1 - s, 2.6))
    const r = H * k
    pts.push([ax + nx * L * s + mx * r, ay + ny * L * s + my * r])
  }

  const mid = { x: (ax + bx) / 2, y: (ay + by) / 2 }

  return {
    d:
      `M${ax.toFixed(2)} ${ay.toFixed(2)}` +
      pts.map(([x, y]) => `L${x.toFixed(2)} ${y.toFixed(2)}`).join('') +
      'Z',
    /* Across the roll, not along the sheet: the axis everything about the
       curl is shaded on. */
    grad: { x1: mid.x, y1: mid.y, x2: mid.x + mx * H, y2: mid.y + my * H },
    origin: `${mid.x}px ${mid.y}px`,
    height: by + H * 2 + 30,
    /** Where the crease meets the left edge, and the top. */
    depth: by,
    crest: ax,
  }
}

/**
 * What the curl is painted with, wherever it is drawn.
 *
 * Three scenes draw this same corner and they have to agree, so the art lives
 * here and they bring their own `<svg>` — which is all that differs between
 * them, because only the printer's copy has to be animated.
 */
export function FlapArt({
  id,
  front = PAPER_W,
  paths,
}: {
  id: string
  /** How far the tear has run, which is what the roll is made of. */
  front?: number
  /** Handed back so the printer can redraw them per frame as it grows. */
  paths?: (els: SVGPathElement[]) => void
}) {
  const f = flapPath(front)
  const full = flapPath(PAPER_W)
  return (
    <>
      <defs>
        <linearGradient id={`${id}Roll`} gradientUnits="userSpaceOnUse" {...full.grad}>
          {/*
            Read across the roll from the crease outward: deep inside the
            curl where almost no light reaches, opening out through the
            turn, white over the crown, and falling away again at the lip
            as the edge turns from the light. A flat triangle can be shaded
            light-to-dark and still look flat; it is the fact that this
            comes back down at the far end that makes it a cylinder.
          */}
          <stop offset="0" stopColor="#A9AAB4" />
          <stop offset=".10" stopColor="#C6C7CF" />
          <stop offset=".30" stopColor="#E9E9EE" />
          <stop offset=".58" stopColor="#FFFFFF" />
          <stop offset=".85" stopColor="#FCFCFE" />
          <stop offset="1" stopColor="#EDEDF3" />
        </linearGradient>
        {/* The core of the roll, laid over the top. The gradient alone gives
            the turn its tone; this gives it its depth, and it has to be its
            own layer because it is darkest exactly where the roll is
            tightest rather than where the gradient starts. */}
        <linearGradient id={`${id}Core`} gradientUnits="userSpaceOnUse" {...full.grad}>
          <stop offset="0" stopColor="#5C5E6B" stopOpacity=".42" />
          <stop offset=".07" stopColor="#7A7C88" stopOpacity=".2" />
          <stop offset=".22" stopColor="#9A9CA8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g
        ref={(g) => {
          if (g && paths) paths([...g.querySelectorAll('path')])
        }}
      >
        <path d={f.d} fill={`url(#${id}Roll)`} />
        <path d={f.d} fill={`url(#${id}Core)`} />
      </g>
    </>
  )
}

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const waitMs = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** How far the sheet has dropped by the time it comes to rest. */
export const REST_Y = 28

export function PrintRig({
  delay = 0,
  leaving = false,
  detached = false,
  handOver = false,
  away,
  onRest,
  onPrinted,
}: {
  delay?: number
  /** The machine and the tail in its mouth go; the slip stays. */
  leaving?: boolean
  detached?: boolean
  /**
   * Somebody else is drawing this sheet now. Cut, not faded: the scene taking
   * it over starts it at exactly this position and size, so the swap is only
   * invisible if neither of them blinks.
   */
  handOver?: boolean
  /**
   * Where the freed slip goes: not off the frame, but back into it. The scene
   * works out the offset, because it is the only thing that knows where this
   * rig sits and where the vehicle is about to come out.
   */
  away: { x: number; y: number; scale: number }
  detachedScale?: number
  onRest?: () => void
  /** The whole slip is out of the machine — before the tear, before the drop. */
  onPrinted?: () => void
}) {
  const rig = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  /** The hinged slices, and the three layers each of them carries. */
  const ribs = useRef<(HTMLDivElement | null)[]>([])
  /** One full copy of the slip per slice, each showing only its own band. */
  const faces = useRef<(HTMLDivElement | null)[]>([])
  const shades = useRef<(HTMLDivElement | null)[]>([])
  const stub = useRef<HTMLDivElement>(null)
  const flap = useRef<SVGSVGElement>(null)
  /** The two paths the curl is drawn with, redrawn as it unrolls. */
  const curl = useRef<SVGPathElement[]>([])
  const box = useRef<HTMLDivElement>(null)
  const still = useReducedMotion()
  const rest = useRef(onRest)
  rest.current = onRest
  const printed = useRef(onPrinted)
  printed.current = onPrinted
  /*
   * Read, not depended on. `useReducedMotion` reports `null` on the first
   * render and resolves to a boolean after it, and with that value in the
   * effect's dependencies the resolution tore the whole script down and
   * started the wait again from zero — twice over, with StrictMode's double
   * invoke. On this machine the two landed in the same tick and nothing
   * showed; anywhere slower it left a settled printer with an empty mouth for
   * as long as the restarts took, which looks exactly like a stall.
   */
  const stillRef = useRef(still)
  stillRef.current = still
  /** When the sequence first started, so a re-run resumes instead of restarting. */
  const t0 = useRef(0)

  useEffect(() => {
    const W = PAPER_W
    const H = PAPER_H
    let live = true
    if (!t0.current) t0.current = performance.now()

    /*
     * How the sheet moves, and how it behaves while it moves.
     *
     * A sheet that only translates reads as card. Paper this thin is cloth: the
     * length hanging free of the rollers is unsupported, so the further it is
     * out the more it bows under its own weight and the more it ripples. Both
     * are driven off exactly that — the fraction of the slip below the slot —
     * so the sheet stiffens back up as the machine takes its weight and
     * loosens as it lets go.
     */
    /** How hard it is blowing, in degrees of swing at the hem. */
    let slack = 0
    /** And how far the free end is leaning under its own weight. */
    let lean = 0
    const setWave = (v: number) => {
      slack = v
    }

    /*
     * The wind. One loop for the whole life of the sheet: every frame it walks
     * the chain and gives each slice the angle its own place in the wave calls
     * for. The angles stored are absolute — where that slice is pointing — and
     * what each one is actually given is the difference from the slice above
     * it, because a nested rotation is measured against its parent.
     *
     * Two waves, not one: a long one that runs the length of the sheet and a
     * shorter, faster one at a third the height. One alone is a sine and reads
     * as a mechanism; two beating against each other is cloth.
     */
    let gusting = 0
    /** Every slice's absolute angle, so the shading can see across the seams. */
    const tilt = new Float32Array(RIBS + 1)
    /*
     * And the ripple on its own, which is what the light is read off. The
     * sheet's lean under its own weight is a lean, not a crease: shading the
     * whole angle put the hem in permanent shadow and washed the bottom third
     * of the slip grey.
     */
    const ripple = new Float32Array(RIBS + 1)
    /*
     * The light on a slice, as a colour. Turned so its face points up it
     * catches the light; turned away it loses it — and it is this, not the
     * geometry, that does nearly all the work, because a sheet rippling by a
     * few degrees is almost invisible seen square on.
     */
    const lit = (v: number) =>
      v < 0
        ? `rgba(13,16,32,${(Math.min(1, -v) * 0.4).toFixed(3)})`
        : `rgba(255,255,255,${(Math.min(1, v) * 0.34).toFixed(3)})`

    const weave = (now: number) => {
      const t = now * 0.001
      /*
       * Two waves, not one: a long one that runs the length of the sheet and a
       * shorter, faster one at a third the height. One alone is a sine and
       * reads as a mechanism; two beating against each other is cloth.
       */
      for (let i = 0; i <= RIBS; i++) {
        const e = envelope(i)
        const u = i / RIBS
        ripple[i] =
          slack *
          e *
          (Math.sin(Math.PI * 2 * WAVES * u - t * 2.15) +
            Math.sin(Math.PI * 2 * WAVES * 2.4 * u - t * 3.4) * 0.34)
        tilt[i] = ripple[i] + lean * e
      }
      let prev = 0
      let prevY = 0
      for (let i = 0; i < RIBS; i++) {
        const a = tilt[i]
        /* A slow twist across the sheet as well, so it is not merely a flag
           seen exactly side-on. */
        const b = slack * envelope(i) * 0.22 * Math.sin(t * 0.85 + (i / RIBS) * 1.6)
        const rib = ribs.current[i]
        if (rib) {
          rib.style.transform = `rotateX(${(a - prev).toFixed(3)}deg) rotateY(${(b - prevY).toFixed(3)}deg)`
        }
        /*
         * Shaded as a gradient between the slice's own two edges rather than
         * as one value for the whole of it. Flat per slice, the sheet comes
         * out in eighteen visible bands; run edge to edge it is continuous
         * across the seams, because neighbours agree on the edge they share.
         */
        const sh = shades.current[i]
        if (sh) {
          sh.style.backgroundImage = `linear-gradient(180deg, ${lit(Math.sin(ripple[i] * RAD) * 2.6)}, ${lit(Math.sin(ripple[i + 1] * RAD) * 2.6)})`
        }
        prev = a
        prevY = b
      }
      gusting = requestAnimationFrame(weave)
    }
    gusting = requestAnimationFrame(weave)

    const setFeed = (y: number) => {
      const free = Math.max(0, Math.min(1, y / H))
      if (sheet.current) sheet.current.style.transform = `translateY(${y - H}px)`
      /*
       * Both scale with the length hanging free of the rollers, because that
       * is the length with nothing holding it: the sheet stiffens back up as
       * the machine takes its weight and loosens as it lets go.
       */
      setWave(free * free * 16)
      lean = -free * 5
    }
    const cls = (name: string, on: boolean) => box.current?.classList.toggle(name, on)

    /*
     * The outline goes on every copy, because every copy is a whole slip and
     * only shows its own band of one. During the tear only the top of it
     * changes, and the tear line sits inside the first slice — so the frames
     * that have to repaint eighteen clip paths are the two that cannot be
     * helped, not the eight hundred of the rip.
     */
    const setClip = (c: string, rows = RIBS) => {
      const n = Math.min(rows, RIBS)
      for (let i = 0; i < n; i++) {
        const f = faces.current[i]
        if (f) f.style.clipPath = c
      }
    }

    setClip(paperClip(W, 0))
    stub.current!.style.clipPath = poly([[0, 0], [W, 0], ...tearLine(0, W).reverse()])
    setFeed(0)

    if (stillRef.current) {
      setClip(paperClip(W, W, true))
      cls('printing', true)
      cls('torn', true)
      cls('flapped', true)
      sheet.current!.style.transform = `translateY(${REST_Y}px)`
      printed.current?.()
      rest.current?.()
      return
    }

    /*
     * The printed lines, in feed-progress coordinates. The sheet slows as each
     * one comes through the slot and picks up again between them, which is the
     * whole reason the feed is a velocity model and not a tween.
     */
    const bands = [...faces.current[0]!.querySelectorAll<HTMLElement>('[data-line]')].map(
      (el) => [H - el.offsetTop - el.offsetHeight - 3, H - el.offsetTop + 3] as const,
    )

    const frames = (fn: (dt: number, t: number) => boolean | void) =>
      new Promise<void>((res) => {
        let last = performance.now()
        const t0 = last
        const tick = (now: number) => {
          if (!live) return res()
          const dt = Math.min(0.05, (now - last) / 1000)
          last = now
          fn(dt, now - t0) === false ? res() : requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      })

    const run = async () => {
      await waitMs(Math.max(0, delay * 1000 - (performance.now() - t0.current)))
      if (!live) return

      // 1 · print — continuous feed out of the cavity, slowing over each line
      cls('printing', true)
      cls('rumble', true)
      let y = 0
      let v = 0
      await frames((dt) => {
        const onLine = bands.some(([a, b]) => y >= a && y <= b)
        let target = onLine ? 115 : 250
        const left = H - y
        if (left < 28) target = Math.max(38, left * 6)
        v += (target - v) * Math.min(1, dt * 6)
        y = Math.min(H, y + v * dt)
        setFeed(y)
        if (y >= H) return false
      })
      if (!live) return
      cls('rumble', false)
      cls('done', true)
      printed.current?.()
      await waitMs(330)
      if (!live) return

      // 2 · tear — a tug, then the serrated edge rips steadily left to right
      /*
       * The machine holds still. It used to take a jolt as the cut gave and
       * another as the sheet dropped, and a printer this wide moving even a
       * pixel and a half is the whole frame moving — it read as the screen
       * being shaken rather than as paper coming off a roll. The tug stays,
       * because that is on the sheet, which is the thing being pulled.
       */
      await sheet.current!.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(3px)' },
          { transform: 'translateY(0)' },
        ],
        { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' },
      ).finished
      if (!live) return

      /*
       * The pull before it gives. Paper tightens against the cut and then has
       * nothing holding it, so the slack jumps as the tear runs and drops away
       * once the sheet is hanging on its own.
       */
      const tension = slack
      cls('torn', true)
      const TEAR_MS = 820
      /*
       * The cut and the curl are one event, not two.
       *
       * The tear runs left to right, so the left corner is free long before
       * the last tooth is cut — and a freed corner of paper this thin does not
       * wait politely for the rest of the sheet. The moment the front passes
       * the crease the corner starts coming over, and it is still unrolling
       * while the cut finishes. It used to be a separate beat afterwards,
       * which is why it read as something happening *to* the slip rather than
       * as part of the same tear.
       */
      let curlAt = 0
      await frames((_dt, t) => {
        const e = easeIO(Math.min(1, t / TEAR_MS))
        const front = e * W
        if (!curlAt && front >= FW) {
          curlAt = t
          cls('flapped', true)
        }
        if (curlAt) {
          const d = flapPath(front).d
          for (const path of curl.current) path.setAttribute('d', d)
        }
        /* The fold reaches a good way down the side, so the clip has to be
           written to every rib it crosses — not just the two the tear line
           itself lives in. */
        setClip(paperClip(W, front, curlAt > 0), curlAt ? 8 : 2)
        /* The freed left side sags as the tear front travels right. */
        sheet.current!.style.transform = `translateY(${e * 4}px) rotate(${-e * 3}deg)`
        setWave(tension * (1 + Math.sin(e * Math.PI) * 0.45))
        if (t >= TEAR_MS) return false
      })
      if (!live) return

      // 3 · and it drops, already cut and already curled
      setClip(paperClip(W, W, true))
      stub.current?.animate(
        [
          { transform: 'translateY(0)' },
          { transform: 'translateY(-1px)' },
          { transform: 'translateY(0)' },
        ],
        { duration: 400 },
      )
      /*
       * And then it drapes. Nothing is feeding it any more, so the ripple
       * calms to a resting slack rather than staying taut — run alongside the
       * fall, because the two are the same event: the sheet letting go.
       */
      const settling = slack
      frames((_dt, t) => {
        const q = Math.min(1, t / 1000)
        /* Low enough that handing the sheet to the next scene, which draws it
           flat, is not a step you can catch. */
        setWave(settling + (6 - settling) * (1 - Math.pow(1 - q, 3)))
        if (q >= 1) return false
      })

      await sheet.current!.animate(
        [
          { transform: 'translateY(4px) rotate(-3deg)' },
          { transform: 'translateY(34px) rotate(1.8deg)', offset: 0.42 },
          { transform: 'translateY(24px) rotate(-.8deg)', offset: 0.68 },
          { transform: 'translateY(29px) rotate(.3deg)', offset: 0.86 },
          { transform: 'translateY(28px) rotate(0deg)' },
        ],
        { duration: 1100, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' },
      ).finished
      if (!live) return
      sheet.current!.getAnimations().forEach((a) => a.cancel())
      sheet.current!.style.transform = `translateY(${REST_Y}px)`
      cls('float', true)
      rest.current?.()
    }

    run()
    return () => {
      live = false
      cancelAnimationFrame(gusting)
    }
    /*
     * Runs once. Everything it needs that can change — whether motion is
     * wanted, who to tell when the slip is at rest — it reads through a ref,
     * because re-running it means starting the printer again from the top.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const f = flapPath()

  /*
   * The chain, built from the hem upwards so each slice can be handed the one
   * that hangs off it. Every slice is a window onto a whole copy of the slip,
   * shifted up by however far down the sheet that slice sits — so the paper is
   * drawn once as far as the eye is concerned, and the eighteen of them line
   * up into it whatever angle they are at.
   */
  let cloth: ReactNode = null
  for (let i = RIBS - 1; i >= 0; i--) {
    const below = cloth
    cloth = (
      <div
        key={i}
        ref={(el) => {
          ribs.current[i] = el
        }}
        className="absolute left-0"
        style={{
          /* Every slice but the first begins exactly where its parent ends,
             which is the hinge they share and the reason they cannot part. */
          top: i === 0 ? 0 : RIB_H,
          width: PAPER_W,
          height: RIB_H,
          transformOrigin: '50% 0',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* A hair taller than the slice, so the seam has no hairline to show. */}
        <div
          className="absolute left-0 top-0 overflow-hidden"
          style={{ width: PAPER_W, height: RIB_H + 0.6 }}
        >
          <div
            ref={(el) => {
              faces.current[i] = el
            }}
            className="paper absolute left-0"
            style={{ top: -i * RIB_H, width: PAPER_W, height: PAPER_H }}
          >
            <PaperFace />
          </div>
          <div
            ref={(el) => {
              shades.current[i] = el
            }}
            aria-hidden
            className="pointer-events-none absolute inset-0"
          />
        </div>
        {below}
      </div>
    )
  }

  return (
    <div
      ref={box}
      className="rig-box absolute left-1/2 -translate-x-1/2"
      style={{ top: 0, width: MACHINE_W, height: MACHINE_H }}
    >
      <div
        ref={rig}
        className="rig absolute left-0 top-0"
        style={{
          width: MACHINE_W,
          height: MACHINE_H,
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'translateY(16px)' : 'none',
          transition: BOW_OUT,
        }}
      >
        {/* The body. */}
        <div
          className="absolute left-0 top-0 z-[1] w-full"
          style={{
            height: MACHINE_H,
            borderRadius: BODY_R,
            backgroundImage:
              'linear-gradient(180deg, rgba(255,255,255,.07) 0%, rgba(255,255,255,0) 22%), linear-gradient(180deg, #3B3B3D 0%, #2E2E30 100%)',
            boxShadow:
              '0 1px 0 rgba(255,255,255,.08) inset, 0 -1px 0 rgba(0,0,0,.4) inset, 0 24px 40px -18px rgba(10,10,20,.35), 0 6px 14px -6px rgba(10,10,20,.25)',
          }}
        />
        <span className="led absolute z-[6]" style={{ right: 16 * S, top: 13 * S }} />

        {/* The cavity, behind the paper … */}
        <div
          className="absolute z-[2] bg-[#060607]"
          style={{
            left: HOLE_X,
            right: HOLE_X,
            top: HOLE_Y,
            height: HOLE_H,
            borderRadius: HOLE_R,
            boxShadow: '0 1px 0 rgba(255,255,255,.07)',
          }}
        />
      </div>

      {/* … the paper window, clipped at the slot and free on the other three sides. */}
      <div
        className="absolute z-[3] overflow-visible"
        style={{
          left: (MACHINE_W - PAPER_W) / 2,
          top: EXIT_Y,
          width: PAPER_W,
          /* Clipped at the slot until the slip is loose; after that it has to
             be able to travel back up over the machine to reach the middle. */
          clipPath: detached ? 'none' : 'inset(0 -220px -640px -220px)',
        }}
      >
        <div
          ref={stub}
          className="stub absolute left-0 top-0 z-[2] w-full bg-white"
          style={{
            height: T + TD + 2,
            opacity: leaving ? 0 : 1,
            transform: leaving ? 'translateY(16px)' : 'none',
            transition: BOW_OUT,
          }}
        />

        {/*
          Two transforms on two elements. The inner one is the machine's — the
          feed, the tear, the fall — and the outer one is what happens to the
          slip once it is nobody's but its own. Folding them together would
          mean the drift had to know where the fall had got to.
        */}
        <div
          className="relative z-[3]"
          style={{
            transformOrigin: '50% 50%',
            transform: detached
              ? `translate(${away.x}px, ${away.y}px) scale(${away.scale})`
              : 'none',
            opacity: handOver ? 0 : detached ? 0 : 1,
            transition: detached
              /* The fade trails the travel rather than cutting it short, so
                 the sheet is still readable most of the way back. */
              ? 'transform 1.3s cubic-bezier(.3,0,.2,1), opacity .85s ease-in .3s'
              : 'none',
          }}
        >
          <div ref={sheet} className="sheet relative" style={{ transformOrigin: '100% 0' }}>
            {/*
              The curl rides inside the sheet rather than beside it. In the
              source it is a sibling of the receipt and stays at the tear line
              while the receipt drops, which leaves it floating a centimetre
              clear of the corner it belongs to — and here the slip goes on to
              leave the frame entirely, so it has to travel with it.
            */}
        <svg
              ref={flap}
              className="flap absolute left-0 top-0 z-[2]"
              style={{ width: PAPER_W, height: f.height, transformOrigin: f.origin }}
              viewBox={`0 0 ${PAPER_W} ${f.height}`}
              aria-hidden
            >
              {/* Starts closed: the corner is still flat on the sheet until
                  the cut lets it go. */}
              <FlapArt
                id="flap"
                front={FW}
                paths={(els) => {
                  curl.current = els
                }}
              />
            </svg>


            {/*
              The cloth. Perspective sits here rather than on the sheet
              because the sheet carries a drop-shadow, and a filtered element
              flattens its own 3D — the chain has to be the thing that is in
              perspective, with the shadow cast over the result.
            */}
            <div
              style={{
                position: 'relative',
                width: PAPER_W,
                height: PAPER_H,
                perspective: 1500,
                perspectiveOrigin: '50% 0',
                transformStyle: 'preserve-3d',
              }}
            >
              {cloth}
            </div>
          </div>
        </div>
      </div>

      {/* The cavity's shading, in front of the paper, so the sheet rises out of the dark. */}
      <div
        className="hole-shade absolute z-[5] overflow-hidden"
        style={{
          left: HOLE_X,
          right: HOLE_X,
          top: HOLE_Y,
          height: HOLE_H,
          borderRadius: HOLE_R,
          backgroundImage:
            'linear-gradient(180deg, #060607 0%, rgba(6,6,7,.94) 28%, rgba(6,6,7,.62) 60%, rgba(6,6,7,.3) 85%, rgba(6,6,7,.18) 100%)',
          boxShadow: 'inset 0 2px 3px rgba(0,0,0,.85), inset 0 -1px 0 rgba(255,255,255,.04)',
          opacity: leaving ? 0 : 1,
          transform: leaving ? 'translateY(16px)' : 'none',
          transition: BOW_OUT,
        }}
      />

      {/* The lower lip of the slot, casting onto the sheet. */}
      <div
        className="lip-shadow absolute z-[4]"
        style={{
          left: (MACHINE_W - PAPER_W) / 2,
          width: PAPER_W,
          top: EXIT_Y + 14 * S,
          height: 12 * S,
          backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,.22), rgba(0,0,0,0))',
          visibility: leaving ? 'hidden' : 'visible',
        }}
      />
    </div>
  )
}
