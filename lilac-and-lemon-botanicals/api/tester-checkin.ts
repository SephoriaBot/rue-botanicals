import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';

function getWeekNumber(testStart: unknown): number {
  if (!testStart) return 1;
  const start = new Date(String(testStart));
  if (Number.isNaN(start.getTime())) return 1;
  const diffDays = Math.floor((Date.now() - start.getTime()) / 86400000);
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = typeof req.query.email === 'string'
    ? req.query.email.trim().toLowerCase()
    : typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

  if (!email) return res.status(400).json({ error: 'Tester email is required.' });

  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS tester_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tester_id INTEGER NOT NULL,
        week_number INTEGER NOT NULL,
        after_use_feel TEXT NOT NULL,
        daytime_feel TEXT NOT NULL,
        hydration INTEGER NOT NULL,
        breakouts INTEGER NOT NULL,
        sensitivity INTEGER NOT NULL,
        notes TEXT,
        submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tester_id, week_number)
      )
    `);

    const testerResult = await turso.execute({
      sql: `SELECT id, email, name, status, test_start, test_end FROM testers WHERE email = ? LIMIT 1`,
      args: [email],
    });

    if (testerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Your account is not registered as a tester.' });
    }

    const tester = testerResult.rows[0];
    if (tester.status !== 'active') {
      return res.status(403).json({ error: 'Your tester account is not currently active.' });
    }

    const weekNumber = getWeekNumber(tester.test_start);

    if (req.method === 'GET') {
      const result = await turso.execute({
        sql: `SELECT id, tester_id, week_number, after_use_feel, daytime_feel, hydration, breakouts, sensitivity, notes, submitted_at FROM tester_checkins WHERE tester_id = ? AND week_number = ? LIMIT 1`,
        args: [tester.id, weekNumber],
      });
      return res.status(200).json({ tester, weekNumber, checkin: result.rows[0] ?? null });
    }

    const { afterUseFeel, daytimeFeel, hydration, breakouts, sensitivity, notes } = req.body ?? {};
    const validFeels = ['dry_tight', 'comfortable', 'oily'];
    const validScore = (value: unknown) => Number.isInteger(value) && value >= 1 && value <= 5;

    if (!validFeels.includes(afterUseFeel) || !validFeels.includes(daytimeFeel)) {
      return res.status(400).json({ error: 'Please answer both skin-feel questions.' });
    }
    if (!validScore(hydration) || !validScore(breakouts) || !validScore(sensitivity)) {
      return res.status(400).json({ error: 'Please rate hydration, breakouts, and sensitivity from 1 to 5.' });
    }

    await turso.execute({
      sql: `
        INSERT INTO tester_checkins
          (tester_id, week_number, after_use_feel, daytime_feel, hydration, breakouts, sensitivity, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(tester_id, week_number) DO UPDATE SET
          after_use_feel = excluded.after_use_feel,
          daytime_feel = excluded.daytime_feel,
          hydration = excluded.hydration,
          breakouts = excluded.breakouts,
          sensitivity = excluded.sensitivity,
          notes = excluded.notes,
          submitted_at = CURRENT_TIMESTAMP
      `,
      args: [tester.id, weekNumber, afterUseFeel, daytimeFeel, hydration, breakouts, sensitivity, typeof notes === 'string' ? notes.trim() || null : null],
    });

    return res.status(200).json({ ok: true, weekNumber });
  } catch (err) {
    console.error('Tester check-in failed:', err);
    return res.status(500).json({ error: 'Something went wrong saving your check-in.' });
  }
}
