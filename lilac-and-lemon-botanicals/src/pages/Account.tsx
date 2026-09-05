import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/react-router';

type ProfileForm = {
  fullName: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  cardHolder: string;
  cardNumber: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardCvc: string;
};

const EMPTY_FORM: ProfileForm = {
  fullName: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  cardHolder: '',
  cardNumber: '',
  cardExpMonth: '',
  cardExpYear: '',
  cardCvc: '',
};

type SavedCard = {
  cardBrand: string;
  cardLast4: string;
  cardExpMonth: string;
  cardExpYear: string;
  cardHolder: string;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function detectCardBrand(digits: string): string {
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(011|5)/.test(digits)) return 'Discover';
  return digits ? 'Card' : '';
}

function formatCardNumber(digits: string): string {
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

export default function Account() {
  const { isSignedIn, isLoaded, user } = useUser();

  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);
  const [skinType, setSkinType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [editingCard, setEditingCard] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isLoaded) return;
      if (!isSignedIn || !user) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/account?userId=${user.id}`);
        if (!res.ok) throw new Error('Failed to load account');
        const data = await res.json();

        if (cancelled) return;

        if (data.profile) {
          setForm((prev) => ({
            ...prev,
            fullName: data.profile.fullName || user.fullName || '',
            email: data.profile.email || user.primaryEmailAddress?.emailAddress || '',
            address: data.profile.address || '',
            city: data.profile.city || '',
            state: data.profile.state || '',
            zip: data.profile.zip || '',
          }));
          if (data.profile.cardLast4) {
            setSavedCard({
              cardBrand: data.profile.cardBrand,
              cardLast4: data.profile.cardLast4,
              cardExpMonth: data.profile.cardExpMonth,
              cardExpYear: data.profile.cardExpYear,
              cardHolder: data.profile.cardHolder,
            });
          }
        } else {
          setForm((prev) => ({
            ...prev,
            fullName: user.fullName || '',
            email: user.primaryEmailAddress?.emailAddress || '',
          }));
        }

        setSkinType(data.skinType || null);
      } catch (err) {
        console.error('Could not load account:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, user]);

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateCardNumber(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 16);
    update('cardNumber', formatCardNumber(digits));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaveState('saving');

    const digits = form.cardNumber.replace(/\D/g, '');
    const enteringNewCard = digits.length >= 4;

    try {
      const res = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fullName: form.fullName,
          email: form.email,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          // Only ever send a display-safe last 4 + brand + expiry.
          // The full number and CVC never leave this form.
          ...(enteringNewCard
            ? {
                cardHolder: form.cardHolder,
                cardBrand: detectCardBrand(digits),
                cardLast4: digits.slice(-4),
                cardExpMonth: form.cardExpMonth,
                cardExpYear: form.cardExpYear,
              }
            : {}),
        }),
      });
      if (!res.ok) throw new Error('Save failed');

      if (enteringNewCard) {
        setSavedCard({
          cardBrand: detectCardBrand(digits),
          cardLast4: digits.slice(-4),
          cardExpMonth: form.cardExpMonth,
          cardExpYear: form.cardExpYear,
          cardHolder: form.cardHolder,
        });
        setEditingCard(false);
        setForm((prev) => ({ ...prev, cardNumber: '', cardCvc: '' }));
      }

      setSaveState('saved');
    } catch (err) {
      console.error('Could not save account:', err);
      setSaveState('error');
    }
  }

  if (!isLoaded || loading) {
    return (
      <main className="page-wrap account-page">
        <div className="wrap account-wrap">
          <p className="account-footnote">Loading your account…</p>
        </div>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="page-wrap account-page">
        <div className="wrap account-wrap">
          <section className="account-intro">
            <img className="page-icon" src="/icons/gear.png" alt="" aria-hidden="true" />
            <span className="eyebrow">My Account</span>
            <h1>Log in to see your account.</h1>
            <p>Your saved address, payment details, and skin profile all live here once you're signed in.</p>
            <Link className="account-button" to="/login">Log in</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap account-page">
      <div className="wrap account-wrap">
        <section className="account-intro">
          <img className="page-icon" src="/icons/gear.png" alt="" aria-hidden="true" />
          <span className="eyebrow">My Account</span>
          <h1>Your account.</h1>
          <p>Manage the details Rue Botanicals uses to ship your orders and personalize your routine.</p>
        </section>

        <form className="account-form" onSubmit={handleSave}>

          <div className="account-card">
            <h2>Your name</h2>
            <div className="account-form-field">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                value={form.fullName}
                onChange={(e) => update('fullName', e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="account-form-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@email.com"
              />
            </div>
          </div>

          <div className="account-card">
            <h2>Shipping address</h2>
            <div className="account-form-field">
              <label htmlFor="address">Address</label>
              <input
                id="address"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="account-form-row">
              <div className="account-form-field">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  value={form.city}
                  onChange={(e) => update('city', e.target.value)}
                />
              </div>
              <div className="account-form-field">
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  value={form.state}
                  onChange={(e) => update('state', e.target.value)}
                />
              </div>
              <div className="account-form-field">
                <label htmlFor="zip">ZIP</label>
                <input
                  id="zip"
                  value={form.zip}
                  onChange={(e) => update('zip', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="account-card">
            <h2>Payment method</h2>
            <p className="account-card-note">
              Rue Botanicals hasn't launched checkout yet, so nothing here is charged. We only keep
              your card's brand, last 4 digits, and expiry for your reference — never the full number.
            </p>

            {savedCard && !editingCard ? (
              <div className="account-saved-card">
                <div className="account-saved-card-info">
                  <span className="account-card-brand">{savedCard.cardBrand}</span>
                  <span>•••• {savedCard.cardLast4}</span>
                  <span className="account-card-exp">Exp {savedCard.cardExpMonth}/{savedCard.cardExpYear}</span>
                </div>
                <button type="button" className="account-link-button" onClick={() => setEditingCard(true)}>
                  Replace card
                </button>
              </div>
            ) : (
              <>
                <div className="account-form-field">
                  <label htmlFor="cardHolder">Name on card</label>
                  <input
                    id="cardHolder"
                    value={form.cardHolder}
                    onChange={(e) => update('cardHolder', e.target.value)}
                  />
                </div>
                <div className="account-form-field">
                  <label htmlFor="cardNumber">Card number</label>
                  <input
                    id="cardNumber"
                    inputMode="numeric"
                    value={form.cardNumber}
                    onChange={(e) => updateCardNumber(e.target.value)}
                    placeholder="0000 0000 0000 0000"
                    autoComplete="cc-number"
                  />
                </div>
                <div className="account-form-row">
                  <div className="account-form-field">
                    <label htmlFor="cardExpMonth">Exp month</label>
                    <input
                      id="cardExpMonth"
                      inputMode="numeric"
                      maxLength={2}
                      value={form.cardExpMonth}
                      onChange={(e) => update('cardExpMonth', e.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder="MM"
                    />
                  </div>
                  <div className="account-form-field">
                    <label htmlFor="cardExpYear">Exp year</label>
                    <input
                      id="cardExpYear"
                      inputMode="numeric"
                      maxLength={2}
                      value={form.cardExpYear}
                      onChange={(e) => update('cardExpYear', e.target.value.replace(/\D/g, '').slice(0, 2))}
                      placeholder="YY"
                    />
                  </div>
                  <div className="account-form-field">
                    <label htmlFor="cardCvc">CVC</label>
                    <input
                      id="cardCvc"
                      inputMode="numeric"
                      maxLength={4}
                      value={form.cardCvc}
                      onChange={(e) => update('cardCvc', e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      autoComplete="cc-csc"
                    />
                  </div>
                </div>
                {savedCard && (
                  <button type="button" className="account-link-button" onClick={() => setEditingCard(false)}>
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>

          <div className="account-card">
            <h2>Skin type</h2>
            {skinType ? (
              <div className="account-skin-summary">
                <span className="account-skin-type">{skinType}</span>
                <Link className="account-link-button" to="/my-skin">Retake assessment</Link>
              </div>
            ) : (
              <div className="account-skin-summary">
                <p className="account-card-note">You haven't taken the skin assessment yet.</p>
                <Link className="account-link-button" to="/my-skin">Take the assessment</Link>
              </div>
            )}
          </div>

          <div className="account-save-row">
            <button className="account-button" type="submit" disabled={saveState === 'saving'}>
              {saveState === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
            {saveState === 'saved' && <span className="account-saved-note">Saved ✓</span>}
            {saveState === 'error' && <span className="account-saved-note error">Something went wrong — try again.</span>}
          </div>
        </form>
      </div>
    </main>
  );
}