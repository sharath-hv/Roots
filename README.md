# Roots

A scroll-driven shop for an organic farm. You walk in from the gate, stop at a hero, watch the hut doors open, shop the stall from hotspots, and then the page turns into an ordinary product grid.

Vite + React + TypeScript, GSAP ScrollTrigger for pinning and progress. No UI kit.

```bash
npm install
npm run media   # encode videos, stills and frame sequences (needed once, and after swapping media)
npm run dev     # http://localhost:5173
npm run build   # type-check and build to dist/
```

### Publishing

Every push to `main` runs `.github/workflows/deploy-pages.yml`, which builds with Vite and publishes `dist/` to GitHub Pages: https://sharath-hv.github.io/Roots/. In the repo's **Settings → Pages**, **Source** must be **GitHub Actions**.

### Opening by double-click

Double-clicking `index.html` in this folder opens the site without a server. That file is the dev source, so when it is opened from disk it redirects to `dist/index.html`, the build. **Run `npm run build` first, and again after any change**, or you will see an old version (or nothing, if `dist/` does not exist yet).

The build is made to work from disk: the JS and CSS are inside `dist/index.html` (browsers block loading them as separate files from `file://`), frame manifests are bundled instead of fetched, and videos are read straight from the file instead of through `fetch()`. Sound still waits for the first click or key press.


## How the page is put together

```
media.config.json        source clips, trim, watermark crop, output widths
scripts/encode-media.mjs ffmpeg pipeline (uses ffmpeg-static, no system ffmpeg needed)
public/media/            encoded output (walk-in-1280.mp4, hut-closed-1280.jpg, frames/…)
src/config.ts            brand, currency, media names, scroll timeline
src/data/products.ts     products and hotspot positions
src/scrub/               Scrubber interface + VideoScrubber + FrameScrubber
src/components/Journey   pinned stage and scroll timeline
src/components/Stall     interior still, hotspots, hover card, bottom sheet
src/cart/                cart context/reducer (localStorage) and drawer
src/audio/               Web Audio countryside ambience and the header toggle hook
```

### Scroll timeline

One stage is pinned for the whole story. Every length is in `vh` of scroll and lives in `TIMELINE` in `src/config.ts`:

| Segment | Default | What happens |
| --- | --- | --- |
| Walk in | 5 s × 80 vh/s = 400 vh | Part 1 scrubs, gate to meadow |
| Hold | 35 vh | Last frame sits still |
| Fold | 360 vh | Three lines, strictly one at a time: the headline, "Mangoes, oranges…", then "Picked on Tuesday…". Each rises in, holds, then drifts up out of frame and fades before the next begins (`FOLD` in `Journey.tsx`) |
| Hand-off | 90 vh | The meadow keeps pushing forward and fades, a warm glow peaks, and the hut settles in from a slight zoom |
| Door | 6 s × 80 vh/s = 480 vh | Part 2 scrubs, hut approach, doors open, push in |
| Hold | 35 vh | Last frame, the stall fades in on top (same pixels) |
| Stall | 110 vh | Hotspots are live while pinned, then the page scrolls on to the shop |

Both clips use the same `vhPerSecond`, so scroll speed feels the same in each part. To avoid a hard stop, the walk slows down over its last quarter (`easeOutTail` in `Journey.tsx`), and the door clip speeds up over its first fifth (`easeInHead`). Part 1 ends in the meadow and part 2 starts at the closed hut, so the hand-off between them is a forward push rather than a cut. Overlays use `scrub: 0.5`, so mouse-wheel steps glide instead of jumping.

### Scrubber

`src/scrub/types.ts` defines one interface (`load`, `setTarget`, `setFocusX`, `destroy`). Two implementations:

- `VideoScrubber`: fetches the whole all-keyframe MP4 into a blob (real progress for the loader, no network waits while seeking), then sets `currentTime`. It never calls `play()`. Each frame it eases toward the target (`TIMELINE.lerp`, 0.12) and only seeks when the frame number changes, so moves under half a frame never trigger a seek.
- `FrameScrubber`: draws a WebP frame sequence onto a canvas with the same cover maths.

