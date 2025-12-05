// Web_NFC/api/pay.js
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { cardUid, amount } = req.body; // amount は 消費ポイント（正の数で送る）

    if (!cardUid || typeof amount !== 'number') {
      return res.status(400).json({ error: 'cardUid and numeric amount are required' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'amount must be positive' });
    }

    // ユーザー取得
    const userResult = await sql`
      SELECT id FROM users WHERE card_uid = ${cardUid};
    `;

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'user not found' });
    }

    const userId = userResult.rows[0].id;

    // 現在残高チェック
    const balanceResult = await sql`
      SELECT COALESCE(SUM(amount), 0) AS balance
      FROM point_transactions
      WHERE user_id = ${userId};
    `;
    const currentBalance = balanceResult.rows[0].balance;

    if (currentBalance < amount) {
      return res.status(400).json({
        error: 'not enough balance',
        balance: currentBalance,
      });
    }

    // ポイント消費（マイナスとして記録）
    await sql`
      INSERT INTO point_transactions (user_id, amount, reason)
      VALUES (${userId}, ${-amount}, ${'payment'});
    `;

    // 新しい残高を再計算
    const newBalanceResult = await sql`
      SELECT COALESCE(SUM(amount), 0) AS balance
      FROM point_transactions
      WHERE user_id = ${userId};
    `;
    const newBalance = newBalanceResult.rows[0].balance;

    res.status(200).json({
      status: 'ok',
      used: amount,
      balance: newBalance,
    });
  } catch (err) {
    console.error('pay error:', err);
    res.status(500).json({ error: 'server error' });
  }
}
