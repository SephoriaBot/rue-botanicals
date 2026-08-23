import { useState } from 'react';

export default function FollowForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('done');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="follow">
      <div className="wrap">
        <img className="follow-icon" src="/icons/envelope.png" alt="" aria-hidden="true" />
        <span className="label">Stay Close</span>
        <h2>Be here when the doors open.</h2>
        <p>Leave your email and you'll be the first to know when the shop goes live.</p>
        <form className="follow-form" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="your@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" disabled={status === 'sending'}>
            {status === 'done' ? 'Added ♡' : status === 'sending' ? 'Adding…' : 'Notify me'}
          </button>
        </form>
        <p className="follow-note">
          {status === 'error' ? 'Something went wrong — try again in a moment.' : 'no spam, just news when there\'s actually news'}
        </p>
      </div>
    </section>
  );
}