`MEDIA.scrubMode` in `src/config.ts` chooses between them: `'auto'` uses frames on Safari and video everywhere else. To test either one, add `?scrub=frames` or `?scrub=video` to the URL.

Part 1 loads behind the loader. Part 2 starts downloading as soon as part 1 is ready, so it is normally there before anyone reaches the door.

## Swapping the videos

1. Put your new source files anywhere in the project and point `media.config.json` at them (`clips.walk-in.src`, `clips.hut-open.src`).
2. Set `trim` if you only want part of a clip (`{ "start": 0, "duration": 3 }`), or `null` for the whole thing.
3. Run `npm run media`.
4. If the clip lengths changed, update `walkInSeconds` and `hutOpenSeconds` in `TIMELINE`.

The script writes, for each width in `widths` (1280 and 1920):

- `<clip>-<width>.mp4`, re-encoded so every frame is a keyframe:
  `ffmpeg -i in.mp4 -an -vf scale=1920:-2 -c:v libx264 -preset slow -g 1 -crf 23 -pix_fmt yuv420p -movflags +faststart out.mp4`
  It never upscales past the source width.
- Stills taken from the encoded video itself: `walk-in-start`, `hut-closed` (last frame of part 1, also the fold background), `hut-approach` (first frame of part 2, its poster) and `interior` (last frame of part 2, the stall background). Taking them from the encode is what makes the hand-offs seamless.
- `frames/<clip>/0001.webp…` plus a `manifest.json` for the canvas fallback. Skip these with `npm run media -- --no-frames` (then set `scrubMode: 'video'`).

### A sharper last frame

The fold sits on part 1's last frame for a while, so it can use a sharper image than the video. Set `lastStillSource` on the clip in `media.config.json` and run `npm run media`. It is currently `null`: the 2560px source is already sharp, and the old `end frame hd.webp` is a different view with its own watermark. `scripts/align-still.mjs` finds the scale and offset that line the image up with the real last frame, matches its tone (per-channel brightness and contrast), and crops it exactly like the video. The script prints a match score and warns if it falls below 95%, which usually means the image is not that frame. On the page the sharp still cross-fades in over the video once the walk has stopped, with no shift. For the best result, drop in the original full-resolution export rather than a screenshot.

Phones and windows under 900px wide get the 1280 files; larger, high-density screens get 1920.

### Painting things out of the last frame

The fold copy sits on part 1's last frame, so anything busy behind it hurts legibility. `lastStillPatches` on a clip in `media.config.json` lists rectangles (fractions of the frame) that `npm run media` fills in from their surroundings with ffmpeg's `delogo`. One is set today: the red butterfly in the sky. If you swap the video, check the last frame and update or remove the rectangles.

### Watermark

Both sources (`Part 1/updated_video.mp4`, `Part 2/Part_2.mp4`) carry a "KlingAI 4.0" mark in the bottom-right corner. `media.config.json` crops it away at encode time, with a margin: 8% off the bottom of part 1 (`clips.walk-in.crop`) and 10% off the right of part 2 (`clips.hut-open.crop`). If you swap in new videos, check where the mark sits and that `TIMELINE.walkInSeconds` / `hutOpenSeconds` in `src/config.ts` match the new clip lengths; if the last frame of part 2 is framed differently, the hotspot positions in `src/data/products.ts` need moving too. **TODO:** when you have clean sources, set `crop` to `null` and run `npm run media` again. The UI keeps out of the bottom-right corner (`MEDIA.watermarkSafeZone`): hover cards are pushed up out of it and nothing else is placed there except the small sound button.

### Portrait screens

Videos use `object-fit: cover`. `MEDIA.portraitFocusX` sets the horizontal focus point on portrait screens so the path and the hut stay in frame. On a phone the stall is wider than the screen, so it becomes a strip you can swipe sideways. It starts at the same crop the video ended on.

## Editing products

Everything is in `src/data/products.ts`. Fields: `id, name, description, farmName, harvestDate (ISO), price, unit ('kg' | 'dozen' | 'bunch'), organicCertified, certificationLabel, stock, hotspot, image`.

