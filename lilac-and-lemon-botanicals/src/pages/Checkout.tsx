import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../CartContext';

type FormState = {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  notes: '',
};

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          subtotal,
        }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('done');
      clearCart();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <section className="checkout-section">
        <div className="wrap">
          <div className="order-confirmed">
            <div className="checkmark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2>Order reserved.</h2>
            <p>
              We've saved your order — the shop hasn't launched yet, so no payment was taken.
              We'll email you the moment Rue Botanicals is ready to ship it to you.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="checkout-section">
        <div className="wrap">
          <div className="cart-empty">
            <p>Your cart is empty — there's nothing to check out yet.</p>
            <Link to="/products">Browse Products</Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-section">
      <div className="wrap">
        <div className="cart-head">
          <span className="label">Reserve Your Order</span>
          <h2>Just a few details.</h2>
          <p>No payment yet — this holds your spot for when we open the shop.</p>
        </div>

        <form className="order-form" onSubmit={handleSubmit}>
          <div className="order-form-row">
            <div className="order-form-field">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </div>
            <div className="order-form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
              />
            </div>
          </div>

          <div className="order-form-field">
            <label htmlFor="address">Shipping Address</label>
            <input
              id="address"
              required
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>

          <div className="order-form-row">
            <div className="order-form-field">
              <label htmlFor="city">City</label>
              <input
                id="city"
                required
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
              />
            </div>
            <div className="order-form-field">
              <label htmlFor="state">State</label>
              <input
                id="state"
                required
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
              />
            </div>
            <div className="order-form-field">
              <label htmlFor="zip">ZIP</label>
              <input
                id="zip"
                required
                value={form.zip}
                onChange={(e) => update('zip', e.target.value)}
              />
            </div>
          </div>

          <div className="order-form-field">
            <label htmlFor="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows={3}
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
            />
          </div>

          <div className="order-form-summary">
            {items.map((item) => (
              <div className="order-form-summary-item" key={item.id}>
                <span>{item.name} × {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="order-form-summary-total">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>

          <button className="checkout-btn" type="submit" disabled={status === 'sending'}>
            {status === 'sending' ? 'Reserving…' : 'Reserve Order'}
          </button>
          {status === 'error' && (
            <p className="cart-summary-note">Something went wrong — try again in a moment.</p>
          )}
        </form>
      </div>
    </section>
  );
}
