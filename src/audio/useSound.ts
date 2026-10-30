import { useCallback, useEffect, useRef, useState } from 'react';
import { ambience } from './ambience';

/**
 * Sound is on every time the page loads; muting lasts for that visit only. Browsers won't
 * start audio before a click, tap or key press (scrolling doesn't count), so it tries straight
 * away and again on the first such gesture anywhere on the page. Until then `waiting` is true,
 * so the button can ask for that click.
 */
export function useSound() {
  const [on, setOn] = useState(true);
  const [audible, setAudible] = useState(ambience.audible);
  // Whether sound was still waiting when the current press began. The same press is what lets
  // the browser start audio, so by the time `click` fires it may already be playing; reading
  // the state then would turn it straight back off.
  const waitingAtPress = useRef(false);

  useEffect(() => ambience.subscribe(() => setAudible(ambience.audible)), []);

  useEffect(() => {
    if (!on) return;
    ambience.start();
    const resume = () => ambience.start();
    const events = ['pointerdown', 'touchend', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, resume, { once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, resume));
  }, [on]);

  const waiting = on && !audible;

  /** Call from the button's pointerdown and keydown, before the window listeners run. */
  const notePress = useCallback(() => {
    waitingAtPress.current = on && !ambience.audible;
  }, [on]);

  const toggle = useCallback(() => {
    if (waitingAtPress.current) {
      // On but blocked: this press is the go-ahead, so start rather than mute.
      waitingAtPress.current = false;
      ambience.start();
      return;
    }
    const next = !on;
    if (next) ambience.start();
    else ambience.stop();
    setOn(next);
  }, [on]);

  return { on, waiting, toggle, notePress };
}
