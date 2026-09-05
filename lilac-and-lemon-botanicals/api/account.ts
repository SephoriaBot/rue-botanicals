import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';

type ProfilePayload = {
  userId?: string;
  fullName?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  cardHolder?: string;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: string;
  cardExpYear?: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    try {
      const [profileResult, skinResult] = await Promise.all([
        turso.execute({
          sql: `SELECT full_name, email, address, city, state, zip,
                       card_brand, card_last4, card_exp_month, card_exp_year, card_holder
                FROM account_profiles WHERE user_id = ?`,
          args: [userId],
        }),
        turso.execute({
          sql: 'SELECT result, updated_at FROM skin_assessments WHERE user_id = ?',
          args: [userId],
        }),
      ]);

      const profileRow = profileResult.rows[0];
      const skinRow = skinResult.rows[0];

      return res.status(200).json({
        profile: profileRow
          ? {
              fullName: profileRow.full_name ?? '',
              email: profileRow.email ?? '',
              address: profileRow.address ?? '',
              city: profileRow.city ?? '',
              state: profileRow.state ?? '',
              zip: profileRow.zip ?? '',
              cardHolder: profileRow.card_holder ?? '',
              cardBrand: profileRow.card_brand ?? '',
              cardLast4: profileRow.card_last4 ?? '',
              cardExpMonth: profileRow.card_exp_month ?? '',
              cardExpYear: profileRow.card_exp_year ?? '',
            }
          : null,
        skinType: skinRow ? JSON.parse(skinRow.result as string).title : null,
      });
    } catch (err) {
      console.error('Account fetch failed:', err);
      return res.status(500).json({ error: 'Something went wrong' });
    }
  }

  if (req.method === 'POST') {
    const {
      userId,
      fullName,
      email,
      address,
      city,
      state,
      zip,
      cardHolder,
      cardBrand,
      cardLast4,
      cardExpMonth,
      cardExpYear,
    } = req.body as ProfilePayload;

    if (!userId) return res.status(400).json({ error: 'Missing userId' });

    // Defense in depth: never persist anything that looks like a full card
    // number or a CVC, even if a future client bug sends one. Only a
    // last-4 digit string is accepted here.
    const safeLast4 = cardLast4 && /^\d{4}$/.test(cardLast4) ? cardLast4 : null;

    try {
      await turso.execute({
        sql: `
          INSERT INTO account_profiles
            (user_id, full_name, email, address, city, state, zip,
             card_holder, card_brand, card_last4, card_exp_month, card_exp_year, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET
            full_name = excluded.full_name,
            email = excluded.email,
            address = excluded.address,
            city = excluded.city,
            state = excluded.state,
            zip = excluded.zip,
            card_holder = excluded.card_holder,
            card_brand = excluded.card_brand,
            card_last4 = excluded.card_last4,
            card_exp_month = excluded.card_exp_month,
            card_exp_year = excluded.card_exp_year,
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [
          userId,
          fullName ?? null,
          email ?? null,
          address ?? null,
          city ?? null,
          state ?? null,
          zip ?? null,
          cardHolder ?? null,
          cardBrand ?? null,
          safeLast4,
          cardExpMonth ?? null,
          cardExpYear ?? null,
        ],
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Account save failed:', err);
      return res.status(500).json({ error: 'Something went wrong' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}