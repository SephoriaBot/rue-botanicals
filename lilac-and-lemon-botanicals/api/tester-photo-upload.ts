import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { turso } from '../src/lib/turso.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
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

    if (!tester || tester.status !== 'active') {
      return res.status(403).json({
        error: 'Your tester account is not active.',
      });
    }

    const chunks: Buffer[] = [];

    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const body = Buffer.concat(chunks);

    if (!body.length) {
      return res.status(400).json({
        error: 'No image was provided.',
      });
    }

    const fileName = `tester-${tester.id}-${Date.now()}.jpg`;

    const blob = await put(
      `tester-photos/${fileName}`,
      body,
      {
        access: 'public',
        contentType: 'image/jpeg',
      }
    );

    return res.status(200).json({
      ok: true,
      url: blob.url,
    });
  } catch (err) {
    console.error('Tester photo upload failed:', err);

    return res.status(500).json({
      error: 'Something went wrong uploading the photo.',
    });
  }
}