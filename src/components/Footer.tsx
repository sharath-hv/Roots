import { BRAND } from '../config';
import { BrandMark } from './BrandMark';

export function Footer() {
  return (
    <footer className="footer">
      <p className="footer__brand">
        <BrandMark className="footer__mark" />
        {BRAND.name}
      </p>
      <p>
        {BRAND.place}
        <br />
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </p>
      <p className="footer__small">© {new Date().getFullYear()} {BRAND.name}. Prices include tax.</p>
    </footer>
  );
}
