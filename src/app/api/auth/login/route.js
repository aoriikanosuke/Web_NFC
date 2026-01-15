import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  try {
    const { username, password } = await request.json();
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password_hash)) {
      const stampsResult = await pool.query(
        'SELECT stamp_id FROM user_stamps WHERE user_id = $1',
        [user.id]
      );
      const stamp_progress = stampsResult.rows.map((row) => row.stamp_id);
      const { password_hash, ...userData } = user;
      const response = NextResponse.json({ ...userData, stamp_progress });
      response.cookies.set('nfc_user_id', String(user.id), {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
      return response;
    }

    return NextResponse.json(
      { error: 'ユーザー名またはパスワードが間違っています。' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
