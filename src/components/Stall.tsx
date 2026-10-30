import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useCart } from '../cart/CartContext';
import { MEDIA } from '../config';
import { products, type Product } from '../data/products';
import { coverRect, type Rect } from '../lib/cover';
import { useCoarsePointer, usePortrait } from '../lib/hooks';
import { useFocusTrap } from '../lib/useFocusTrap';
import { ProductPanel } from './ProductPanel';

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled])';

interface Props {
  src: string;
  /** False while the stall is still behind the door animation. */
  active: boolean;
  focusX?: number;
}

/**
 * The interior still with products as hotspots. The image and the hotspots
 * share one box sized by cover maths, so hotspots stay on their crates at any
 * aspect ratio. On portrait screens the box is wider than the screen and can be
 * swiped sideways.
 */
export function Stall({ src, active, focusX = 0.5 }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const coarse = useCoarsePointer();
  const portrait = usePortrait();
  const closeTimer = useRef<number>();
  const hotspotRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rect: Rect | null = natural && box.w ? coverRect(box.w, box.h, natural.w, natural.h, focusX, 0.5) : null;
  const scrollable = !!rect && portrait && rect.width > box.w * 1.15;

  // Start the swipeable strip at the same crop the video ended on.
  useLayoutEffect(() => {
    if (scrollable && rect && scrollerRef.current) scrollerRef.current.scrollLeft = -rect.x;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollable, rect?.width, box.w]);

  const cart = useCart();
  useEffect(() => {
    if (cart.isOpen) setSheetId(null);
  }, [cart.isOpen]);

  useEffect(() => {
    if (!active) {
      setOpenId(null);
      setSheetId(null);
    }
  }, [active]);

  const open = useCallback((id: string) => {
    window.clearTimeout(closeTimer.current);
    setOpenId(id);
  }, []);
  const closeSoon = useCallback(() => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpenId(null), 180);
  }, []);

  // Esc closes the hover card and puts focus back on its hotspot.
  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const id = openId;
      setOpenId(null);
      hotspotRefs.current[id]?.focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openId]);

  const openProduct = products.find((p) => p.id === openId) ?? null;
  const sheetProduct = products.find((p) => p.id === sheetId) ?? null;

  return (
    <div className="stall" ref={rootRef}>
      <div className={`stall__scroller ${scrollable ? 'is-scrollable' : ''}`} ref={scrollerRef} tabIndex={-1}>
        <div
          className="stall__frame"
          style={
            rect
              ? scrollable
                ? { width: rect.width, height: rect.height, left: 0, top: rect.y }
                : { width: rect.width, height: rect.height, left: rect.x, top: rect.y }
              : { inset: 0 }
          }
        >
          <img
            className="stall__img"
            src={src}
            alt="Inside the stall: crates of oranges and mangoes, barrels of berries, and bunches of flowers on wooden shelves."
            ref={(img) => {
              // A cached image can finish before React attaches onLoad.
              if (img?.complete && img.naturalWidth && !natural) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
            }}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            draggable={false}
          />
          {rect &&
            products.map((p) => (
              <button
                key={p.id}
                ref={(el) => (hotspotRefs.current[p.id] = el)}
                type="button"
                className={`hotspot ${openId === p.id ? 'is-open' : ''} ${p.stock === 0 ? 'is-soldout' : ''}`}
                style={{ left: `${p.hotspot.x * 100}%`, top: `${p.hotspot.y * 100}%` }}
                aria-label={`${p.name}${p.stock === 0 ? ', sold out' : ''}. Show details`}
                aria-expanded={coarse ? undefined : openId === p.id}
                aria-haspopup="dialog"
                tabIndex={active ? 0 : -1}
                onPointerEnter={(e) => e.pointerType === 'mouse' && open(p.id)}
                onPointerLeave={(e) => e.pointerType === 'mouse' && closeSoon()}
                onFocus={() => !coarse && open(p.id)}
                onBlur={(e) => {
                  if (!rootRef.current?.querySelector('.hover-card')?.contains(e.relatedTarget as Node)) closeSoon();
                }}
                onClick={() => (coarse ? setSheetId(p.id) : open(p.id))}
                onKeyDown={(e) => {
                  if (e.key !== 'Tab' || e.shiftKey || openId !== p.id) return;
                  const first = rootRef.current?.querySelector<HTMLElement>(`.hover-card ${FOCUSABLE}`);
                  if (first) {
                    e.preventDefault();
                    first.focus();
                  }
                }}
              >
                <span className="hotspot__dot" aria-hidden="true" />
                <span className="hotspot__name" aria-hidden="true">
                  {p.name}
                </span>
              </button>
            ))}
        </div>
      </div>

      {scrollable && <p className="stall__hint" aria-hidden="true">Swipe to look along the shelves</p>}

      {!coarse && openProduct && (
        <HoverCard
          product={openProduct}
          anchor={hotspotRefs.current[openProduct.id]}
          root={rootRef.current}
          onEnter={() => window.clearTimeout(closeTimer.current)}
          onLeave={closeSoon}
          onTabOut={(back) => {
            const ids = products.map((p) => p.id);
            const i = ids.indexOf(openProduct.id);
            const target = back ? hotspotRefs.current[openProduct.id] : hotspotRefs.current[ids[i + 1]];
            if (!target) return false;
            target.focus();
            return true;
          }}
        />
      )}
      <BottomSheet product={sheetProduct} onClose={() => setSheetId(null)} returnTo={sheetId ? hotspotRefs.current[sheetId] : null} />
    </div>
  );
}

