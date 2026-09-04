import type { VercelRequest, VercelResponse } from '@vercel/node';
import { del } from '@vercel/blob';
import { handleUpload } from '@vercel/blob/client';
import { turso } from '../../src/lib/turso.js';

// Consolidated tester endpoints. All /api/tester-* routes were merged here
// (api/tester/[action].ts) to stay under Vercel's Hobby-plan function limit.
// Dispatch is by the `action` route param, e.g. /api/tester/checkin

function getWeekNumber(testStart: unknown): number {
  if (!testStart) return 1;

  const start = new Date(String(testStart));

  if (Number.isNaN(start.getTime())) return 1;

  const diffDays = Math.floor((Date.now() - start.getTime()) / 86400000);

  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const action =
    typeof req.query.action === 'string' ? req.query.action : '';

  switch (action) {
    case 'profile':
      return handleProfile(req, res);
    case 'login':
      return handleLogin(req, res);
    case 'checkin':
      return handleCheckin(req, res);
    case 'photo-upload':
      return handlePhotoUpload(req, res);
    case 'photos':
      return handlePhotos(req, res);
    case 'products':
      return handleProducts(req, res);
    case 'stats':
      return handleStats(req, res);
    case 'questionnaire':
      return handleQuestionnaire(req, res);
    default:
      return res.status(404).json({ error: 'Unknown tester endpoint.' });
  }
}

// GET /api/tester/profile?userId=
async function handleProfile(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId =
    typeof req.query.userId === 'string' ? req.query.userId.trim() : '';

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

// POST /api/tester/login
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleLogin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body as { email?: string };

  if (!email || !EMAIL_RE.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const result = await turso.execute({
      sql: `
        SELECT id, email, name, status, test_start, test_end
        FROM testers
        WHERE email = ?
        LIMIT 1
      `,
      args: [normalizedEmail],
    });

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: 'That email is not registered as a tester.',
      });
    }

    const tester = result.rows[0];

    if (tester.status !== 'active') {
      return res.status(403).json({
        error: 'Your tester account is not currently active.',
      });
    }

    return res.status(200).json({
      ok: true,
      tester,
    });
  } catch (err) {
    console.error('Tester login failed:', err);
    return res.status(500).json({
      error: 'Something went wrong.',
    });
  }
}

