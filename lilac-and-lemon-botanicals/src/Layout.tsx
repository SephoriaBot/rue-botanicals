import { NavLink, Outlet } from 'react-router-dom';
import { useCart } from './CartContext';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/products', label: 'Products' },
  { to: '/contact', label: 'Contact' },
];

export default function Layout() {
  const { totalItems } = useCart();

  return (
    <>
      <nav>
        <div className="wrap nav-inner">
          <span className="wordmark">Rue Botanicals</span>
          <div className="nav-links">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-right">
            <NavLink
              to="/cart"
              className={({ isActive }) => `cart-link${isActive ? ' active' : ''}`}
              aria-label="View cart"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
            </NavLink>
            <span className="status-pill">In the making</span>
          </div>
        </div>
      </nav>

      <Outlet />

      <footer>
        <div className="wrap">© 2026 Rue Botanicals · built one step at a time</div>
      </footer>
    </>
  );
}
