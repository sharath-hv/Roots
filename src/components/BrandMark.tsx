/**
 * The brand mark: the leaf and stem from public/favicon.svg without its tile, inline so it is crisp
 * and loads with the page. The stem takes the text colour, so it follows the wordmark's light/dark switch.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="8 5 16 24" aria-hidden="true" focusable="false">
      <path d="M16 6c-5 4-7 9-7 13a7 7 0 0 0 14 0c0-4-2-9-7-13z" fill="#d9631f" />
      <path d="M16 12v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
