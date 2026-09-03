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
    const { userId, ...blobRequest } = req.body ?? {};

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const response = await handleUpload({
      body: blobRequest,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 10 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // The photo record will be created separately
        // after the upload succeeds.
      },
    });

    return res.status(200).json(response);
  } catch (err) {
    console.error('Tester photo upload failed:', err);

    return res.status(500).json({
      error: 'Something went wrong preparing the upload.',
    });
  }
}