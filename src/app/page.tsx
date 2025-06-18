"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import Game from '@/components/Game';
import Image from 'next/image';

type GameState = 'home' | 'playing' | 'gameover' | 'leaderboard';
type Score = { pseudo: string, score: number };

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

const GameOverScreen = ({ score, onLeaderboard }: { score: number, onLeaderboard: () => void }) => {
    const [pseudo, setPseudo] = useState('');
    const [topScore, setTopScore] = useState<Score | null>(null);
    const [taunt, setTaunt] = useState('');

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
                        if (score < top.score) {
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
    }, [score]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (pseudo.length !== 3) return;

        await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pseudo, score }),
        });
        onLeaderboard();
    };

    return (
        <div style={containerStyles}>
            <Image src="/Bureau-Infernale.png" alt="Background" fill style={{ objectFit: 'cover', filter: 'blur(5px) grayscale(80%)', zIndex: -2 }} />
            <div style={overlayStyles}></div>
            <div style={{ position: 'relative', zIndex: 1 }}>
                <h2 style={{ fontSize: '3rem' }}>BURNOUT</h2>
                <p style={{ fontSize: '1.5rem' }}>Votre score : {score.toLocaleString()}</p>

                {topScore && (
                    <div style={{ marginTop: '1rem', color: '#a0aec0', minHeight: '50px' }}>
                        {score >= topScore.score && pseudo.length < 3 ? (
                             <p style={{ color: '#ffd700', fontWeight: 'bold' }}>NOUVEAU MEILLEUR SCORE !</p>
                        ) : taunt ? (
                            <p style={{ fontStyle: 'italic' }}>&quot;{taunt}&quot;</p>
                        ) : score < topScore.score ? (
                           <p>Vous êtes à {(topScore.score - score).toLocaleString()} points de détrôner {topScore.pseudo} !</p>
                        ) : null}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
                    <input
                        type="text"
                        value={pseudo}
                        onChange={(e) => setPseudo(e.target.value.toUpperCase().slice(0, 3))}
                        maxLength={3}
                        placeholder="AAA"
                        style={{
                            width: '100px',
                            padding: '1rem',
                            fontSize: '2rem',
                            textAlign: 'center',
                            border: '2px solid white',
                            background: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            textTransform: 'uppercase'
                        }}
                    />
                    <button type="submit" style={{ ...buttonStyles, display: 'block', margin: '1rem auto' }}>
                        Enregistrer
                    </button>
                </form>
            </div>
        </div>
    )
};

const LeaderboardScreen = ({ onHome }: { onHome: () => void }) => {
    const [scores, setScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchScores = async () => {
            try {
                const res = await fetch('/api/scores');
                if (!res.ok) {
                    throw new Error('Impossible de charger les scores.');
                }
                const data = await res.json();
                if (Array.isArray(data)) {
                    setScores(data);
                } else {
                    throw new Error('Les données reçues ne sont pas valides.');
                }
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                }
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchScores();
    }, []);

    return (
        <div style={containerStyles}>
             <Image src="/Bureau-Infernale.png" alt="Background" fill style={{ objectFit: 'cover', filter: 'blur(5px)', zIndex: -2 }} />
            <div style={overlayStyles}></div>
            <div style={{ position: 'relative', zIndex: 1, maxHeight: '80vh', overflowY: 'auto', padding: '0 20px' }}>
                <h2 style={{ fontSize: '3rem' }}>Meilleurs Employés</h2>
                {loading && <p>Chargement...</p>}
                {error && <p style={{color: 'red'}}>Erreur: {error}</p>}
                {!loading && !error && (
                    <ol style={{ listStyleType: 'none', padding: 0, width: '350px' }}>
                        {scores.length > 0 ? scores.map((s, i) => {
                            const isTopPlayer = i === 0;
                            const itemStyle: React.CSSProperties = {
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '0.75rem 1rem',
                                margin: '0.5rem 0',
                                borderRadius: '5px',
                                background: isTopPlayer ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0,0,0,0.2)',
                                border: isTopPlayer ? '2px solid #ffd700' : '2px solid transparent',
                                fontSize: isTopPlayer ? '1.2rem' : '1rem',
                                transition: 'all 0.3s ease'
                            };

                            return (
                                <li key={i} style={itemStyle}>
                                    <span style={{ fontWeight: 'bold' }}>
                                        {isTopPlayer ? '👑 ' : `#${i + 1} `}
                                        {s.pseudo}
                                    </span>
                                    <span>{s.score.toLocaleString()}</span>
                                </li>
                            );
                        }) : <p>Personne n&apos;a encore survécu...</p>}
                    </ol>
                )}
                <button onClick={onHome} style={{ ...buttonStyles, marginTop: '2rem' }}>Accueil</button>
            </div>
        </div>
    )
};

export default function Page() {
    const [gameState, setGameState] = useState<GameState>('home');
    const [finalScore, setFinalScore] = useState(0);

    const handleGameOver = (score: number) => {
        setFinalScore(score);
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
