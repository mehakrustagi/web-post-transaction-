import { useEffect, useRef } from 'react'
import type { MotionValue } from 'framer-motion'
import { MAP_ASPECT, MAP_DOTS } from './dots'

const COUNT = MAP_DOTS.length / 2

/** Blend two hex colours. Used once a frame, not once a dot. */
function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (sh: number) => {
    const x = (pa >> sh) & 255
    const y = (pb >> sh) & 255
    return Math.round(x + (y - x) * t)
  }
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`
}
/** Golden angle, for spacing the sphere's points evenly. */
const PHI = Math.PI * (3 - Math.sqrt(5))

/**
 * The world as dots, and the same dots gathered into an orb.
 *
 * Canvas rather than SVG: there are eight and a half thousand of them, and
 * every one has to be able to leave the map and take a place on the sphere.
 * As elements that is a repaint the browser will not do sixty times a second.
 *
 * Each dot keeps two positions for its whole life — where it sits on the map
 * and where it sits on the sphere — and `morph` slides it between them, so the
 * orb is made of the map rather than replacing it.
 */
export function WorldDots({
  width,
  height,
  reveal,
  morph,
  spin,
  source = 'map',
  sheet,
  scatter = 0,
  colour = '#9aa0a6',
  orbFrom = '#d1d1d1',
  orbTo = '#666666',
}: {
  width: number
  height: number
  /** 0 to 1 across the map's width: dots left of this have been printed. */
  reveal: MotionValue<number>
  /** 0 is wherever the dots start, 1 is the orb. */
  morph: MotionValue<number>
  /**
   * What the dots are before they are a sphere. The world, or the sheet the
   * receipt was printed on — which disintegrates into them.
   */
  source?: 'map' | 'sheet'
  /** The sheet's box on the canvas, when that is where they start. */
  sheet?: { x: number; y: number; w: number; h: number }
  /**
   * How wide the dots are thrown on their way between the two layouts, as a
   * fraction of the canvas. Zero makes every dot take the shortest line, which
   * is what made the change read as a dissolve between two stills.
   */
  scatter?: number
  /** Turns of the sphere, in radians. */
  spin: MotionValue<number>
  colour?: string
  /**
   * The orb is not a flat tone like the map — it is lit, pale on one side and
   * falling away to the other, so it takes a gradient rather than a colour.
   */
  orbFrom?: string
  orbTo?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)

  /*
   * Sphere seats and weights, worked out once and then owned by the dot that
   * got them. Four floats each: where it sits, and how dark it is.
   *
   * Not a clean sphere. The design's orb (438:17464) is a lumpy thing with
   * ridges running over it and a heavy, dark underside — evenly spaced points
   * on a true sphere read as a wireframe of a ball, which is not what it is.
   * The radius is pushed around by three bands of noise at different scales:
   * the coarse one makes the silhouette bulge and dent, the finer ones give
   * the surface its creases.
   */
  const seats = useRef<Float32Array>(null as unknown as Float32Array)
  if (!seats.current) {
    const s = new Float32Array(COUNT * 6)
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const t = PHI * i
      const ux = Math.cos(t) * r
      const uy = y
      const uz = Math.sin(t) * r

      /*
       * Three scales of crumple, not one of bulge. The coarse band gives the
       * rim its lobes, the middle one the folds that run across the face, and
       * the fine one the creases — which is what the card's own mesh is: a
       * sheet crushed into a ball, with the spiral of points running over the
       * folds and picking them out as contours.
       */
      const n1 =
        Math.sin(5.3 * ux + 2.1) * Math.cos(4.9 * uy - 1.2) * Math.sin(5.7 * uz + 0.6)
      const n2 = Math.sin(9.7 * uy + 1.7) * Math.cos(8.9 * uz - 2.2)
      const n3 = Math.sin(16.3 * ux - 0.9) * Math.cos(14.1 * uy + 1.4)
      const k = 0.845 + 0.095 * n1 + 0.062 * n2 + 0.028 * n3

      s[i * 6] = ux * k
      s[i * 6 + 1] = uy * k
      s[i * 6 + 2] = uz * k
      /*
       * Heavier towards the bottom, where the design's orb gathers its weight.
       * `uy` of +1 is the *bottom* of the screen, not the top — the projection
       * below adds it to the centre, so down is positive.
       */
      s[i * 6 + 3] = 0.6 + 0.5 * Math.pow((uy + 1) / 2, 1.4)
      /*
       * Which way this one flies on the way across, and how far. Nothing goes
       * straight from where it was to where it is going — paper coming apart
       * throws its pieces outward first, and they only draw together after.
       */
      const a = (i * 2.399963) % (Math.PI * 2)
      const far = 0.35 + 0.65 * ((Math.sin(i * 91.7) + 1) / 2)
      s[i * 6 + 4] = Math.cos(a) * far
      s[i * 6 + 5] = Math.sin(a) * far
    }
    seats.current = s
  }

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    el.width = width * dpr
    el.height = height * dpr
    const ctx = el.getContext('2d')!
    ctx.scale(dpr, dpr)

    const mapH = width * MAP_ASPECT
    /* The map sits in the middle of the box; the orb turns about that centre. */
    const cx = width / 2
    const cy = height / 2
    const top = cy - mapH / 2
    const radius = Math.min(width, height) * 0.42
    const spread = Math.min(width, height) * scatter
    /**
     * How far a dot breathes. Scaled by the morph: the map wants to be a clean
     * printed thing and a constant jitter only makes it look out of focus,
     * while the orb is dust and should never hold still.
     */
    const drift = Math.min(width, height) * 0.003
    /*
     * The sheet's dots are scattered over its rectangle rather than ruled into
     * a grid — a grid of this many points reads as a screen door, and what is
     * wanted is paper coming apart. Deterministic, so a redraw does not
     * reshuffle them mid-flight.
     */
    const box = sheet ?? { x: cx - width / 4, y: cy - height / 4, w: width / 2, h: height / 2 }
    const rnd = (i: number, k: number) => {
      const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453
      return v - Math.floor(v)
    }

    let frame = 0
    const draw = (now: number) => {
      const rev = reveal.get()
      const m = morph.get()
      const a = spin.get()
      /*
       * Nothing ever sits perfectly still. Without this the field is a frozen
       * texture whenever it is not between layouts, which is most of the time
       * and reads as a picture of dots rather than dots.
       */
      const t = now * 0.0011
      const sin = Math.sin(a)
      const cos = Math.cos(a)
      const seat = seats.current

      ctx.clearRect(0, 0, width, height)
      /*
       * Drawn flat, then tinted. Giving each dot its own colour would be 8,476
       * fill changes a frame; instead the whole field is laid down in one tone
       * and a gradient is composited through it with `source-in`, which keeps
       * the gradient only where a dot is and respects the alpha each one was
       * drawn with. Two operations rather than thousands.
       */
      ctx.fillStyle = '#000'
      const r = 1.4 + m * 0.5

      for (let i = 0; i < COUNT; i++) {
        const mx = MAP_DOTS[i * 2]
        if (mx > rev) continue

        const my = MAP_DOTS[i * 2 + 1]
        let x: number
        let y: number
        if (source === 'sheet') {
          x = box.x + rnd(i, 1) * box.w
          y = box.y + rnd(i, 2) * box.h
        } else {
          x = mx * width
          y = top + my * width
        }
        let dim = 1

        if (m > 0) {
          const sx = seat[i * 6]
          const sy = seat[i * 6 + 1]
          const sz = seat[i * 6 + 2]
          /* Turn about the vertical, then drop the depth: a flat shadow of a
             turning sphere, which is all the design's orb is. */
          const rx = sx * cos - sz * sin
          const rz = sx * sin + sz * cos
          x += (cx + rx * radius - x) * m
          y += (cy + sy * radius - y) * m
          /* The far side is further away, so it is fainter; and the orb is
             weighted towards its underside. */
          /*
           * Only a little depth fade. The far side of the surface is what
           * draws the contours across the middle of it, so culling or dimming
           * it hard leaves a shell with nothing inside.
           */
          const front = (rz + 1) / 2
          dim = 1 - m + m * Math.min(1, (0.72 + 0.28 * front) * seat[i * 6 + 3])

          /* Thrown wide at the halfway point, home again by the end. */
          const fling = Math.sin(m * Math.PI) * spread
          x += seat[i * 6 + 4] * fling
          y += seat[i * 6 + 5] * fling
        }

        const px = seat[i * 6 + 4]
        const py = seat[i * 6 + 5]
        const breath = drift * (0.3 + 0.7 * m)
        x += Math.sin(t + px * 9) * breath
        y += Math.cos(t * 0.9 + py * 9) * breath

        ctx.globalAlpha = dim
        ctx.fillRect(x, y, r, r)
      }
      ctx.globalAlpha = 1

      const tint = ctx.createLinearGradient(0, 0, width, 0)
      tint.addColorStop(0, mix(colour, orbFrom, m))
      tint.addColorStop(1, mix(colour, orbTo, m))
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = tint
      ctx.fillRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'

      frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [width, height, reveal, morph, spin, colour, orbFrom, orbTo, source, sheet, scatter])

  return <canvas ref={canvas} style={{ width, height, display: 'block' }} />
}
