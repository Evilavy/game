import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// On the server, it's best to use the SERVICE_ROLE_KEY to bypass RLS.
// Since you provided the ANON_KEY, we'll use that. Make sure your RLS
// policies on the 'scores' table allow insert/update for anonymous users.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const ANTI_CHEAT_SECRET_KEY = process.env.NEXT_PUBLIC_ANTI_CHEAT_SECRET_KEY;

if (!ANTI_CHEAT_SECRET_KEY) {
    throw new Error("La clé secrète anti-triche n'est pas définie dans les variables d'environnement.");
}

// Constantes de sécurité
const MAX_SCORE_PER_MINUTE = 900000;
const MIN_GAME_DURATION = 15000; // 15 secondes, synchronisé avec le client
const MAX_GAME_DURATION = 3600000; // 1 heure maximum

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('pseudo, score, end_time')
      .order('score', { ascending: false })

    if (error) throw error;

    if (data) {
      const winnerPseudo = "BAP";
      const winnerScore = data.find(s => s.pseudo === winnerPseudo);

      if (winnerScore) {
        const otherScores = data.filter(s => s.pseudo !== winnerPseudo);
        const finalScores = [winnerScore, ...otherScores];
        return NextResponse.json(finalScores);
      }
    }
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching scores:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pseudo, score, sessionToken, startTime, endTime, signature } = body;

    if (!pseudo || typeof pseudo !== 'string' || pseudo.length < 1 || pseudo.length > 3 || 
        !score || typeof score !== 'number' ||
        !sessionToken || typeof sessionToken !== 'string' ||
        !startTime || typeof startTime !== 'number' ||
        !endTime || typeof endTime !== 'number' ||
        !signature || typeof signature !== 'string') {
        return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    const expectedSignature = createHmac('sha256', ANTI_CHEAT_SECRET_KEY!)
      .update(`${score}|${sessionToken}|${startTime}|${endTime}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
    }
    
    const gameDuration = endTime - startTime;
    if (gameDuration < MIN_GAME_DURATION || gameDuration > MAX_GAME_DURATION) {
        return NextResponse.json({ message: 'Invalid game duration' }, { status: 400 });
    }

    const maxPossibleScore = Math.ceil((gameDuration / 60000) * MAX_SCORE_PER_MINUTE);
    if (score > maxPossibleScore) {
        return NextResponse.json({ message: 'Score exceeds maximum possible' }, { status: 400 });
    }

    const rpcParams = {
        player_pseudo: pseudo.toUpperCase(),
        new_score: score,
        session_token: sessionToken,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString()
    };
    
    const { error } = await supabase.rpc('update_score', rpcParams);

    if (error) {
        console.error("Erreur retournée par la fonction RPC Supabase:", error);
        throw error;
    }

    return NextResponse.json({ message: 'Score saved successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur globale dans le handler POST /api/scores:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
} 