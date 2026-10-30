import { clipUrl, fetchWithProgress } from '../lib/media';
import { ease, onTick } from './ticker';
import type { Scrubber, ScrubberOptions } from './types';

/**
 * Scrubs an all-keyframe MP4 by setting currentTime. The whole file is fetched
 * into a blob first so seeks never wait on the network. play() is never called.
 * Opened from disk (file://), fetch() is blocked, so the video reads the file directly;
 * local seeks are fast anyway.
 */
export class VideoScrubber implements Scrubber {
  readonly el: HTMLVideoElement;
  ready = false;
  private target = 0;
  private current = 0;
  private frame = -1;
  private frames = 0;
  private url: string | null = null;
  private stop: (() => void) | null = null;
  private abort = new AbortController();

  constructor(private opts: ScrubberOptions) {
    const v = document.createElement('video');
    v.muted = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.disablePictureInPicture = true;
    v.setAttribute('aria-hidden', 'true');
    v.setAttribute('tabindex', '-1');
    v.className = 'scrub-media';
    this.el = v;
  }

  async load(onProgress?: (p: number) => void) {
    const src = clipUrl(this.opts.clip);
    if (location.protocol !== 'file:') {
      const blob = await fetchWithProgress(src, (p) => onProgress?.(p), this.abort.signal);
      this.url = URL.createObjectURL(blob);
    }
    const v = this.el;
    await new Promise<void>((resolve, reject) => {
      v.addEventListener('loadeddata', () => resolve(), { once: true });
      v.addEventListener('error', () => reject(new Error(`Could not decode ${this.opts.clip}`)), { once: true });
      v.src = this.url ?? src;
      v.load();
    });
    onProgress?.(1);
    this.frames = Math.max(1, Math.round(v.duration * this.opts.fps));
    this.ready = true;
    this.current = this.target;
    this.frame = -1;
    this.stop = onTick(this.tick);
  }

  setTarget(p: number) {
    this.target = Math.min(1, Math.max(0, p));
  }

  setFocusX(x: number) {
    this.el.style.objectPosition = `${x * 100}% 50%`;
  }

  private tick = () => {
    const v = this.el;
    this.current = ease(this.current, this.target, this.opts.lerp);
    // Quantise to frames: a change under half a frame never triggers a seek.
    const frame = Math.round(this.current * (this.frames - 1));
    if (frame === this.frame || v.seeking) return;
    this.frame = frame;
    v.currentTime = Math.min((frame + 0.5) / this.opts.fps, v.duration - 0.001);
  };

  destroy() {
    this.abort.abort();
    this.stop?.();
    this.el.removeAttribute('src');
    this.el.load();
    if (this.url) URL.revokeObjectURL(this.url);
  }
}
