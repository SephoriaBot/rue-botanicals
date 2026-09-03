import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId =
    typeof req.query.userId === 'string'
      ? req.query.userId.trim()
      : '';

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const result = await turso.execute({
      sql: `
        SELECT
          id,
          user_id,
          name,
          status,
          test_start,
          test_end
        FROM testers
        WHERE user_id = ?
        LIMIT 1
      `,
      args: [userId],
    });

    const tester = result.rows[0];

    if (!tester) {
      return res.status(200).json({ tester: null });
    }

    return res.status(200).json({ tester });
  } catch (err) {
    console.error('Tester lookup failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}