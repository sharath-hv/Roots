import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../config';
import { readStorage, writeStorage } from '../lib/storage';
import { ambience } from './ambience';

/**
 * Sound is off until the visitor turns it on. If they turned it on last visit, it comes back
 * on their first click or key press, since browsers won't start audio before a gesture.
 */
export function useSound() {
  const [on, setOn] = useState(() => readStorage<boolean>(STORAGE_KEYS.sound, false));

  useEffect(() => {
    if (!on) return;
    const resume = () => void ambience.start();
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, [on]);

  const toggle = useCallback(() => {
    const next = !on;
    if (next) void ambience.start();
    else ambience.stop();
    writeStorage(STORAGE_KEYS.sound, next);
    setOn(next);
  }, [on]);

  return { on, toggle };
}
