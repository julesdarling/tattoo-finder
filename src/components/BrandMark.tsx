import { Link } from 'react-router-dom';

export function BrandMark() {
  return (
    <Link className="brand-mark" to="/" aria-label="Tattoo Finder home">
      <span className="brand-logo" aria-hidden="true">
        <img src={`${import.meta.env.BASE_URL}brand-logo-source.png`} alt="" />
      </span>
      <span className="brand-text">
        <span>Bay Area</span>
        <strong>Tattoo Finder</strong>
      </span>
    </Link>
  );
}
