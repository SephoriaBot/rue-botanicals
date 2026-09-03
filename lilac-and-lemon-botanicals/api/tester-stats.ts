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
        SELECT COUNT(*) AS checkins
        FROM tester_checkins tc
        JOIN testers t ON t.id = tc.tester_id
        WHERE t.user_id = ?
      `,
      args: [userId],
    });

    return res.status(200).json({
      checkins: Number(result.rows[0]?.checkins ?? 0),
    });
  } catch (err) {
    console.error('Tester stats lookup failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}