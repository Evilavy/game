import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server';

// On the server, it's best to use the SERVICE_ROLE_KEY to bypass RLS.
// Since you provided the ANON_KEY, we'll use that. Make sure your RLS
// policies on the 'scores' table allow insert/update for anonymous users.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Constantes de sécurité
// const MAX_SCORE_PER_MINUTE = 2000; // Vérification désactivée
const MIN_GAME_DURATION = 15000; // 15 secondes, synchronisé avec le client
const MAX_GAME_DURATION = 3600000; // 1 heure maximum

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('pseudo, score, end_time')
      .order('score', { ascending: false })

    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching scores:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("Requête reçue sur /api/scores:", body);
    const { pseudo, score, sessionToken, startTime, endTime } = body;

    // Validation des entrées
    if (!pseudo || typeof pseudo !== 'string' || pseudo.length < 1 || pseudo.length > 3 || 
        !score || typeof score !== 'number' ||
        !sessionToken || typeof sessionToken !== 'string' ||
        !startTime || typeof startTime !== 'number' ||
        !endTime || typeof endTime !== 'number') {
        console.log("Validation échouée: Données d'entrée invalides.");
        return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    // Vérification de la durée de la partie
    const gameDuration = endTime - startTime;
    console.log(`Durée de la partie calculée: ${gameDuration}ms`);
    if (gameDuration < MIN_GAME_DURATION || gameDuration > MAX_GAME_DURATION) {
        console.log("Validation échouée: Durée de partie invalide.");
        return NextResponse.json({ message: 'Invalid game duration' }, { status: 400 });
    }

    /* Vérification du score maximum possible - Désactivée
    const maxPossibleScore = Math.ceil((gameDuration / 60000) * MAX_SCORE_PER_MINUTE);
    console.log(`Score soumis: ${score}, Score max possible calculé: ${maxPossibleScore}`);
    if (score > maxPossibleScore) {
        console.log("Validation échouée: Le score dépasse le maximum possible.");
        return NextResponse.json({ message: 'Score exceeds maximum possible' }, { status: 400 });
    }
    */

    // Appel de la fonction PostgreSQL update_score avec les vérifications
    const rpcParams = {
        player_pseudo: pseudo.toUpperCase(),
        new_score: score,
        session_token: sessionToken,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString()
    };
    console.log("Appel de la fonction RPC 'update_score' avec les paramètres:", rpcParams);
    
    const { error } = await supabase.rpc('update_score', rpcParams);

    if (error) {
        console.error("Erreur retournée par la fonction RPC Supabase:", error);
        throw error;
    }

    console.log("Score enregistré avec succès !");
    return NextResponse.json({ message: 'Score saved successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur globale dans le handler POST /api/scores:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
} 