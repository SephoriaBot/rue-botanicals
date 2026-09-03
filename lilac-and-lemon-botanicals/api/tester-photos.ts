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
        SELECT id, user_id, name, status
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

    if (req.method === 'GET') {
      const result = await turso.execute({
        sql: `
          SELECT
            id,
            photo_type,
            image_url,
            uploaded_at
          FROM tester_photos
          WHERE tester_id = ?
          ORDER BY uploaded_at DESC
        `,
        args: [tester.id],
      });

      return res.status(200).json({
        photos: result.rows,
      });
    }

    const { photoType, imageUrl } = req.body ?? {};

    if (!['baseline', 'progress'].includes(photoType)) {
      return res.status(400).json({
        error: 'Invalid photo type.',
      });
    }

    if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
      return res.status(400).json({
        error: 'Image URL is required.',
      });
    }

    const result = await turso.execute({
      sql: `
        INSERT INTO tester_photos (
          tester_id,
          photo_type,
          image_url
        )
        VALUES (?, ?, ?)
      `,
      args: [
        tester.id,
        photoType,
        imageUrl.trim(),
      ],
    });

    return res.status(200).json({
      ok: true,
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error('Tester photos request failed:', err);

    return res.status(500).json({
      error: 'Something went wrong.',
    });
  }
}