import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body as { email?: string };

  if (!email || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await turso.execute({
      sql: `
        SELECT id, email, name, status, test_start, test_end
        FROM testers
        WHERE email = ?
        LIMIT 1
      `,
      args: [normalizedEmail],
    });

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'That email is not registered as a tester.',
      });
    }

    const tester = result.rows[0];

    if (tester.status !== 'active') {
      return res.status(403).json({
        error: 'Your tester account is not currently active.',
      });
    }

    return res.status(200).json({
      ok: true,
      tester,
    });
  } catch (err) {
    console.error('Tester login failed:', err);
    return res.status(500).json({
      error: 'Something went wrong.',
    });
  }
}