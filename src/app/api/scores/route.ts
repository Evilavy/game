import { Pool } from 'pg';
import { NextResponse } from 'next/server';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT pseudo, score FROM scores ORDER BY score DESC LIMIT 10'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching scores:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { pseudo, score } = await request.json();

    if (!pseudo || typeof pseudo !== 'string' || pseudo.length !== 3 || !score || typeof score !== 'number') {
        return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    const query = `
        INSERT INTO scores (pseudo, score)
        VALUES ($1, $2)
        ON CONFLICT (pseudo)
        DO UPDATE SET
            score = EXCLUDED.score,
            created_at = CURRENT_TIMESTAMP
        WHERE scores.score < EXCLUDED.score;
    `;

    await pool.query(query, [pseudo.toUpperCase(), score]);

    return NextResponse.json({ message: 'Score saved successfully' }, { status: 201 });
  } catch (error) {
    console.error('Error saving score:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 