import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId =
    typeof req.query.userId === 'string'
      ? req.query.userId.trim()
      : typeof req.body?.userId === 'string'
        ? req.body.userId.trim()
        : '';

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const testerResult = await turso.execute({
      sql: `
        SELECT id, status
        FROM testers
        WHERE user_id = ?
        LIMIT 1
      `,
      args: [userId],
    });

    const tester = testerResult.rows[0];

    if (!tester) {
      return res.status(403).json({
        error: 'Your account is not enrolled as a tester.',
      });
    }

    if (tester.status !== 'active') {
      return res.status(403).json({
        error: 'Your tester enrollment is not currently active.',
      });
    }

    // GET existing questionnaire
    if (req.method === 'GET') {
      const result = await turso.execute({
        sql: `
          SELECT answers, completed_at, updated_at
          FROM tester_questionnaires
          WHERE tester_id = ?
          LIMIT 1
        `,
        args: [tester.id],
      });

      const row = result.rows[0];

      if (!row) {
        return res.status(200).json({
          questionnaire: null,
        });
      }

      return res.status(200).json({
        questionnaire: {
          answers: JSON.parse(String(row.answers)),
          completedAt: row.completed_at,
          updatedAt: row.updated_at,
        },
      });
    }

    // SAVE questionnaire
    const answers = req.body?.answers;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        error: 'Questionnaire answers are required.',
      });
    }

    await turso.execute({
      sql: `
        INSERT INTO tester_questionnaires (
          tester_id,
          answers,
          completed_at,
          updated_at
        )
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT(tester_id) DO UPDATE SET
          answers = excluded.answers,
          updated_at = CURRENT_TIMESTAMP
      `,
      args: [
        tester.id,
        JSON.stringify(answers),
      ],
    });

    return res.status(200).json({
      ok: true,
    });
  } catch (err) {
    console.error('Tester questionnaire request failed:', err);

    return res.status(500).json({
      error: 'Something went wrong.',
    });
  }
}