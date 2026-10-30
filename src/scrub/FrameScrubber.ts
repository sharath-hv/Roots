import { coverRect } from '../lib/cover';
import { framesBase } from '../lib/media';
import { ease, onTick } from './ticker';
import type { Scrubber, ScrubberOptions } from './types';

/**
 * Canvas fallback: draws pre-extracted WebP frames (npm run media).
 * Smooth everywhere, including Safari, at the cost of more bytes.
 */
export class FrameScrubber implements Scrubber {
  readonly el: HTMLCanvasElement;
  ready = false;
  private ctx: CanvasRenderingContext2D;
  private images: HTMLImageElement[] = [];
  private target = 0;
  private current = 0;
  private drawn = -1;
  private focusX = 0.5;
  private dirty = true;
  private stop: (() => void) | null = null;
  private ro: ResizeObserver;
  private cancelled = false;

  constructor(private opts: ScrubberOptions) {
    this.el = document.createElement('canvas');
    this.el.className = 'scrub-media';
    this.el.setAttribute('aria-hidden', 'true');
    this.ctx = this.el.getContext('2d')!;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.el);
  }

  async load(onProgress?: (p: number) => void) {
    const base = framesBase(this.opts.clip);
    const res = await fetch(`${base}/manifest.json`);
    if (!res.ok) throw new Error(`No frames for ${this.opts.clip}. Run npm run media.`);
    const { count } = (await res.json()) as { count: number };
    let done = 0;
    const urls = Array.from({ length: count }, (_, i) => `${base}/${String(i + 1).padStart(4, '0')}.webp`);
    // Small concurrency so the first frames land early and the network stays fair.
    const queue = urls.map((u, i) => [u, i] as const);
    this.images = new Array(count);
    const worker = async () => {
      for (let job = queue.shift(); job && !this.cancelled; job = queue.shift()) {
        const img = new Image();
        img.decoding = 'async';
        img.src = job[0];
        await img.decode().catch(() => undefined);
        this.images[job[1]] = img;
        onProgress?.(++done / count);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    this.ready = true;
    this.current = this.target;
    this.stop = onTick(this.tick);
  }

  setTarget(p: number) {
    this.target = Math.min(1, Math.max(0, p));
  }

  setFocusX(x: number) {
    this.focusX = x;
    this.dirty = true;
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(this.el.clientWidth * dpr);
    const h = Math.round(this.el.clientHeight * dpr);
    if (w && h && (w !== this.el.width || h !== this.el.height)) {
      this.el.width = w;
      this.el.height = h;
      this.dirty = true;
    }
  }

  private tick = () => {
    this.current = ease(this.current, this.target, this.opts.lerp);
    const idx = Math.round(this.current * (this.images.length - 1));
    if (idx === this.drawn && !this.dirty) return;
    const img = this.images[idx];
    if (!img?.naturalWidth) return;
    const r = coverRect(this.el.width, this.el.height, img.naturalWidth, img.naturalHeight, this.focusX, 0.5);
    this.ctx.drawImage(img, r.x, r.y, r.width, r.height);
    this.drawn = idx;
    this.dirty = false;
  };

  destroy() {
    this.cancelled = true;
    this.stop?.();
    this.ro.disconnect();
    this.images = [];
  }
}
