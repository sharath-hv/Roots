import { useEffect, type RefObject } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * While `active`, keeps Tab inside `ref`, closes on Escape, and on deactivate
 * returns focus to `returnTo` (or whatever had focus when it opened).
 */
export function useFocusTrap(ref: RefObject<HTMLElement>, active: boolean, onEscape: () => void, returnTo?: () => HTMLElement | null) {
  useEffect(() => {
    if (!active) return;
    const root = ref.current;
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null;
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);

    const initial = root.querySelector<HTMLElement>('[data-autofocus]') ?? items()[0] ?? root;
    initial.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      if (!list.length) return e.preventDefault();
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      // Don't steal focus from something else that just took it (e.g. the cart drawer).
      const now = document.activeElement;
      if (now && now !== document.body && !root.contains(now)) return;
      const target = returnTo?.() ?? previous;
      const usable = target && document.contains(target) && target.offsetParent !== null ? target : document.querySelector<HTMLElement>('[data-cart-button]');
      usable?.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
