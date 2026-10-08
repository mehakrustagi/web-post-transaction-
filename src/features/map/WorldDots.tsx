import { useEffect, useRef } from 'react'
import type { MotionValue } from 'framer-motion'
import { MAP_ASPECT, MAP_DOTS } from './dots'

const COUNT = MAP_DOTS.length / 2
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
  colour = '#9aa0a6',
}: {
  width: number
  height: number
  /** 0 to 1 across the map's width: dots left of this have been printed. */
  reveal: MotionValue<number>
  /** 0 is the map, 1 is the orb. */
  morph: MotionValue<number>
  /** Turns of the sphere, in radians. */
  spin: MotionValue<number>
  colour?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)

  /* Sphere seats, worked out once and then owned by the dot that got them. */
  const seats = useRef<Float32Array>(null as unknown as Float32Array)
  if (!seats.current) {
    const s = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const t = PHI * i
      /*
       * A little noise on the radius. A clean sphere of evenly spaced points
       * reads as a wireframe; the design's orb has a surface to it.
       */
      const k = 0.93 + 0.07 * Math.sin(i * 12.9898) * Math.cos(i * 78.233)
      s[i * 3] = Math.cos(t) * r * k
      s[i * 3 + 1] = y * k
      s[i * 3 + 2] = Math.sin(t) * r * k
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

    let frame = 0
    const draw = () => {
      const rev = reveal.get()
      const m = morph.get()
      const a = spin.get()
      const sin = Math.sin(a)
      const cos = Math.cos(a)
      const seat = seats.current

      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < COUNT; i++) {
        const mx = MAP_DOTS[i * 2]
        if (mx > rev) continue

        const my = MAP_DOTS[i * 2 + 1]
        let x = mx * width
        let y = top + my * width
        let dim = 1

        if (m > 0) {
          const sx = seat[i * 3]
          const sy = seat[i * 3 + 1]
          const sz = seat[i * 3 + 2]
          /* Turn about the vertical, then drop the depth: a flat shadow of a
             turning sphere, which is all the design's orb is. */
          const rx = sx * cos - sz * sin
          const rz = sx * sin + sz * cos
          x += (cx + rx * radius - x) * m
          y += (cy + sy * radius - y) * m
          /* The far side of the sphere is further away, so it is fainter. */
          dim = 1 - m * 0.55 * (1 - (rz + 1) / 2)
        }

        ctx.globalAlpha = dim
        ctx.fillRect(x, y, 1.4, 1.4)
      }
      ctx.globalAlpha = 1
      frame = requestAnimationFrame(draw)
    }

    ctx.fillStyle = colour
    draw()
    return () => cancelAnimationFrame(frame)
  }, [width, height, reveal, morph, spin, colour])

  return <canvas ref={canvas} style={{ width, height, display: 'block' }} />
}
