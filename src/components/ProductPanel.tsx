import { useId, useState } from 'react';
import { useCart } from '../cart/CartContext';
import type { Product } from '../data/products';
import { formatPrice, harvestLabel, unitLabel } from '../lib/format';
import { QuantityStepper } from './QuantityStepper';

/** Name, origin, trust details, price, stepper and add button. Shared by hover card, sheet and grid. */
interface Props {
  product: Product;
  headingLevel?: 2 | 3;
  showDescription?: boolean;
  /** Where focus goes when the cart drawer closes (defaults to the add button). */
  returnFocusTo?: HTMLElement | null;
}

export function ProductPanel({ product, headingLevel = 3, showDescription = false, returnFocusTo }: Props) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const inCart = cart.lines.find((l) => l.id === product.id)?.qty ?? 0;
  const available = Math.max(0, product.stock - inCart);
  const soldOut = product.stock === 0;
  const H = `h${headingLevel}` as 'h2' | 'h3';
  const id = useId();

  return (
    <div className="panel">
      <H className="panel__name" id={`${id}-name`}>
        {product.name}
      </H>
      <p className="panel__origin">{product.farmName}</p>
      {showDescription && <p className="panel__desc">{product.description}</p>}
      <ul className="panel__trust">
        <li>{harvestLabel(product.harvestDate)}</li>
        <li className={product.organicCertified ? 'is-certified' : undefined}>
          {product.organicCertified && <Leaf />}
          {product.certificationLabel}
        </li>
      </ul>
      <p className="panel__price">
        <span className="panel__amount">{formatPrice(product.price)}</span> <span className="panel__unit">{unitLabel(product)}</span>
      </p>
      {soldOut ? (
        <button type="button" className="btn btn--primary panel__add" disabled>
          Sold out this week
        </button>
      ) : (
        <div className="panel__buy">
          <QuantityStepper
            value={Math.min(qty, Math.max(available, 1))}
            max={Math.max(available, 1)}
            onChange={setQty}
            disabled={available === 0}
            label={`Quantity of ${product.name}, ${unitLabel(product)}`}
          />
          <button
            type="button"
            className="btn btn--primary panel__add"
            disabled={available === 0}
            onClick={(e) => {
              cart.add(product.id, Math.min(qty, available));
              setQty(1);
              cart.open(returnFocusTo ?? e.currentTarget);
            }}
          >
            {available === 0 ? 'All in your basket' : 'Add to cart'}
          </button>
        </div>
      )}
    </div>
  );
}

function Leaf() {
  return (
    <svg className="leaf" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M13.5 2.5C7 2.5 3 5.5 3 10c0 1.4.5 2.6 1.3 3.5L3 15l1 .8 1.3-1.5c.9.6 2 1 3.2 1 4.3 0 5-6.8 5-12.8zM6 12c1.6-2.6 3.4-4.4 5.5-5.8" fill="none" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