- `stock: 0` shows "Sold out this week" with a disabled button, in the stall and in the grid.
- `hotspot: { x, y }` is a fraction (0 to 1) of the interior still (`public/media/interior-1280.jpg`). To place one, open that image, find the crate's pixel position and divide by the image's width and height. The stall sizes the image and the hotspots together using cover maths (`src/lib/cover.ts`), so a hotspot stays on its crate at any window shape.
- `image` points to a photo in `public/media/products/` named after the product id (`placeholder.svg` is kept there as a fallback).

## Brand name and currency

In `src/config.ts`:

- `BRAND.name` is used in the header, loader and footer. Also change `<title>` in `index.html`.
- `CURRENCY` holds the code, the locale and the `format()` function. Prices in `products.ts` are whole units of that currency. For example, to switch to euros: `code: 'EUR', locale: 'en-IE'`.

## Behaviour notes

- **Header logo over dark footage**: `scripts/header-tone.mjs` (run by `npm run media`) measures how bright the footage is behind the logo for every frame and writes `public/media/header-tone.json`. As you scroll, the logo text and stem turn cream over dark frames (the hut and stall) and back to ink over light ones; the leaf stays orange.
- **Hero and scroll cue**: the first frame shows the brand tagline (`BRAND.tagline` in `src/config.ts`) as a headline, with "Scroll to experience" and an animated arrow directly beneath it. Both fade out together as the walk starts. Later the cue comes back at the bottom of the screen as "Scroll to buy" when part 1 ends at the fold. The labels are in `src/components/Journey.tsx`.
- **Shop all** is the primary button in the header and jumps straight to the product grid. Keyboard users also get a "Skip to the shop" link on their first Tab.
- **Hand-off to the hut**: scrolling down past the end of "Picked on Tuesday…" glides the page on its own (about 3 s) through the cut to the hut, stopping with the doors just ajar (`TIMELINE.doorsAjarSeconds`, 1.9 s into the hut clip). Further downward input is held while it runs; scrolling up cancels it. A "Scroll to step inside" cue then invites the next scroll, and that scroll glides straight through the doors to the final interior frame with the stall's hotspots live (`STALL_VH` in `Journey.tsx`). Each glide holds input for half a second after landing so trailing trackpad inertia can't set off the next one.
- **Scroll indicator**: a slim track on the right edge fills as you move down the page (`ScrollProgress.tsx`). It is vertically centred, clear of the watermark corner.
- **Reduced motion** (`prefers-reduced-motion: reduce`) shows the fold and the stall as plain sections: no scrubbing, and no video is downloaded.
- **Hotspots** are `<button>`s with labels. Hover or keyboard focus opens the card, Tab moves into it, and Esc closes it and puts focus back on the hotspot. On touch screens a tap opens a bottom sheet instead.
- **Cart** uses a context and reducer and is saved to `localStorage` (every read and write is wrapped in try/catch). Adding an item opens the drawer and moves focus into it. Focus stays trapped inside while it is open, and returns to where you were when it closes. **Checkout is a stub.**
- **Sound** is a countryside ambience (birds, crickets, a passing bee, butterfly wingbeats) built with Web Audio, with no audio files. It is on by default and toggled with the speaker button in the bottom-right corner (`SoundToggle.tsx`), the one exception to keeping that corner clear. Browsers block audio until the visitor clicks, taps or presses a key (scrolling doesn't count), so it tries to start on load and otherwise starts on the first such gesture. Until then the button widens into a pulsing "Click for sound" pill, and pressing it starts the sound rather than muting it. Muting lasts for the current visit only; every page load starts with sound on. It pauses while the tab is hidden.
- If part 1 fails to load, the page falls back to the plain layout.

## Checked

- Chromium at 1440×900, 390×844 and 360×740: scrubbing, fold, dissolve, door, stall hotspots, hover card, bottom sheet, drawer, scroll cues, and the canvas fallback (`?scrub=frames`).
- Lighthouse on the production build (desktop): performance 98, accessibility 100, best practices 100.
- Not tested on a real Safari or iOS device. `'auto'` sends Safari to the frame sequence for that reason.
