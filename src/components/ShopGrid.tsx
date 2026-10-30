import { forwardRef } from 'react';
import { products } from '../data/products';
import { ProductPanel } from './ProductPanel';

export const ShopGrid = forwardRef<HTMLHeadingElement>(function ShopGrid(_, ref) {
  return (
    <section className="shop" id="shop" aria-labelledby="shop-title">
      <div className="shop__head">
        <h2 className="section-title section-title--lg" id="shop-title" ref={ref} tabIndex={-1}>
          Everything in the stall
        </h2>
        <p className="shop__intro">Six things this week. When a crate runs out, it stays out until the next picking.</p>
      </div>
      <ul className="grid">
        {products.map((p) => (
          <li key={p.id} className={`item ${p.stock === 0 ? 'is-soldout' : ''}`}>
            <img className="item__img" src={p.image} alt="" width={400} height={300} loading="lazy" />
            <ProductPanel product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
});
