import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function POST(request) {
  console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
  try {
    const { username, password } = await request.json();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, points',
      [username, hashedPassword]
    );
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'ユーザー名が既に存在するか、無効な入力です。' }, { status: 400 });
  }
}