function HoverCard({
  product,
  anchor,
  root,
  onEnter,
  onLeave,
  onTabOut,
}: {
  product: Product;
  anchor: HTMLElement | null | undefined;
  root: HTMLElement | null;
  onEnter(): void;
  onLeave(): void;
  /** The card lives outside the hotspot row in the DOM, so we route Tab by hand. */
  onTabOut(backwards: boolean): boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const card = ref.current;
    if (!card || !anchor || !root) return;
    const a = anchor.getBoundingClientRect();
    const r = root.getBoundingClientRect();
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const gap = 18;
    const ax = a.left - r.left + a.width / 2;
    const ay = a.top - r.top + a.height / 2;
    let left = ax + gap;
    if (left + cw > r.width - 16) left = ax - gap - cw;
    left = Math.max(16, left);
    let top = ay - ch / 2;
    const topLimit = 84; // clear of the header
    // Keep out of the watermark corner (bottom right).
    const safe = MEDIA.watermarkSafeZone;
    const inSafeX = left + cw > r.width * (1 - safe.right);
    const bottomLimit = r.height - (inSafeX ? r.height * safe.bottom : 16);
    top = Math.min(Math.max(topLimit, top), bottomLimit - ch);
    setPos({ left, top });
  }, [product.id, anchor, root]);

  return (
    <div
      ref={ref}
      className="hover-card"
      role="dialog"
      aria-label={product.name}
      style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocus={onEnter}
      onKeyDown={(e) => {
        if (e.key !== 'Tab') return;
        const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
        const edge = e.shiftKey ? items[0] : items[items.length - 1];
        if (document.activeElement === edge && onTabOut(e.shiftKey)) e.preventDefault();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node) && e.relatedTarget !== anchor) onLeave();
      }}
    >
      <ProductPanel product={product} returnFocusTo={anchor} />
    </div>
  );
}

function BottomSheet({ product, onClose, returnTo }: { product: Product | null; onClose(): void; returnTo: HTMLElement | null | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const keep = useRef<HTMLElement | null>(null);
  if (returnTo) keep.current = returnTo;
  useFocusTrap(ref, !!product, onClose, () => keep.current);
  if (!product) return null;
  return (
    <div className="sheet">
      <div className="sheet__scrim" onClick={onClose} />
      <div className="sheet__panel" role="dialog" aria-modal="true" aria-label={product.name} ref={ref}>
        <span className="sheet__grip" aria-hidden="true" />
        <button type="button" className="icon-btn sheet__close" onClick={onClose} aria-label="Close" data-autofocus>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <ProductPanel product={product} headingLevel={2} showDescription returnFocusTo={keep.current} />
      </div>
    </div>
  );
}
