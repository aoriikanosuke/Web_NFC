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
      const { password_hash, ...userData } = user;
      return NextResponse.json(userData);
    } else {
      return NextResponse.json({ error: 'ユーザー名またはパスワードが正しくありません。' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}