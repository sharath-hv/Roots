import { gsap } from 'gsap';

type Tick = () => void;
const ticks = new Set<Tick>();
let running = false;

function loop() {
  ticks.forEach((t) => t());
}

/** Shared requestAnimationFrame loop (GSAP's ticker) for all scrubbers. */
export function onTick(fn: Tick) {
  ticks.add(fn);
  if (!running) {
    gsap.ticker.add(loop);
    running = true;
  }
  return () => {
    ticks.delete(fn);
    if (!ticks.size && running) {
      gsap.ticker.remove(loop);
      running = false;
    }
  };
}

/** Eases `current` toward `target`; snaps when close enough to stop drifting forever. */
export function ease(current: number, target: number, lerp: number) {
  const next = current + (target - current) * lerp;
  return Math.abs(target - next) < 0.0004 ? target : next;
}
