import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const result = await turso.execute({
        sql: 'SELECT answers, result, updated_at FROM skin_assessments WHERE user_id = ?',
        args: [userId],
      });

      const row = result.rows[0];
      if (!row) return res.status(200).json({ assessment: null });

      return res.status(200).json({
        assessment: {
          answers: JSON.parse(row.answers as string),
          result: JSON.parse(row.result as string),
          updatedAt: row.updated_at,
        },
      });
    } catch (err) {
      console.error('Skin assessment fetch failed:', err);
      return res.status(500).json({ error: 'Something went wrong' });
    }
  }

  if (req.method === 'POST') {
    const { userId, answers, result } = req.body as {
      userId?: string;
      answers?: unknown;
      result?: unknown;
    };

    if (!userId || !answers || !result) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    try {
      await turso.execute({
        sql: `
          INSERT INTO skin_assessments (user_id, answers, result, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET
            answers = excluded.answers,
            result = excluded.result,
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [userId, JSON.stringify(answers), JSON.stringify(result)],
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Skin assessment save failed:', err);
      return res.status(500).json({ error: 'Something went wrong' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}