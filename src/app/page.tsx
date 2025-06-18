"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import Game, { ScoreData } from '@/components/Game';
import Image from 'next/image';

type GameState = 'home' | 'playing' | 'gameover' | 'leaderboard';
type Score = { pseudo: string, score: number, end_time?: string };

const containerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100vh',
  width: '100vw',
  color: 'white',
  fontFamily: 'monospace',
  textAlign: 'center',
  position: 'relative',
  overflow: 'hidden',
};

const backgroundStyles: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: -2,
};

const overlayStyles: React.CSSProperties = {
    ...backgroundStyles,
    backgroundColor: 'rgba(26, 32, 44, 0.7)',
    zIndex: -1,
};

const buttonStyles: React.CSSProperties = {
    padding: '1rem 2rem',
    fontSize: '1.5rem',
    cursor: 'pointer',
    border: '2px solid white',
    background: 'transparent',
    color: 'white',
    borderRadius: '5px',
    transition: 'all 0.3s ease',
    margin: '0.5rem'
};

const HomePage = ({ onPlay, onShowLeaderboard }: { onPlay: () => void, onShowLeaderboard: () => void }) => {
    const [topScore, setTopScore] = useState<Score | null>(null);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const fetchTopScore = async () => {
            try {
                const res = await fetch('/api/scores');
                if (res.ok) {
                    const scores: Score[] = await res.json();
                    if (scores.length > 0) {
                        setTopScore(scores[0]);
                    }
                }
            } catch (error) {
                console.error("Could not fetch top score", error);
            }
        };
        fetchTopScore();

        const calculateTimeLeft = () => {
            const now = new Date();
            const deadline = new Date();
            const currentDay = now.getDay(); // Dimanche = 0, Vendredi = 5

            const daysUntilFriday = (5 - currentDay + 7) % 7;
            deadline.setDate(now.getDate() + daysUntilFriday);
            deadline.setHours(17, 30, 0, 0); // Vendredi 17h30

            const difference = deadline.getTime() - now.getTime();

            if (difference > 0) {
                const days = Math.floor(difference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((difference / 1000 / 60) % 60);
                const seconds = Math.floor((difference / 1000) % 60);
                return `${days}j ${hours}h ${minutes}m ${seconds}s`;
            } else {
                return "Le défi est terminé !";
            }
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);
        
        setTimeLeft(calculateTimeLeft()); // Appel initial

        return () => clearInterval(timer);
    }, []);

    return (
        <div style={containerStyles}>
            <Image src="/Bureau-Infernale.png" alt="Background" fill style={{ objectFit: 'cover', zIndex: -2 }} />
            <div style={overlayStyles}></div>
            <div style={{ position: 'relative', zIndex: 1, padding: '0 20px' }}>
                <h1 style={{ fontSize: '4rem', marginBottom: '1rem', textShadow: '2px 2px 4px #000' }}>
                    Bureau de l&apos;Enfer
                </h1>
                
                <div style={{
                    border: '2px solid #38B2AC',
                    padding: '1rem',
                    borderRadius: '10px',
                    background: 'rgba(56, 178, 172, 0.1)',
                    marginBottom: '1.5rem',
                    maxWidth: '500px',
                    margin: '0 auto 1.5rem auto'
                }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#38B2AC' }}>
                        À la conquête de la canette ! 🥤
                    </h2>
                    <p style={{ fontSize: '1.2rem', margin: '0.5rem 0', color: 'white' }}>
                        Le meilleur score vendredi à 17h30 gagne la boisson de son choix.
                    </p>
                    <p style={{ fontSize: '1.8rem', margin: '0.5rem 0', color: 'white', fontWeight: 'bold', letterSpacing: '2px' }}>
                        {timeLeft}
                    </p>
                </div>

                {topScore && (
                    <div style={{
                        border: '2px solid #ffd700',
                        padding: '1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 215, 0, 0.1)',
                        marginBottom: '2rem',
                        maxWidth: '400px',
                        margin: '0 auto 2rem auto'
                    }}>
                        <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#ffd700' }}>
                            🏆 Employé du moment 🏆
                        </h2>
                        <p style={{ fontSize: '2rem', margin: '0.5rem 0', color: 'white', fontWeight: 'bold' }}>
                            {topScore.pseudo} - {topScore.score.toLocaleString()} pts
                        </p>
                    </div>
                )}

                <div style={{
                    background: 'rgba(255, 235, 59, 0.1)',
                    border: '1px solid rgba(255, 235, 59, 0.5)',
                    borderRadius: '8px',
                    padding: '15px',
                    marginTop: '20px',
                    color: '#fff',
                    textAlign: 'center'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', color: '#FFEB3B' }}>⚠️ Mise à jour importante</h3>
                    <p style={{ margin: 0 }}>
                        Avec l'ajout du nouvel atout "Pet Toxique" et suite à des activités de triche, le classement a été réinitialisé pour garantir une compétition équitable. Bonne chance à tous !
                    </p>
                </div>

                <div>
                    <button style={buttonStyles} onClick={onPlay}>JOUER</button>
                    <button style={buttonStyles} onClick={onShowLeaderboard}>CLASSEMENT</button>
                </div>
            </div>
        </div>
    );
};

const TAUNT_MESSAGES = [
    "Pas de canette pour toi ! {topPlayer} ne l'aurait pas ratée, celle-là.",
    "Encore un effort ! Ou pas. {topPlayer} sirote déjà sa victoire (et bientôt une canette).",
    "Ce n'est pas avec ce score que tu vas étancher ta soif. Demande des conseils à {topPlayer}.",
    "Tu as été 'burnout' avant même d'atteindre le distributeur. {topPlayer} est toujours en tête.",
    "Ouch. {topPlayer} a fait ce score en dormant. La canette s'éloigne...",
    "Rêver d'une canette, c'est bien. L'obtenir, c'est le travail de {topPlayer}.",
    "Score insuffisant. Veuillez insérer plus de 'skill' pour débloquer la canette. {topPlayer} l'a fait.",
    "La machine à café est en panne, et visiblement, ton talent aussi. Pas comme {topPlayer}.",
    "On dirait que tu vas rester hydraté à l'eau du robinet. La canette est pour {topPlayer}.",
    "{topPlayer} doit bien rire en voyant ton score. Essaie encore, peut-être ?"
];

const GameOverScreen = ({ score, onLeaderboard }: { score: ScoreData | number, onLeaderboard: () => void }) => {
    const [pseudo, setPseudo] = useState('');
    const [error, setError] = useState('');
    const [topScore, setTopScore] = useState<Score | null>(null);
    const [taunt, setTaunt] = useState('');
    const displayScore = typeof score === 'number' ? score : score.score;

    useEffect(() => {
        const fetchTopScore = async () => {
            try {
                const res = await fetch('/api/scores');
                if (res.ok) {
                    const scores: Score[] = await res.json();
                    if (scores.length > 0) {
                        const top = scores[0];
                        setTopScore(top);

                        // Sélectionner une moquerie si le score n'est pas battu
                        if (displayScore < top.score) {
                            const randomIndex = Math.floor(Math.random() * TAUNT_MESSAGES.length);
                            const randomTaunt = TAUNT_MESSAGES[randomIndex].replace('{topPlayer}', top.pseudo);
                            setTaunt(randomTaunt);
                        }
                    }
                }
            } catch (error) {
                console.error("Could not fetch top score", error);
            }
        };
        fetchTopScore();
    }, [displayScore]);

    const handlePseudoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Autorise uniquement les lettres, et jusqu'à 10 caractères
        if (/^[a-zA-Z]*$/.test(value) && value.length <= 10) {
            setPseudo(value.toUpperCase());
            setError('');
        } else {
            setError('Uniquement 10 lettres autorisées (A-Z).');
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (pseudo.length < 3 || pseudo.length > 10 || !/^[a-zA-Z]+$/.test(pseudo) || typeof score === 'number') {
            setError('Le pseudo doit contenir entre 3 et 10 lettres (A-Z).');
            return;
        }

        const payload = { pseudo, score: score.score, sessionToken: score.sessionToken, startTime: score.startTime, endTime: score.endTime };
        console.log("Envoi du score au serveur :", payload);

        try {
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            console.log("Réponse du serveur :", result);

            if (!response.ok) {
                console.error("Erreur lors de l'enregistrement du score:", result.message);
                alert(`Erreur: ${result.message}`); // Affiche l'erreur à l'utilisateur
            }
            
            onLeaderboard();
        } catch (error) {
            console.error("Erreur de connexion lors de l'envoi du score:", error);
            alert("Une erreur de connexion est survenue. Impossible d'enregistrer le score.");
        }
    };

    return (
        <div style={containerStyles}>
            <Image src="/Bureau-Infernale.png" alt="Background" fill style={{ objectFit: 'cover', filter: 'blur(5px) grayscale(80%)', zIndex: -2 }} />
            <div style={overlayStyles}></div>
            <div style={{ position: 'relative', zIndex: 1, padding: '0 20px', maxWidth: '600px' }}>
                <h1 style={{ fontSize: '4.5rem', margin: '0 0 1rem 0', color: '#E53E3E', textShadow: '3px 3px 6px #000' }}>
                    GAME OVER
                </h1>
                
                <div style={{
                    background: 'rgba(45, 55, 72, 0.8)',
                    padding: '2rem',
                    borderRadius: '10px',
                    border: '2px solid #718096'
                }}>
                    <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0' }}>Votre score final :</h2>
                    <p style={{ fontSize: '3.5rem', margin: 0, fontWeight: 'bold', color: '#63B3ED' }}>
                        <AnimatedNumber value={displayScore} />
                    </p>
                </div>

                {topScore && displayScore >= topScore.score && (
                    <div style={{ margin: '1.5rem 0', color: '#38A169', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        🎉 NOUVEAU MEILLEUR SCORE ! 🎉
                    </div>
                )}
                {taunt && (
                    <div style={{ margin: '1.5rem 0', fontStyle: 'italic', color: '#A0AEC0' }}>
                       "{taunt}"
                    </div>
                )}
                
                {typeof score !== 'number' && (
                    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
                        <input
                            type="text"
                            value={pseudo}
                            onChange={handlePseudoChange}
                            placeholder="VOTRE PSEUDO (3-10 LETTRES)"
                            maxLength={10}
                            style={{
                                textTransform: 'uppercase',
                                padding: '1rem',
                                fontSize: '1.5rem',
                                width: '100%',
                                maxWidth: '400px',
                                textAlign: 'center',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: `2px solid ${error ? '#E53E3E' : '#A0AEC0'}`,
                                color: 'white',
                                borderRadius: '5px'
                            }}
                        />
                         {error && <p style={{ color: '#FC8181', marginTop: '0.5rem' }}>{error}</p>}
                        <button type="submit" style={{ ...buttonStyles, marginTop: '1rem', background: '#38B2AC', borderColor: '#38B2AC' }}>
                            ENREGISTRER
                        </button>
                    </form>
                )}

                <button onClick={onLeaderboard} style={{...buttonStyles, marginTop: '2rem'}}>
                    VOIR LE CLASSEMENT
                </button>
            </div>
        </div>
    );
};

const AnimatedNumber = ({ value }: { value: number }) => {
    const [currentValue, setCurrentValue] = useState(0);

    useEffect(() => {
        let startTimestamp: number | null = null;
        const duration = 1500; // ms

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const nextValue = Math.floor(progress * value);
            setCurrentValue(nextValue);

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }, [value]);

    return <span>{currentValue.toLocaleString()}</span>;
};

const LeaderboardScreen = ({ onHome }: { onHome: () => void }) => {
    const [scores, setScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdatedPseudo, setLastUpdatedPseudo] = useState<string | null>(null);

    useEffect(() => {
        const fetchScores = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/scores');
                if (!res.ok) throw new Error('Le serveur est peut-être en pause café.');
                const data: Score[] = await res.json();
                
                if (Array.isArray(data)) {
                    setScores(data);

                    // Identifier le dernier score mis à jour (s'il est récent)
                    if (data.length > 0) {
                        const mostRecent = data.reduce((latest, current) => {
                            if (!latest.end_time) return current;
                            if (!current.end_time) return latest;
                            return new Date(current.end_time) > new Date(latest.end_time) ? current : latest;
                        });
                        
                        // On considère une mise à jour comme "récente" si elle date de moins de 5 minutes
                        if(mostRecent.end_time) {
                            const timeSinceUpdate = Date.now() - new Date(mostRecent.end_time).getTime();
                            const fiveMinutes = 5 * 60 * 1000;
                            if (timeSinceUpdate < fiveMinutes) {
                                setLastUpdatedPseudo(mostRecent.pseudo);
                            }
                        }
                    }

                } else {
                    throw new Error('Format de données inattendu.');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Une erreur inconnue est survenue.');
            } finally {
                setLoading(false);
            }
        };
        fetchScores();
    }, []);
    
    // --- Data processing ---
    const top3 = scores.slice(0, 3);
    const restOfScores = scores.slice(3);

    // --- Styling Objects ---
    const podiumItemStyle = (rank: number): React.CSSProperties => {
        const styles: { [key: number]: React.CSSProperties } = {
            0: { order: 2, transform: 'scale(1.1) translateY(-20px)', zIndex: 3, background: 'radial-gradient(ellipse at top, rgba(255,215,0,0.4), transparent 70%)', border: '2px solid #FFD700', boxShadow: '0 0 25px rgba(255,215,0,0.5)' },
            1: { order: 1, transform: 'scale(1.0) translateY(0)', zIndex: 2, background: 'radial-gradient(ellipse at top, rgba(192,192,192,0.3), transparent 70%)', border: '2px solid #C0C0C0' },
            2: { order: 3, transform: 'scale(0.9) translateY(15px)', zIndex: 1, background: 'radial-gradient(ellipse at top, rgba(205,127,50,0.3), transparent 70%)', border: '2px solid #CD7F32' },
        };
        return {
            width: '32%',
            minHeight: '180px',
            padding: '1.5rem 1rem',
            borderRadius: '15px',
            textAlign: 'center',
            backgroundColor: 'rgba(30, 40, 60, 0.6)',
            backdropFilter: 'blur(10px)',
            transition: 'transform 0.5s ease-out',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            ...styles[rank],
        };
    };

    return (
        <>
            <style>{`
                .leaderboard-list::-webkit-scrollbar { display: none; }
                .leaderboard-list { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.05); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
            <div style={{...containerStyles, fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif", display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem', boxSizing: 'border-box' }}>
                <Image src="/Bureau-Infernale.png" alt="Background" fill style={{ objectFit: 'cover', filter: 'blur(10px) brightness(0.6)', transform: 'scale(1.1)', zIndex: -2 }} />
                <div style={{...overlayStyles, background: 'linear-gradient(180deg, rgba(10, 15, 20, 0.4) 0%, rgba(30, 40, 50, 0.8) 100%)' }}></div>
                
                <h2 style={{ fontSize: '2.8rem', textShadow: '2px 2px 8px #000', color: '#fff', letterSpacing: '1px', fontWeight: '800', margin: '0 0 2rem 0' }}>
                    Panthéon des Employés
                </h2>

                {/* --- Podium Area --- */}
                {!loading && !error && top3.length > 0 && (
                    <div style={{
                        width: '100%', maxWidth: '700px',
                        display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
                        marginBottom: '3rem',
                    }}>
                        {top3.map((s, i) => {
                            const isLastUpdated = s.pseudo === lastUpdatedPseudo;
                            const message = i === 0 ? "Record Battu !" : "Nouveau !";
                            return (
                                <div key={i} style={podiumItemStyle(i)}>
                                    <p style={{fontSize: '2.5rem', margin: 0, fontWeight: '900'}}>{i === 0 ? '👑' : i === 1 ? '🥈' : '🥉'}</p>
                                    <p style={{fontSize: '1.4rem', margin: '10px 0', fontWeight: '700', textShadow: '1px 1px 4px #000'}}>{s.pseudo}</p>
                                    <p style={{fontSize: '1.3rem', margin: '5px 0 0', fontWeight: '500', color: '#E2E8F0', fontFamily: 'monospace'}}>
                                        <AnimatedNumber value={s.score} />
                                    </p>
                                    <div style={{height: '20px', marginTop: '5px'}}>
                                        {isLastUpdated && <p style={{color: '#39FF14', fontWeight: 'bold', fontSize: '0.8rem', textShadow: '0 0 5px #39FF14', animation: 'pulse 1.5s infinite'}}>{message}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* --- Scrollable List --- */}
                <div className="leaderboard-list" style={{ width: '100%', maxWidth: '700px', flex: 1, overflowY: 'auto', minHeight: '200px' }}>
                    {loading && <p style={{textAlign: 'center', fontSize: '1.5rem'}}>Analyse des performances...</p>}
                    {error && <p style={{color: '#ff6b6b', textAlign: 'center', fontSize: '1.5rem'}}>Erreur: {error}</p>}
                    
                    {!loading && !error && (
                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {restOfScores.map((s, i) => {
                                const isLastUpdated = s.pseudo === lastUpdatedPseudo;
                                return (
                                    <li key={i+3} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 20px', borderRadius: '10px', backgroundColor: 'rgba(20, 30, 45, 0.5)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                    }}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                            <span style={{fontWeight: '600', fontSize: '1.1rem'}}>
                                                #{i + 4} {s.pseudo}
                                            </span>
                                            {isLastUpdated && <span style={{color: '#39FF14', fontWeight: 'bold', fontSize: '0.8rem', textShadow: '0 0 5px #39FF14', animation: 'pulse 1.5s infinite'}}>Nouveau !</span>}
                                        </div>
                                        <span style={{fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: '700'}}>{s.score.toLocaleString()}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* --- Footer Button --- */}
                <div style={{ marginTop: '2rem' }}>
                    <button style={{...buttonStyles, padding: '12px 30px', fontSize: '1rem' }} onClick={onHome}>
                        Retour à l'Accueil
                    </button>
                </div>
            </div>
        </>
    );
};

export default function Page() {
    const [gameState, setGameState] = useState<GameState>('home');
    const [finalScore, setFinalScore] = useState<ScoreData | number>(0);

    const handleGameOver = (scoreData: ScoreData | number) => {
        setFinalScore(scoreData);
        setGameState('gameover');
    };

    switch(gameState) {
        case 'playing':
            return <Game onGameOver={handleGameOver} />;
        case 'gameover':
            return <GameOverScreen score={finalScore} onLeaderboard={() => setGameState('leaderboard')} />;
        case 'leaderboard':
            return <LeaderboardScreen onHome={() => setGameState('home')} />;
        case 'home':
        default:
            return <HomePage onPlay={() => setGameState('playing')} onShowLeaderboard={() => setGameState('leaderboard')} />;
    }
}
