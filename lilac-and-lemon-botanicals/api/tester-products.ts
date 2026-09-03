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
          tp.id AS assignment_id,
          p.id,
          p.name,
          p.description,
          p.swatch_color,
          p.size_oz,
          p.price
        FROM tester_products tp
        JOIN testers t ON t.id = tp.tester_id
        JOIN products p ON p.id = tp.product_id
        WHERE t.user_id = ?
        ORDER BY p.sort_order
      `,
      args: [userId],
    });

    return res.status(200).json({
      products: result.rows,
    });
  } catch (err) {
    console.error('Tester products lookup failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}