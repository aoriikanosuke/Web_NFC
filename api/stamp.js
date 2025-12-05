// Web_NFC/api/stamp.js
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { cardUid, tagUid } = req.body;

    if (!cardUid || !tagUid) {
      return res.status(400).json({ error: 'cardUid and tagUid are required' });
    }

    // 1. ユーザーを取得 or 作成
    let userResult = await sql`
      SELECT id FROM users WHERE card_uid = ${cardUid};
    `;

    let userId;
    if (userResult.rows.length === 0) {
      const inserted = await sql`
        INSERT INTO users (card_uid)
        VALUES (${cardUid})
        RETURNING id;
      `;
      userId = inserted.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
    }

    // 2. NFCタグ情報取得
    const tagResult = await sql`
      SELECT id, point, name
      FROM nfc_tags
      WHERE uid = ${tagUid} AND tag_type = 'STAMP';
    `;

    if (tagResult.rows.length === 0) {
      return res.status(400).json({ error: 'invalid tagUid' });
    }

    const tag = tagResult.rows[0];

    // 3. 同じスタンプを二重取りしていないかチェック
    const stampCheck = await sql`
      SELECT id FROM stamps
      WHERE user_id = ${userId} AND tag_id = ${tag.id};
    `;

    if (stampCheck.rows.length > 0) {
      return res.status(400).json({ error: 'already stamped' });
    }

    // 4. stamps に登録
    const stampInsert = await sql`
      INSERT INTO stamps (user_id, tag_id)
      VALUES (${userId}, ${tag.id})
      RETURNING id;
    `;
    const stampId = stampInsert.rows[0].id;

    // 5. point_transactions に +ポイントを記録
    await sql`
      INSERT INTO point_transactions (user_id, amount, reason, related_stamp_id)
      VALUES (${userId}, ${tag.point}, ${tag.name || 'stamp'}, ${stampId});
    `;

    // 6. 現在残高を計算
    const balanceResult = await sql`
      SELECT COALESCE(SUM(amount), 0) AS balance
      FROM point_transactions
      WHERE user_id = ${userId};
    `;

    const balance = balanceResult.rows[0].balance;

    res.status(200).json({
      status: 'ok',
      added: tag.point,
      balance,
      message: `${tag.name || 'スタンプ'} を取得しました`,
    });
  } catch (err) {
    console.error('stamp error:', err);
    res.status(500).json({ error: 'server error' });
  }
}