// GET/POST /api/tester/checkin
async function handleCheckin(req: VercelRequest, res: VercelResponse) {
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
    return res.status(400).json({ error: 'User ID is required.' });
  }

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
      sql: `
        SELECT id, user_id, email, name, status, test_start, test_end
        FROM testers
        WHERE user_id = ?
        LIMIT 1
      `,
      args: [userId],
    });

    if (testerResult.rows.length === 0) {
      return res.status(403).json({
        error: 'Your account is not currently enrolled as a tester.',
      });
    }

    const tester = testerResult.rows[0];

    if (tester.status !== 'active') {
      return res.status(403).json({
        error: 'Your tester enrollment is not currently active.',
      });
    }

    const weekNumber = getWeekNumber(tester.test_start);

    if (req.method === 'GET') {
      const result = await turso.execute({
        sql: `
          SELECT
            id,
            tester_id,
            week_number,
            after_use_feel,
            daytime_feel,
            hydration,
            breakouts,
            sensitivity,
            notes,
            submitted_at
          FROM tester_checkins
          WHERE tester_id = ?
            AND week_number = ?
          LIMIT 1
        `,
        args: [tester.id, weekNumber],
      });

      return res.status(200).json({
        tester,
        weekNumber,
        checkin: result.rows[0] ?? null,
      });
    }

    const {
      afterUseFeel,
      daytimeFeel,
      hydration,
      breakouts,
      sensitivity,
      notes,
    } = req.body ?? {};

    const validFeels = ['dry_tight', 'comfortable', 'oily'];

    const validScore = (value: unknown) => {
      if (typeof value !== 'number') return false;
      return Number.isInteger(value) && value >= 1 && value <= 5;
    };

    if (
      !validFeels.includes(afterUseFeel) ||
      !validFeels.includes(daytimeFeel)
    ) {
      return res.status(400).json({
        error: 'Please answer both skin-feel questions.',
      });
    }

    if (
      !validScore(hydration) ||
      !validScore(breakouts) ||
      !validScore(sensitivity)
    ) {
      return res.status(400).json({
        error:
          'Please rate hydration, breakouts, and sensitivity from 1 to 5.',
      });
    }

    await turso.execute({
      sql: `
        INSERT INTO tester_checkins
          (
            tester_id,
            week_number,
            after_use_feel,
            daytime_feel,
            hydration,
            breakouts,
            sensitivity,
            notes
          )
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
      args: [
        tester.id,
        weekNumber,
        afterUseFeel,
        daytimeFeel,
        hydration,
        breakouts,
        sensitivity,
        typeof notes === 'string' ? notes.trim() || null : null,
      ],
    });

    return res.status(200).json({
      ok: true,
      weekNumber,
    });
  } catch (err) {
    console.error('Tester check-in failed:', err);

    return res.status(500).json({
      error: 'Something went wrong saving your check-in.',
    });
  }
}

// POST /api/tester/photo-upload (Vercel Blob client upload handshake)
async function handlePhotoUpload(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = clientPayload ? JSON.parse(clientPayload) : {};

        const userId =
          typeof payload?.userId === 'string' ? payload.userId.trim() : '';

        if (!userId) {
          throw new Error('Missing userId');
        }

        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            userId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Tester photo uploaded:', blob.url, tokenPayload);
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (err) {
    console.error('Tester photo upload failed:', err);
    return res.status(400).json({
      error: err instanceof Error ? err.message : 'Something went wrong.',
    });
  }
}

// GET/POST/DELETE /api/tester/photos
async function handlePhotos(req: VercelRequest, res: VercelResponse) {
  if (
    req.method !== 'GET' &&
    req.method !== 'POST' &&
    req.method !== 'DELETE'
  ) {
    res.setHeader('Allow', 'GET, POST, DELETE');
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

    // DELETE PHOTO
    if (req.method === 'DELETE') {
      const photoId = Number(req.body?.photoId);

      if (!Number.isInteger(photoId) || photoId <= 0) {
        return res.status(400).json({
          error: 'Invalid photo ID.',
        });
      }

      const photoResult = await turso.execute({
        sql: `
          SELECT id, image_url
          FROM tester_photos
          WHERE id = ?
            AND tester_id = ?
          LIMIT 1
        `,
        args: [photoId, tester.id],
      });

      const photo = photoResult.rows[0];

      if (!photo) {
        return res.status(404).json({
          error: 'Photo not found.',
        });
      }

      // Delete the actual image from Vercel Blob
      await del(String(photo.image_url));

      // Delete the photo record from Turso
      await turso.execute({
        sql: `
          DELETE FROM tester_photos
          WHERE id = ?
            AND tester_id = ?
        `,
        args: [photoId, tester.id],
      });

      return res.status(200).json({
        ok: true,
      });
    }

    // GET PHOTOS
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

    // POST PHOTO
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
      args: [tester.id, photoType, imageUrl.trim()],
    });

    return res.status(200).json({
      ok: true,
      id: Number(result.lastInsertRowid),
    });
  } catch (err) {
    console.error('Tester photos request failed:', err);

    return res.status(500).json({
      error: 'Something went wrong.',
    });
  }
}

// GET /api/tester/products?userId=
async function handleProducts(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId =
    typeof req.query.userId === 'string' ? req.query.userId.trim() : '';

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

// GET /api/tester/stats?userId=
async function handleStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId =
    typeof req.query.userId === 'string' ? req.query.userId.trim() : '';

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    const result = await turso.execute({
      sql: `
        SELECT
          (
            SELECT COUNT(*)
            FROM tester_checkins tc
            WHERE tc.tester_id = t.id
          ) AS checkins,
          (
            SELECT COUNT(*)
            FROM tester_photos tp
            WHERE tp.tester_id = t.id
          ) AS photos
        FROM testers t
        WHERE t.user_id = ?
        LIMIT 1
      `,
      args: [userId],
    });

    return res.status(200).json({
      checkins: Number(result.rows[0]?.checkins ?? 0),
      photos: Number(result.rows[0]?.photos ?? 0),
    });
  } catch (err) {
    console.error('Tester stats lookup failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

// GET/POST /api/tester/questionnaire?userId=
async function handleQuestionnaire(req: VercelRequest, res: VercelResponse) {
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
      args: [tester.id, JSON.stringify(answers)],
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
