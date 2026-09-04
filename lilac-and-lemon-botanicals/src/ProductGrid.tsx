import { useEffect, useState } from 'react';
import { useCart } from './CartContext';
import { backgroundImages, bottleImages } from './productImages';

type Product = {
  id: number;
  sort_order: number;
  name: string;
  ingredient_label: string;
  description: string;
  swatch_color: string;
  status: string;
  size_oz: number;
  price: number;
};

export default function ProductGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [justAdded, setJustAdded] = useState<number | null>(null);
  const { addItem } = useCart();

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((rows: Product[]) =>
        setProducts(
          rows
            .filter((p) => p.id >= 101 && p.id <= 109)
            .sort((a, b) => a.sort_order - b.sort_order)
        )
      )
      .catch(() => setProducts([]));
  }, []);

  function getQty(id: number) {
    return quantities[id] ?? 1;
  }

  function setQty(id: number, qty: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, qty) }));
  }

  const allComingSoon = products.length > 0 && products.every((p) => p.status === 'soon');
  const eyebrowLabel = products.length === 0 || allComingSoon ? 'Coming Soon' : 'Now Available';

  function handleAddToCart(p: Product) {
    addItem(
      {
        id: p.id,
        name: p.name,
        price: p.price,
        size_oz: p.size_oz,
        image: bottleImages[p.id],
      },
      getQty(p.id)
    );
    setQty(p.id, 1);
    setJustAdded(p.id);
    setTimeout(() => setJustAdded((cur) => (cur === p.id ? null : cur)), 1400);
  }

  return (
    <section className="products">
      <div className="wrap">
        <div className="products-head">
          <span className="label">{eyebrowLabel}</span>

          <h2>Inspired by our personal garden.</h2>

          <p>
            Chosen with intention, paired with gentle, effective ingredients. Nothing extra, nothing borrowed — just formulas rooted in the garden.
          </p>
        </div>

        <div className="product-grid">
          {products.map((p) => (
            <div className="product-card" key={p.id}>
              {p.status === 'soon' ? (
                <span className="badge-soon">soon</span>
              ) : (
                <span className="badge-available">available</span>
              )}

              <div className="product-card-accent-wrap">
  <img
    className="product-card-accent"
    src={backgroundImages[p.id]}
    alt=""
    aria-hidden="true"
  />
</div>

              <div className="product-bottle-wrap">
                <img
                  className="product-bottle"
                  src={bottleImages[p.id]}
                  alt={`${p.name} bottle`}
                />
              </div>

              <div className="product-info">
                <span className="ingredient">{p.ingredient_label}</span>
                <span
                  className="ingredient-stem"
                  style={{ background: p.swatch_color || 'var(--butter-deep)' }}
                />

                <h3>{p.name}</h3>

                <span>{p.description}</span>

                <div className="product-meta">
                  <span>{p.size_oz} oz</span>
                  <span className="dot" aria-hidden="true">·</span>
                  <span className="price">${p.price.toFixed(2)}</span>
                </div>

                {p.status !== 'soon' && (
                  <div className="add-to-cart-row">
                    <div className="qty-stepper">
                      <button
                        type="button"
                        onClick={() => setQty(p.id, getQty(p.id) - 1)}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span>{getQty(p.id)}</span>
                      <button
                        type="button"
                        onClick={() => setQty(p.id, getQty(p.id) + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className={`add-to-cart-btn${justAdded === p.id ? ' added' : ''}`}
                      onClick={() => handleAddToCart(p)}
                    >
                      {justAdded === p.id ? 'Added ♡' : 'Add to Cart'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}