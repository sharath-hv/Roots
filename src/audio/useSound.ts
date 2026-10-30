import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../config';
import { readStorage, writeStorage } from '../lib/storage';
import { ambience } from './ambience';

/**
 * Sound is on by default; a visitor who turns it off stays off on later visits. Browsers won't
 * start audio before a gesture, so it tries straight away and again on the first click, tap or
 * key press anywhere on the page.
 */
export function useSound() {
  const [on, setOn] = useState(() => readStorage<boolean>(STORAGE_KEYS.sound, true));

  useEffect(() => {
    if (!on) return;
    ambience.start();
    const resume = () => ambience.start();
    const events = ['pointerdown', 'touchend', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, resume, { once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, resume));
  }, [on]);

  const toggle = useCallback(() => {
    const next = !on;
    if (next) ambience.start();
    else ambience.stop();
    writeStorage(STORAGE_KEYS.sound, next);
    setOn(next);
  }, [on]);

  return { on, toggle };
}
