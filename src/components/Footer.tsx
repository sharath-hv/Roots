import { BRAND } from '../config';

export function Footer() {
  return (
    <footer className="footer">
      <p className="footer__brand">{BRAND.name}</p>
      <p>
        {BRAND.place}
        <br />
        <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
      </p>
      <p className="footer__small">© {new Date().getFullYear()} {BRAND.name}. Prices include tax.</p>
    </footer>
  );
}
