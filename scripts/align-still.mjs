// Lines up a sharper still (e.g. an upscaled export of a clip's last frame)
// with the clip's real last frame, then writes it out cropped and sized
// exactly like the encoded video, so swapping one for the other never shifts.
//
// The still may differ in resolution, aspect and framing. We fit
//   video_x = sx * still_x + tx,   video_y = sy * still_y + ty
// by maximising normalised cross-correlation (robust to the still being a bit
// brighter or more contrasty), with a coarse-to-fine pattern search.
import { spawnSync } from 'node:child_process';

const REF_W = 640; // reference (video) analysis width
const STILL_W = 1600; // still analysis width

/** Decode to 8-bit gray at `width`. With `last`, decodes the tail and keeps only the final frame. */
function decodeGray(ffmpeg, args, width, height, last = false) {
  const res = spawnSync(
    ffmpeg,
    ['-hide_banner', '-loglevel', 'error', ...args, '-vf', `scale=${width}:${height},format=gray`, ...(last ? [] : ['-frames:v', '1']), '-f', 'rawvideo', '-'],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  if (res.status !== 0) throw new Error(`decode failed: ${res.stderr}`);
  const size = width * height;
  const bytes = res.stdout.subarray(res.stdout.length - size);
  return { data: Float32Array.from(bytes), w: width, h: height };
}

function decodeRgb(ffmpeg, args, pre, width, height, last) {
  const res = spawnSync(
    ffmpeg,
    ['-hide_banner', '-loglevel', 'error', ...args, '-vf', `${pre}scale=${width}:${height},format=rgb24`, ...(last ? [] : ['-frames:v', '1']), '-f', 'rawvideo', '-'],
    { maxBuffer: 256 * 1024 * 1024 },
  );
  if (res.status !== 0) throw new Error(`decode failed: ${res.stderr}`);
  return res.stdout.subarray(res.stdout.length - width * height * 3);
}

function channelStats(buf, c) {
  let n = 0, sum = 0, sq = 0;
  for (let i = c; i < buf.length; i += 3) {
    n++;
    sum += buf[i];
    sq += buf[i] * buf[i];
  }
  const mean = sum / n;
  return { mean, sd: Math.sqrt(sq / n - mean * mean) };
}

const evenHeight = (w, size) => 2 * Math.round((w * size.h) / size.w / 2);

export function sourceSize(ffmpeg, file) {
  const res = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = /, (\d{2,5})x(\d{2,5})[, ]/.exec(res.stderr);
  if (!m) throw new Error(`could not read size of ${file}`);
  return { w: +m[1], h: +m[2] };
}

function bilinear(img, x, y) {
  if (x < 0 || y < 0 || x > img.w - 1.001 || y > img.h - 1.001) return NaN;
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
  const i = y0 * img.w + x0, d = img.data;
  return (d[i] * (1 - fx) + d[i + 1] * fx) * (1 - fy) + (d[i + img.w] * (1 - fx) + d[i + img.w + 1] * fx) * fy;
}

/** Negative NCC between the reference and the still warped by p, on every `step`-th pixel. */
function cost(ref, still, p, step) {
  const mx = Math.round(ref.w * 0.04), my = Math.round(ref.h * 0.04);
  let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let y = my; y < ref.h - my; y += step) {
    for (let x = mx; x < ref.w - mx; x += step) {
      const b = bilinear(still, (x - p.tx) / p.sx, (y - p.ty) / p.sy);
      if (Number.isNaN(b)) return 1; // still doesn't cover the frame: reject
      const a = ref.data[y * ref.w + x];
      n++; sa += a; sb += b; saa += a * a; sbb += b * b; sab += a * b;
    }
  }
  const cov = sab - (sa * sb) / n;
  const va = saa - (sa * sa) / n, vb = sbb - (sb * sb) / n;
  return -cov / Math.sqrt(va * vb);
}

function search(ref, still, start, step, steps) {
  let p = { ...start }, best = cost(ref, still, p, step);
  const s = { ...steps };
  for (let iter = 0; iter < 400; iter++) {
    let improved = false;
    for (const k of ['sx', 'sy', 'tx', 'ty']) {
      for (const dir of [1, -1]) {
        const q = { ...p, [k]: p[k] + dir * s[k] };
        const c = cost(ref, still, q, step);
        if (c < best) {
          best = c;
          p = q;
          improved = true;
        }
      }
    }
    if (!improved) {
      for (const k in s) s[k] /= 2;
      if (s.tx < 0.02) break;
    }
  }
  return { p, ncc: -best };
}

