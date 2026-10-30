import { useEffect, useState } from 'react';

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export const useReducedMotion = () => useMediaQuery('(prefers-reduced-motion: reduce)');
/** Touch-first devices get bottom sheets instead of hover cards. */
export const useCoarsePointer = () => useMediaQuery('(hover: none), (pointer: coarse)');
export const usePortrait = () => useMediaQuery('(max-aspect-ratio: 1/1)');
