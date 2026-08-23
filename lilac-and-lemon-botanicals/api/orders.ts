import type { VercelRequest, VercelResponse } from '@vercel/node';
import { turso } from '../src/lib/turso.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OrderItem = { id: number; name: string; price: number; quantity: number };

type OrderPayload = {
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  items?: OrderItem[];
  subtotal?: number;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, address, city, state, zip, notes, items, subtotal } =
    req.body as OrderPayload;

  if (!name || !email || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid name and email' });
  }
  if (!address || !city || !state || !zip) {
    return res.status(400).json({ error: 'Please complete the shipping address' });
  }
  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }

  try {
    await turso.execute({
      sql: `INSERT INTO orders (name, email, address, city, state, zip, notes, items_json, subtotal, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'reserved')`,
      args: [
        name.trim(),
        email.trim().toLowerCase(),
        address.trim(),
        city.trim(),
        state.trim(),
        zip.trim(),
        (notes ?? '').trim(),
        JSON.stringify(items),
        subtotal ?? 0,
      ],
    });
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('Order insert failed:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}
