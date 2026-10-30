/**
 * Maps a 0..1 progress value to a frame of a clip. Callers set a target from
 * scroll; the scrubber eases toward it on the shared ticker and draws only
 * when the frame actually changes.
 */
export interface Scrubber {
  /** The element to put on screen (<video> or <canvas>). Fills its parent, cover-fit. */
  readonly el: HTMLElement;
  readonly ready: boolean;
  /** Download everything needed to scrub without waiting. */
  load(onProgress?: (p: number) => void): Promise<void>;
  /** Where scroll wants us to be, 0..1. */
  setTarget(progress: number): void;
  /** Horizontal focus for cover-fit, 0..1 (object-position x). */
  setFocusX(x: number): void;
  destroy(): void;
}

export interface ScrubberOptions {
  clip: string; // e.g. 'walk-in'
  fps: number;
  lerp: number;
  label: string;
}
