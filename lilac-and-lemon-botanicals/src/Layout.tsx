import { NavLink, Outlet } from 'react-router-dom';
import { useCart } from './CartContext';

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/my-skin', label: 'My Skin Assessment' },
  { to: '/about', label: 'About the Brand' },
  { to: '/products', label: 'Products' },
  { to: '/contact', label: 'Join Waitlist' },
];

export default function Layout() {
  const { totalItems } = useCart();

  return (
    <>
      <nav>
        <div className="wrap nav-inner">
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
  <div className="art-frame filled story-art">
    <img
      src="/icons/cart.png"
      alt="Illustrated shopping cart"
    />
  </div>

  <span className="cart-label">Cart</span>

  {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
</NavLink>
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
