import { useEffect, useRef, useState } from 'react'

/*
 * Clouds, as a shader rather than as a picture.
 *
 * The card carried a still PNG of cloud at 14% — which is fine until you look
 * at it twice, because cloud that does not move is smoke damage. This is the
 * same thing drawn: two octaves of warped fractal noise drifting across the
 * card, fading out toward the top so it stays weather at the foot of the card
 * rather than fog over the words.
 *
 * It is written here rather than installed because there is no registry
 * configured in this project for it to come from. It is a fragment shader and
 * a fullscreen triangle — no dependency, nothing to resolve.
 */

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_weight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  /* Wider than it is tall, so the cloud reads as distance rather than as
     texture — the card is 785 by 300 and billows want the long axis. */
  vec2 p = uv * vec2(3.2, 1.7);
  float t = u_time * 0.035;

  /* Warped twice: the first field bends the second, which is what turns
     noise into something with weather in it rather than a static crust. */
  float q = fbm(p + vec2(t, t * 0.28));
  float f = fbm(p + q * 1.45 + vec2(-t * 0.62, t * 0.18));

  float d = smoothstep(0.40, 0.96, f);
  /* Nothing at the top of the card, where the words are. */
  d *= smoothstep(0.02, 0.62, uv.y);
  /* And nothing hard against either side. */
  d *= smoothstep(0.0, 0.16, uv.x) * smoothstep(0.0, 0.16, 1.0 - uv.x);

  gl_FragColor = vec4(1.0, 1.0, 1.0, d * u_weight);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('cloud-shader:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

export function CloudShader({
  className,
  style,
  weight = 0.5,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  /** How much of itself it shows. The card's own artwork sat at 0.14. */
  weight?: number
  /**
   * What the card shows where there is no WebGL to draw with.
   *
   * Not optional in spirit: a canvas whose program never linked is not an
   * empty canvas, it is an opaque one — on this card it came out as a white
   * sheet with the card's own gradient and text gone behind it. So when the
   * context cannot be had or the shader will not compile, this renders
   * instead and no canvas is put on the page at all.
   */
  children?: React.ReactNode
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ok, setOk] = useState(true)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const gl = el.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false })
    if (!gl) {
      setOk(false)
      return
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    /*
     * And nothing at all if either of them failed. A canvas whose program
     * never linked still draws — it draws undefined, which on this card came
     * out as an opaque white sheet with the card's own text invisible on it.
     * Better to be the absence of a cloud than a hole in the card.
     */
    if (!vs || !fs) {
      setOk(false)
      return
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('cloud-shader:', gl.getProgramInfoLog(prog))
      setOk(false)
      return
    }
    gl.useProgram(prog)

    /* One triangle big enough to cover the clip space, which is cheaper than
       two and has no seam down the diagonal. */
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const a = gl.getAttribLocation(prog, 'a')
    gl.enableVertexAttribArray(a)
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, 'u_res')
    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uWeight = gl.getUniformLocation(prog, 'u_weight')
    gl.uniform1f(uWeight, weight)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    /* Cleared to nothing every frame. Without this the colour buffer keeps
       whatever it was handed, which on an alpha canvas is an opaque white
       sheet — the card came out blank with its own text invisible on it. */
    gl.clearColor(0, 0, 0, 0)

    let frame = 0
    const size = () => {
      /* Half resolution. It is a blur of noise at 50% opacity behind text —
         there is nothing in it that a full-density buffer would show. */
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * 0.5
      const w = Math.max(1, Math.round(el.clientWidth * dpr))
      const h = Math.max(1, Math.round(el.clientHeight * dpr))
      if (el.width !== w || el.height !== h) {
        el.width = w
        el.height = h
      }
      gl.viewport(0, 0, el.width, el.height)
      gl.uniform2f(uRes, el.width, el.height)
    }

    const draw = (now: number) => {
      size()
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform1f(uTime, now * 0.001)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [weight])

  if (!ok) return <>{children}</>
  return <canvas ref={canvas} aria-hidden className={className} style={style} />
}
