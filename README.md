# Visa guaranteed → Cybertruck — intro sequence

Five frames from [Animation-Native-Ai](https://www.figma.com/design/gES8AlfSqYucWk2HWh8rAg/Animation-Native-Ai?node-id=424-10017),
run as one continuous animation:

| # | Figma | What happens |
|---|-------|--------------|
| 1 | `424:10017` | The visa headline settles, the printer lands under it, the receipt feeds out |
| — | — | The blade crosses the slot, the slip sags free and falls away |
| 2 | `424:11042` | Dark card: Tesla mark and `As a thank you for choosing atlys, we gift you a`, resolving in solid |
| 3 | `424:9784` | Mark and headline settle down as the truck arrives underneath them |
| 4 | `424:9851` | The line swaps up to `Tesla Cybertruck airport pick-up` |
| 5 | `424:9718` | Headline and mark rise, the panel draws itself in |
| 6 | `424:10091` | The whole frame condenses into the black card on the page |
| 7 | `424:11259` | The page carries on below the fold and takes itself down it |

```
npm install
npm run dev
```

Click anywhere to replay.

## Layout

The design is a run of fixed 1282 × 915 frames, so `App.tsx` lays everything
out in the frames' own coordinates and scales the result to fit the window
(`useFitScale`). Nothing reflows. `App.tsx` also owns the clock: one list of
beats, one `setTimeout` each.

## The opening

The card holds blank for a beat, then the flag, the country line and the
headline arrive in the middle of it — where there is nothing else to look at —
and only once they have been read do they glide up to the positions the frame
draws them in. That move is what makes room for the printer, which rises in
underneath while they are still settling and starts feeding before it has
finished arriving. The three travel as one block (`HERO_DROP`), so the glide is
a single move rather than three kept in step.

## The print

`PrintRig.tsx` is the printer from `atlys-visa-submitted-animated_2.html`,
ported as-is. Its mechanic:

- The feed is a **velocity model**, not a tween. The sheet runs at 175px/s and
  drops to 80 whenever a printed line is crossing the slot, then crawls over
  the last 28px. `PaperFace` marks those lines with `data-line`; the rig reads
  their offsets to build the bands. That stutter is the printer working
  through a line of text, so the marks have to be on things that are text.
- The **tear** is geometry redrawn every frame. `tearLine` builds a serrated
  edge from x0 to x1 and `paperClip` makes the sheet torn up to the front and
  still whole beyond it, so the rip travels left to right over 1150ms while
  the freed side sags. The paper is a clip-path on a plain div rather than an
  exported SVG for exactly this reason.
- Then the corner **curls**, the rig recoils, the stub nudges, and the sheet
  drops through a four-keyframe swing to rest, where it floats.
- The LED runs off → amber (blinking) → green, the rig rumbles on a 0.1s
  two-step while feeding, and a warm print-head line flickers deep in the slot.

Two things differ from the source. The curl rides *inside* the sheet rather
than beside it — in the source it stays at the tear line while the receipt
drops, which leaves it floating clear of the corner it belongs to, and here
the slip goes on to leave the frame entirely. And the receipt itself is this
design's, so W and H are ours.

The rig is not on the app's clock. It runs the machine's own script and calls
`onRest` when the slip stops swinging, because the feed takes as long as the
slip is long. Everything after that is scheduled from that moment.

Once the frame has emptied — printer, headline and flag go first, so nothing
is sitting on top of the slip while it moves — the slip does not fly off: it
recedes, into the exact point the Cybertruck is about to come out of
(`EMERGES`, the centre of the vehicle's box on the frame it arrives on). The
paper goes back into the screen through the same doorway the truck comes out
of. It fades as it goes, and the light card dissolves off it at the same time.
The next headline resolves in over the top of that rather than waiting for a
clear frame: the slip is thinning out as it goes, so the line is legible
through the paper before the paper has gone.
The dark card is stacked *underneath* rather than cross-faded in: averaging a
near-white card with a near-black one spends half a second on grey, which
reads as a fault.

## The headline

`TextStage.tsx` is one clipped 582px box that every frame puts its headline in.
Lines do not cross-fade; the outgoing one is pushed up out of the box while the
next comes up underneath. That is the design's own description of the
transition — the last frames are drawn with the previous line still inside the
box, above the readable one. The box itself moves and shrinks between frames,
and the type with it, which is why the size is animated rather than set by a
class.

`ShimmerText.tsx` is kokonutui's `shimmer-text`, taken from the registry
(`npx shadcn@latest add @kokonutui/shimmer-text`). It runs at 5s rather than the
registry's 2.5s — at the original speed it reads as a progress indicator, which
is not what this line is doing — and its stops are pushed brighter than the
design's still, because stops that look right standing still leave the line
sitting in the gradient's dark ends for most of a sweep.

## The condense

The last frame is the one before it, condensed. `GiftScene` is therefore *one*
component with two layouts rather than a full-bleed scene and a card that hand
over: every part of it has a position in the frame and a position in the card,
and moves between them. The first version cross-faded to a separate card
component and put two copies of the same sentence on screen at once, half-faded
and 80px apart — which is the one thing a condense must not look like. Only the
two things the card genuinely adds, the CTA and the customers link, are allowed
to animate in.

## Gotchas worth keeping

- The backdrop photos blend with `mix-blend-hard-light`. Animating opacity on
  their wrapper puts them in their own stacking context, so the wrapper has to
  carry a copy of the card's gradient or the blend has nothing to work against
  and the whole card goes grey.
- Framer Motion writes the whole `transform` property, so a Tailwind
  `-translate-x-1/2` on an element that also animates `x`/`y` is silently
  dropped. Centre those with `x: '-50%'` instead.
- An exiting `AnimatePresence` child keeps the props it last rendered with,
  including its transition. A headline that entered on a frame with a hold on
  it inherited that hold on the way *out*, and sat in place while its
  replacement arrived on top of it. Put the exit's transition inside the `exit`
  object.
- The backdrop photograph is the whole scene, truck included. The frames also
  carry a separate cut-out of the truck on top; drawing both puts two
  Cybertrucks on the card, slightly out of register.

Reduced-motion jumps straight to the last frame.

## The photograph

Two files, not one: `ground.jpg` is the empty set and `truck.webp` is the
vehicle, cut out with its own alpha and cropped to its edges so the box laid
out in `SHOT` *is* the truck. That split is what lets the truck change size
between frames while the horizon stays put — the picture Figma exported had
the truck baked into the plate, so the two had to move together, and the
frames' separate cut-out of the same vehicle sat on top as a second copy.

`GROUND_LINE` is where the floor begins in the plate, as a fraction of its
height. Every `top` is derived from it, so the wheels land on the floor at
whatever size the shot is. The cut-out brings no shadow with it, so the
contact goes back in by hand as a soft ellipse under the wheels — without it
the truck hovers.

## Below the fold

The last frame is 2741 tall against a 915 viewport, so `App` holds the page,
the card and the ribbon in one container and moves it to four stops: the card,
the two upsells, the countries, the links. The wheel takes it over from there
and keeps it — a page that yanks itself back to the next stop under the hand
is worse than one that does not move. Which blocks have arrived is read off
the scroll position rather than the clock, so scrolling ahead still brings
them in. `PageBelow` lays all of that out in
the page's own coordinates and each block arrives as its stop does.

The two upsells are one component. They share a shape — title block top left,
dates top right, a rule, then a figure with a stepper on the left and a table
on the right — and differ only in fill, artwork and words, which is what
`OFFERS` holds.

`RAIL_TICKS` is generated rather than listed, but as four runs rather than one
rhythm: the design restarts the tick series under each step number instead of
carrying a single cadence down the page.

## Fonts

The headlines are Denton Medium in the design. Denton is not a webfont we have,
so it falls back to Georgia — same as `snapmap_proj` does. Drop the licensed
files in and add a `@font-face` to `src/index.css` to close the gap.

## Screenshots

With the dev server up, `node shot.mjs 2500 4200 7200` writes a frame per
millisecond mark to `/tmp`.
