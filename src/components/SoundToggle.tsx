import { useSound } from '../audio/useSound';

/** Floating speaker button in the bottom-right corner, kept apart from the header's basket. */
export function SoundToggle() {
  const sound = useSound();
  return (
    <button
      type="button"
      className="round-btn sound-toggle"
      onClick={sound.toggle}
      aria-label="Countryside sound"
      aria-pressed={sound.on}
      title={sound.on ? 'Turn sound off' : 'Turn sound on'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        {sound.on ? (
          <path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        ) : (
          <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
