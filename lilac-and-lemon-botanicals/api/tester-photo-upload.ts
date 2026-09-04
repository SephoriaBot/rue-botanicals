import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload } from '@vercel/blob/client';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string'
  ? JSON.parse(req.body)
  : req.body;

    const userId =
      typeof body?.userId === 'string'
        ? body.userId.trim()
        : '';

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId',
      });
    }

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: [
            'image/jpeg',
            'image/png',
            'image/webp',
          ],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log(
          'Tester photo uploaded:',
          blob.url,
          tokenPayload
        );
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('Tester photo upload failed:', err);

    return res.status(400).json({
      error:
        err instanceof Error
          ? err.message
          : 'Something went wrong.',
    });
  }
}