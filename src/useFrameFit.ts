import { useCallback, useEffect, useState } from 'react'

/** The design's own frame. Everything in every scene is written in these. */
export const FRAME_W = 1282
export const FRAME_H = 915

/**
 * How much to scale the frame so it fills the window.
 *
 * Contained, but with nothing around it — which is a different thing from the
 * card this used to be. What made that read as boxed was the margin and the
 * rounded corners, not the scale: covering instead only magnified everything
 * and started cropping the edges off. It fills whichever dimension runs out
 * first and keeps every pixel of the design on screen.
 */
export function useFrameFit() {
  const [scale, setScale] = useState(1)
  const measure = useCallback(() => {
    setScale(Math.min(window.innerWidth / FRAME_W, window.innerHeight / FRAME_H))
  }, [])
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])
  return scale
}
