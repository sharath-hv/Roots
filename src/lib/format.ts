import { CURRENCY } from '../config';
import type { Product } from '../data/products';

export const formatPrice = (amount: number) => CURRENCY.format(amount);

export const unitLabel = (p: Pick<Product, 'unit'>) => (p.unit === 'kg' ? 'per kg' : `per ${p.unit}`);

const dateFmt = new Intl.DateTimeFormat(CURRENCY.locale, { weekday: 'long', day: 'numeric', month: 'short' });

/** "Picked Tuesday, 27 Oct" */
export function harvestLabel(iso: string) {
  const d = new Date(`${iso}T08:00:00`);
  return `Picked ${dateFmt.format(d)}`;
}
