import { useLayoutEffect, useRef } from 'react';
import { productById } from '../data/products';
import { formatPrice, unitLabel } from '../lib/format';
import { useFocusTrap } from '../lib/useFocusTrap';
import { QuantityStepper } from '../components/QuantityStepper';
import { useCart } from './CartContext';

export function CartDrawer() {
  const cart = useCart();
  const ref = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Runs before the focus trap's effect, so the panel is focusable when it tries.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('is-locked', cart.isOpen);
    if (rootRef.current) rootRef.current.inert = !cart.isOpen;
  }, [cart.isOpen]);
  useFocusTrap(ref, cart.isOpen, cart.close, () => cart.returnFocus.current);

  return (
    <div className={`drawer ${cart.isOpen ? 'is-open' : ''}`} aria-hidden={!cart.isOpen} ref={rootRef}>
      <div className="drawer__scrim" onClick={cart.close} />
      <div className="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="cart-title" ref={ref} tabIndex={-1}>
        <header className="drawer__head">
          <h2 id="cart-title" className="drawer__title">
            Your basket
          </h2>
          <button type="button" className="icon-btn" onClick={cart.close} aria-label="Close basket" data-autofocus>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </header>

        {cart.lines.length === 0 ? (
          <p className="drawer__empty">Nothing in here yet. The stall is just above.</p>
        ) : (
          <ul className="drawer__lines">
            {cart.lines.map((line) => {
              const p = productById[line.id];
              return (
                <li key={line.id} className="line">
                  <div className="line__info">
                    <p className="line__name">{p.name}</p>
                    <p className="line__meta">
                      {formatPrice(p.price)} {unitLabel(p)}
                    </p>
                  </div>
                  <QuantityStepper value={line.qty} min={1} max={p.stock} onChange={(q) => cart.setQty(p.id, q)} label={`Quantity of ${p.name}`} />
                  <p className="line__total">{formatPrice(p.price * line.qty)}</p>
                  <button type="button" className="link-btn line__remove" onClick={() => cart.remove(p.id)} aria-label={`Remove ${p.name}`}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="drawer__foot">
          <p className="drawer__subtotal">
            <span>Subtotal</span>
            <span>{formatPrice(cart.subtotal)}</span>
          </p>
          <p className="drawer__note">Picked on Tuesday, at your door by Thursday. Delivery is worked out at checkout.</p>
          <button
            type="button"
            className="btn btn--primary btn--wide"
            disabled={!cart.lines.length}
            onClick={() => window.alert('Checkout is not built yet. This button is a stub.')}
          >
            Checkout <span className="stub-tag">(stub)</span>
          </button>
        </footer>
      </div>
    </div>
  );
}
