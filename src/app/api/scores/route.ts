import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server';

// On the server, it's best to use the SERVICE_ROLE_KEY to bypass RLS.
// Since you provided the ANON_KEY, we'll use that. Make sure your RLS
// policies on the 'scores' table allow insert/update for anonymous users.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('pseudo, score')
      .order('score', { ascending: false })
      .limit(10)

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching scores:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { pseudo, score } = await request.json();

    if (!pseudo || typeof pseudo !== 'string' || pseudo.length !== 3 || !score || typeof score !== 'number') {
        return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    // Calling the PostgreSQL function `update_score`
    const { error } = await supabase.rpc('update_score', {
        player_pseudo: pseudo.toUpperCase(),
        new_score: score
    });

    if (error) throw error;

    return NextResponse.json({ message: 'Score saved successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving score:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
} 