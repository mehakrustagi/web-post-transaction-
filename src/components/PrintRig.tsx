import { useEffect, useRef } from 'react'
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
const FW = PAPER_W * 0.6
const FH = PAPER_H * 0.4

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

/** The sheet's outline: torn up to `front`, still whole beyond it. */
export function paperClip(W: number, front: number, withFlap?: boolean) {
  let top: Pt[]
  if (withFlap) top = [...tearLine(0, W - FW), [W, T + TD + FH]]
  else if (front <= 0) top = [[0, 0], [W, 0]]
  else
    top = [
      ...tearLine(0, Math.min(front, W)),
      ...(front < W ? ([[front + 2, 0], [W, 0]] as Pt[]) : []),
    ]
  return poly([...top, ...bottomZig(W)])
}

/** The folded corner: the tip reflected across the fold, with a soft bulge. */
export function flapPath(W: number) {
  const ax = W - FW
  const ay = T + TD
  const bx = W
  const by = T + TD + FH
  const ux = bx - ax
  const uy = by - ay
  const L = Math.hypot(ux, uy)
  const nx = ux / L
  const ny = uy / L
  const d = (bx - ax) * nx
  const rx = ax + 2 * d * nx - (bx - ax)
  const ry = ay + 2 * d * ny
  /*
   * Every bow is a fraction of the fold's own length. Fixed at a few pixels —
   * which is what they were when the fold was a 40px corner — a fold this size
   * comes out as a flat triangle with a hard crease, and paper that thin has
   * neither.
   */
  const bulge = L * 0.055
  const slack = L * 0.045
  const cx = (ax + bx) / 2 - ny * bulge
  const cy = (ay + by) / 2 + nx * bulge
  return {
    d: `M${ax} ${ay} Q${cx} ${cy} ${bx} ${by} Q${(bx + rx) / 2 + slack} ${(by + ry) / 2 + slack * 0.5} ${rx} ${ry} Q${(rx + ax) / 2 - slack * 0.6} ${(ry + ay) / 2 + slack} ${ax} ${ay} Z`,
    grad: { x1: ax, y1: ay, x2: rx, y2: ry },
    origin: `${(ax + bx) / 2}px ${(ay + by) / 2}px`,
    height: by + 30,
  }
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
}) {
  const rig = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const paper = useRef<HTMLDivElement>(null)
  /** The warp that makes the sheet behave like cloth rather than card. */
  const warp = useRef<SVGFEDisplacementMapElement>(null)
  const bow = useRef<HTMLDivElement>(null)
  const stub = useRef<HTMLDivElement>(null)
  const flap = useRef<SVGSVGElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const still = useReducedMotion()
  const rest = useRef(onRest)
  rest.current = onRest
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
    /** The displacement the sheet is currently carrying, so it can be eased. */
    let slack = 0
    const setWarp = (v: number) => {
      slack = v
      warp.current?.setAttribute('scale', v.toFixed(2))
    }

    const setFeed = (y: number) => {
      const free = Math.max(0, Math.min(1, y / H))
      if (sheet.current) sheet.current.style.transform = `translateY(${y - H}px)`
      /* Broad, slow undulation — a few pixels, never noise. */
      setWarp(free * free * 7)
      if (bow.current) {
        bow.current.style.transform = `perspective(1400px) rotateX(${(-free * 4.5).toFixed(2)}deg)`
      }
    }
    const cls = (name: string, on: boolean) => box.current?.classList.toggle(name, on)

    paper.current!.style.clipPath = paperClip(W, 0)
    stub.current!.style.clipPath = poly([[0, 0], [W, 0], ...tearLine(0, W).reverse()])
    setFeed(0)

    if (stillRef.current) {
      paper.current!.style.clipPath = paperClip(W, W, true)
      cls('printing', true)
      cls('torn', true)
      cls('flapped', true)
      sheet.current!.style.transform = `translateY(${REST_Y}px)`
      rest.current?.()
      return
    }

    /*
     * The printed lines, in feed-progress coordinates. The sheet slows as each
     * one comes through the slot and picks up again between them, which is the
     * whole reason the feed is a velocity model and not a tween.
     */
    const bands = [...paper.current!.querySelectorAll<HTMLElement>('[data-line]')].map(
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
      await waitMs(330)
      if (!live) return

      // 2 · tear — a tug, then the serrated edge rips steadily left to right
      rig.current?.animate(
        [{ transform: 'none' }, { transform: 'translateY(1.5px)' }, { transform: 'none' }],
        { duration: 300, easing: 'cubic-bezier(.4,0,.2,1)' },
      )
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
      await frames((_dt, t) => {
        const e = easeIO(Math.min(1, t / TEAR_MS))
        paper.current!.style.clipPath = paperClip(W, e * W)
        /* The freed left side sags as the tear front travels right. */
        sheet.current!.style.transform = `translateY(${e * 4}px) rotate(${-e * 3}deg)`
        setWarp(tension * (1 + Math.sin(e * Math.PI) * 0.45))
        if (t >= TEAR_MS) return false
      })
      if (!live) return

      // 3 · lets go: the corner curls over, the sheet drops and swings to rest
      paper.current!.style.clipPath = paperClip(W, W, true)
      cls('flapped', true)
      /*
       * It falls over rather than appearing. The origin is the middle of the
       * crease, so this is the sheet hinging about the fold and dropping past
       * flat before it settles — which is what a piece of paper that size does
       * when it is no longer held.
       */
      flap.current?.animate(
        [
          { transform: 'scale(.82) rotate(-26deg)', opacity: 0 },
          { transform: 'scale(1.04) rotate(5deg)', opacity: 1, offset: 0.55 },
          { transform: 'scale(.99) rotate(-1.5deg)', opacity: 1, offset: 0.8 },
          { transform: 'scale(1) rotate(0)', opacity: 1 },
        ],
        { duration: 680, easing: 'cubic-bezier(.3,.9,.4,1)' },
      )
      rig.current?.animate(
        [
          { transform: 'none' },
          { transform: 'translateY(-4px)' },
          { transform: 'translateY(.8px)' },
          { transform: 'none' },
        ],
        { duration: 650, easing: 'cubic-bezier(.3,1.3,.5,1)' },
      )
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
        setWarp(settling + (2.4 - settling) * (1 - Math.pow(1 - q, 3)))
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
    }
    /*
     * Runs once. Everything it needs that can change — whether motion is
     * wanted, who to tell when the slip is at rest — it reads through a ref,
     * because re-running it means starting the printer again from the top.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const f = flapPath(PAPER_W)

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
              The cloth. `feTurbulence` at a very low frequency is a slow swell
              rather than grain, and the displacement it drives is scaled by how
              much of the sheet is hanging free — so the paper is flat where the
              rollers hold it and loosest at the edge furthest from them.
            */}
            <svg className="absolute size-0" aria-hidden>
              <filter
                id="clothWarp"
                x="-15%"
                y="-15%"
                width="130%"
                height="130%"
                colorInterpolationFilters="sRGB"
              >
                <feTurbulence type="fractalNoise" baseFrequency="0.005 0.011" numOctaves="2" seed="7" result="swell">
                  <animate
                    attributeName="baseFrequency"
                    dur="13s"
                    values="0.005 0.011;0.007 0.008;0.005 0.011"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  ref={warp}
                  in="SourceGraphic"
                  in2="swell"
                  scale="0"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </svg>
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
              <defs>
                <linearGradient id="flapFold" gradientUnits="userSpaceOnUse" {...f.grad}>
                  <stop offset="0" stopColor="#E4E4E9" />
                  <stop offset=".45" stopColor="#F7F7F9" />
                  <stop offset="1" stopColor="#FFFFFF" />
                </linearGradient>
              </defs>
              <path d={f.d} fill="url(#flapFold)" />
            </svg>


            {/* The bow: the free end leans under its own weight. */}
            <div ref={bow} style={{ transformOrigin: '50% 0%' }}>
              <div
                ref={paper}
                className="paper relative"
                style={{ width: PAPER_W, height: PAPER_H, filter: 'url(#clothWarp)' }}
              >
                <PaperFace />
              </div>
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
