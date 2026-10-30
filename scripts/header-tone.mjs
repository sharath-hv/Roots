// Measures how bright the footage is behind the header logo (top-left corner), frame by frame,
// so the page can switch the logo to its light version over dark frames. Writes
// public/media/header-tone.json. Runs at the end of `npm run media`, or on its own:
//
//   node scripts/header-tone.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegStatic from 'ffmpeg-static';

const ffmpeg = process.env.FFMPEG || ffmpegStatic || 'ffmpeg';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'media.config.json'), 'utf8'));
const out = path.join(root, 'public/media');

// Where the wordmark sits, as a share of the frame: the left 22%, top 11%.
const REGION = 'crop=iw*0.22:ih*0.11:0:0';

/** Mean luma (0-255) of the logo region for every frame of a video, or the one frame of an image. */
function luma(file) {
  const res = spawnSync(
    ffmpeg,
    ['-hide_banner', '-i', file, '-vf', `${REGION},signalstats,metadata=print:key=lavfi.signalstats.YAVG`, '-f', 'null', '-'],
    { encoding: 'utf8', maxBuffer: 1 << 26 },
  );
  if (res.status !== 0) throw new Error(`ffmpeg failed on ${file}: ${res.stderr}`);
  return [...res.stderr.matchAll(/YAVG=([\d.]+)/g)].map((m) => Math.round(+m[1]));
}

export function writeHeaderTone() {
  const width = Math.min(...cfg.widths);
  const tone = { clips: {}, stills: {} };
  for (const [name, clip] of Object.entries(cfg.clips)) {
    tone.clips[name] = luma(path.join(out, `${name}-${width}.mp4`));
    tone.stills[clip.lastStill] = luma(path.join(out, `${clip.lastStill}-${width}.jpg`))[0];
  }
  const file = path.join(out, 'header-tone.json');
  fs.writeFileSync(file, JSON.stringify(tone));
  console.log(`→ ${path.relative(root, file)}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeHeaderTone();
