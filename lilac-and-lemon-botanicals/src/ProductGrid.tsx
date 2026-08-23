import { useEffect, useState } from 'react';
import { useCart } from './CartContext';

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

  // Botanical flat-lay art, used as a soft, faded backdrop on each card
  const backgroundImages: Record<number, string> = {
    101: '/illustrations/1_paquerette.png',
    102: '/illustrations/2_seve_serum.png',
    103: '/illustrations/3_clochette.png',
    104: '/illustrations/4_matinale_cleanser.png',
    105: '/illustrations/5_fleurie_serum.png',
    106: '/illustrations/6_aube_moisturizer.png',
    107: '/illustrations/7_reveuse.png',
    108: '/illustrations/8_rosee.png',
  };

  // Actual bottle/jar renders, layered on top of the backdrop
  const bottleImages: Record<number, string> = {
    101: '/illustrations/01_Paquerette.png',
    102: '/illustrations/03_Seve.png',
    103: '/illustrations/05_Clochette.png',
    104: '/illustrations/02_Matinale.png',
    105: '/illustrations/04_Fleurie.png',
    106: '/illustrations/06_Aube.png',
    107: '/illustrations/07_Reveuse.png',
    108: '/illustrations/08_Rosee.png',
  };

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((rows: Product[]) =>
        setProducts(
          rows
            .filter((p) => p.id >= 101 && p.id <= 108)
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
          <span className="label">Coming Soon</span>

          <h2>Inspired by our personal garden.</h2>

          <p>
            Every formula begins with botanicals chosen for a reason — rose,
            calendula, green tea, hibiscus, yarrow, and nasturtium, thoughtfully
            paired with gentle, effective ingredients. Nothing extra, nothing
            borrowed — just thoughtful formulas rooted in the garden.
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

              <img
                className="product-card-accent"
                src={backgroundImages[p.id]}
                alt=""
                aria-hidden="true"
              />

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