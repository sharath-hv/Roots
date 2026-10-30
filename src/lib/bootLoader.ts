// Drives the loader that index.html paints before the app boots, so the first
// thing anyone sees is a calm cream screen, never a half-built page.
const MIN_VISIBLE_MS = 900;

const el = () => document.getElementById('boot-loader');

export function setBootProgress(p: number) {
  const root = el();
  const bar = root?.querySelector<HTMLElement>('.boot__bar');
  if (!bar) return;
  (bar.firstElementChild as HTMLElement).style.transform = `scaleX(${Math.min(1, Math.max(0, p))})`;
  bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
}

/**
 * Fade the loader out (after a short minimum, so it never just flashes) and
 * unlock scrolling. Resolves once the page is scrollable, so callers can
 * re-measure scroll-driven layout.
 */
let unlocked: Promise<void> | null = null;
export function hideBootLoader(): Promise<void> {
  if (unlocked) return unlocked;
  setBootProgress(1);
  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
  unlocked = new Promise((resolve) => {
    window.setTimeout(() => {
      document.documentElement.classList.remove('is-loading');
      const root = el();
      if (root) {
        root.classList.add('is-done');
        root.addEventListener('transitionend', () => root.remove(), { once: true });
        // transitionend can be skipped (background tab, no transition), so never leave it behind.
        window.setTimeout(() => root.remove(), 1200);
      }
      resolve();
    }, wait);
  });
  return unlocked;
}
