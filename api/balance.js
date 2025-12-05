// Web_NFC/api/balance.js
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    const { cardUid } = req.query; // /api/balance?cardUid=xxxx

    if (!cardUid) {
      return res.status(400).json({ error: 'cardUid is required' });
    }

    // ユーザー取得（なければ残高0として返す）
    const userResult = await sql`
      SELECT id FROM users WHERE card_uid = ${cardUid};
    `;

    if (userResult.rows.length === 0) {
      return res.status(200).json({ balance: 0 });
    }

    const userId = userResult.rows[0].id;

    // トランザクションの合計で残高計算
    const balanceResult = await sql`
      SELECT COALESCE(SUM(amount), 0) AS balance
      FROM point_transactions
      WHERE user_id = ${userId};
    `;

    const balance = balanceResult.rows[0].balance;
    res.status(200).json({ balance });
  } catch (err) {
    console.error('balance error:', err);
    res.status(500).json({ error: 'server error' });
  }
}