/**
 * @param ffmpeg   ffmpeg binary
 * @param video    encoded clip (already cropped) whose last frame is the target
 * @param still    the sharper still
 * @param outputs  [{ file, width, height }] exact output sizes (same aspect as the video)
 */
export function alignStill({ ffmpeg, video, still, outputs }) {
  const vsize = sourceSize(ffmpeg, video);
  const ssize = sourceSize(ffmpeg, still);
  const refLast = decodeGray(ffmpeg, ['-sseof', '-0.5', '-i', video], REF_W, evenHeight(REF_W, vsize), true);
  const img = decodeGray(ffmpeg, ['-i', still], STILL_W, evenHeight(STILL_W, ssize));

  // Start from "same frame, fit to width", then refine coarse to fine.
  const s0 = REF_W / STILL_W;
  let fit = search(refLast, img, { sx: s0, sy: s0, tx: 0, ty: 0 }, 6, { sx: s0 * 0.02, sy: s0 * 0.02, tx: 8, ty: 8 });
  fit = search(refLast, img, fit.p, 2, { sx: s0 * 0.002, sy: s0 * 0.002, tx: 1, ty: 1 });
  fit = search(refLast, img, fit.p, 1, { sx: s0 * 0.0005, sy: s0 * 0.0005, tx: 0.25, ty: 0.25 });
  const { p, ncc } = fit;

  // Crop rectangle of the video frame, in the still's native pixels.
  // Analysis images were resized independently per axis; map back to native pixels.
  const kx = ssize.w / STILL_W;
  const ky = ssize.h / img.h;
  const crop = {
    x: (-p.tx / p.sx) * kx,
    y: (-p.ty / p.sy) * ky,
    w: (refLast.w / p.sx) * kx,
    h: (refLast.h / p.sy) * ky,
  };
  if (process.env.ALIGN_DEBUG) console.log({ p, ncc, crop, ssize, vsize });

  // The still can be a hair tighter than the video frame; smear its edge pixels
  // outward a little so the crop always has pixels to land on. Crop at 4x so
  // the integer crop grid is a quarter of a still pixel (sub-pixel on screen).
  const PAD = 16;
  const Z = 4;
  const cw = Math.round(crop.w * Z), ch = Math.round(crop.h * Z);
  const cx = Math.round((crop.x + PAD) * Z), cy = Math.round((crop.y + PAD) * Z);
  const filter = [
    'format=rgb24',
    `pad=iw+${2 * PAD}:ih+${2 * PAD}:${PAD}:${PAD}`,
    `fillborders=left=${PAD}:right=${PAD}:top=${PAD}:bottom=${PAD}:mode=smear`,
    `scale=iw*${Z}:ih*${Z}:flags=lanczos`,
    `crop=${cw}:${ch}:${cx}:${cy}:exact=1`,
  ].join(',');
  // Match tone too: a per-channel gain/offset so the still has the video's
  // mean and contrast in R, G and B, and the swap shows no brightness change.
  const W = REF_W, H = refLast.h;
  const videoRgb = decodeRgb(ffmpeg, ['-sseof', '-0.5', '-i', video], '', W, H, true);
  const stillRgb = decodeRgb(ffmpeg, ['-i', still], `${filter},`, W, H, false);
  const tone = [0, 1, 2].map((c) => {
    const a = channelStats(videoRgb, c), b = channelStats(stillRgb, c);
    const gain = a.sd / b.sd;
    return { gain, offset: a.mean - b.mean * gain };
  });
  const lut = ['r', 'g', 'b'].map((ch, i) => `${ch}=clip(val*${tone[i].gain.toFixed(5)}+${tone[i].offset.toFixed(3)}\\,0\\,255)`).join(':');

  for (const o of outputs) {
    const res = spawnSync(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', still,
      '-vf', `${filter},scale=${o.width}:${o.height}:flags=lanczos,lutrgb=${lut}`,
      '-q:v', '2', o.file,
    ]);
    if (res.status !== 0) throw new Error(`still export failed: ${res.stderr}`);
  }
  return { ...p, ncc, crop, tone, nativeWidth: crop.w };
}
