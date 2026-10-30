import { BRAND } from '../config';
import { BrandMark } from './BrandMark';
import { useCart } from '../cart/CartContext';

interface Props {
  onShopAll(): void;
  /** The footage behind the logo is dark: use the light version of the logo. */
  onDark?: boolean;
}

export function Header({ onShopAll, onDark = false }: Props) {
  const cart = useCart();
  return (
    <header className={`header${onDark ? ' header--on-dark' : ''}`}>
      <a className="skip-link" href="#shop">
        Skip to the shop
      </a>
      <a className="wordmark" href="#top" aria-label={`${BRAND.name}, back to the top`}>
        <BrandMark className="wordmark__mark" />
        <span className="wordmark__name">{BRAND.name}</span>
      </a>
      <nav className="header__nav" aria-label="Main">
        <a
          className="btn btn--primary header__cta"
          href="#shop"
          onClick={(e) => {
            e.preventDefault();
            onShopAll();
          }}
        >
          Shop all
        </a>
        <button
          type="button"
          className="round-btn cart-btn"
          onClick={(e) => cart.open(e.currentTarget)}
          aria-label={`Basket, ${cart.count} ${cart.count === 1 ? 'item' : 'items'}`}
          data-cart-button
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9h16l-1.6 9.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8L4 9zM8.5 9l3.5-5 3.5 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
          {cart.count > 0 && <span className="cart-btn__count">{cart.count}</span>}
        </button>
      </nav>
    </header>
  );
}
