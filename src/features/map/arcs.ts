/**
 * The routes drawn over the map, and how to put a place on it.
 *
 * `dotted-map`'s grid is equirectangular, so longitude is linear across the
 * width and latitude linear down it. Both come back in the dots' own space,
 * where x spans 0..1 and y is in the same units — which is why latitude is
 * divided by 360 and not 180.
 */
export const place = (lat: number, lng: number) => ({
  x: (lng + 180) / 360,
  y: (90 - lat) / 360,
})

/** The one the whole thing is about. */
export const VIETNAM = { lat: 16.0, lng: 107.8 }

/** Everywhere the visa reaches from, drawn in this order. */
export const ROUTES = [
  { lat: 28.6139, lng: 77.209 },   // New Delhi
  { lat: 25.2048, lng: 55.2708 },  // Dubai
  { lat: 1.3521, lng: 103.8198 },  // Singapore
  { lat: 35.6762, lng: 139.6503 }, // Tokyo
  { lat: 51.5074, lng: -0.1278 },  // London
]

/**
 * An arc between two points on the map, as an SVG path.
 *
 * Bowed away from the straight line by an amount that grows with the distance,
 * so short hops stay flat and long ones carry — the same curve the reference
 * draws, and the reason the routes read as flights rather than as wires.
 */
export function arc(
  from: { x: number; y: number },
  to: { x: number; y: number },
  w: number,
  h: number,
) {
  const ax = from.x * w
  const ay = from.y * w
  const bx = to.x * w
  const by = to.y * w
  const lift = Math.hypot(bx - ax, by - ay) * 0.32
  const mx = (ax + bx) / 2
  const my = (ay + by) / 2 - lift
  return { d: `M ${ax} ${ay} Q ${mx} ${my} ${bx} ${by}`, ax, ay, bx, by, h }
}
