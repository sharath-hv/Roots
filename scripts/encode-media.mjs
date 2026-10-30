// Re-encodes the source clips for smooth scroll scrubbing:
// every frame a keyframe (-g 1), no audio, faststart, one file per width.
// Also extracts the first/last frames as stills (so the fold, posters and
// stall background match the video pixel for pixel) and, unless --no-frames
// is passed, a WebP frame sequence for the canvas fallback scrubber.
//
//   npm run media             videos + stills + frames
//   npm run media -- --no-frames
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegStatic from 'ffmpeg-static';
import { alignStill, sourceSize } from './align-still.mjs';

const ffmpeg = process.env.FFMPEG || ffmpegStatic || 'ffmpeg';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'media.config.json'), 'utf8'));
const out = path.join(root, 'public/media');
const withFrames = !process.argv.includes('--no-frames');

function run(args) {
  const res = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (res.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}

function filters(clip, width) {
  const f = [];
  const c = clip.crop;
  if (c) {
    const w = 1 - (c.left ?? 0) - (c.right ?? 0);
    const h = 1 - (c.top ?? 0) - (c.bottom ?? 0);
    f.push(`crop=trunc(iw*${w}/2)*2:trunc(ih*${h}/2)*2:iw*${c.left ?? 0}:ih*${c.top ?? 0}`);
  }
  // Never upscale past the source; keep dimensions even for yuv420p.
  f.push(`scale='trunc(min(${width},iw)/2)*2':-2`);
  return f.join(',');
}

const manifest = {};
fs.mkdirSync(out, { recursive: true });

for (const [name, clip] of Object.entries(cfg.clips)) {
  const src = path.join(root, clip.src);
  if (!fs.existsSync(src)) throw new Error(`Missing source for ${name}: ${src}`);
  const trim = clip.trim ? ['-ss', String(clip.trim.start ?? 0), '-t', String(clip.trim.duration)] : [];
  manifest[name] = {};

  for (const width of cfg.widths) {
    const file = path.join(out, `${name}-${width}.mp4`);
    console.log(`→ ${path.relative(root, file)}`);
    run([
      '-i', src, ...trim, '-an', '-vf', filters(clip, width),
      '-c:v', 'libx264', '-preset', 'slow', '-g', '1', '-crf', '23',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file,
    ]);
    run(['-i', file, '-frames:v', '1', '-q:v', '2', path.join(out, `${clip.firstStill}-${width}.jpg`)]);
    run(['-sseof', '-0.3', '-i', file, '-update', '1', '-q:v', '2', path.join(out, `${clip.lastStill}-${width}.jpg`)]);
    manifest[name][width] = { bytes: fs.statSync(file).size };
  }

  // A sharper last frame, if supplied, replaces the one pulled from the video.
  if (clip.lastStillSource) {
    const stillSrc = path.join(root, clip.lastStillSource);
    const largest = path.join(out, `${name}-${Math.max(...cfg.widths)}.mp4`);
    const vsize = sourceSize(ffmpeg, largest);
    const fit = alignStill({
      ffmpeg,
      video: largest,
      still: stillSrc,
      // One still per width, at exactly the video's aspect.
      outputs: cfg.widths.map((width) => ({
        file: path.join(out, `${clip.lastStill}-${width}.jpg`),
        width,
        height: Math.round((width * vsize.h) / vsize.w),
      })),
    });
    console.log(`→ ${clip.lastStill}-*.jpg from ${clip.lastStillSource} (match ${(fit.ncc * 100).toFixed(1)}%)`);
    if (fit.ncc < 0.95) console.warn(`  ! low match: is ${clip.lastStillSource} really the last frame of ${name}?`);
  }

  if (withFrames) {
    const dir = path.join(out, 'frames', name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    console.log(`→ ${path.relative(root, dir)}/*.webp`);
    run(['-i', src, ...trim, '-an', '-vf', filters(clip, cfg.frameWidth), '-c:v', 'libwebp', '-quality', '72', path.join(dir, '%04d.webp')]);
    const count = fs.readdirSync(dir).filter((f) => f.endsWith('.webp')).length;
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ count, fps: 24 }));
  }
}

fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Done.');
