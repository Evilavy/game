"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import Game, { ScoreData } from '@/components/Game';
import Image from 'next/image';
import Cookies from 'js-cookie';

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

// Composant Confettis
const Confetti = () => {
    const [confetti, setConfetti] = useState<Array<{
        id: number;
        x: number;
        y: number;
        rotation: number;
        color: string;
        speed: number;
        rotationSpeed: number;
    }>>([]);

    useEffect(() => {
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
        const particles = Array.from({ length: 100 }, (_, i) => ({
            id: i,
            x: Math.random() * window.innerWidth,
            y: -10,
            rotation: Math.random() * 360,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 1,
            rotationSpeed: Math.random() * 10 - 5,
        }));
        setConfetti(particles);

        const interval = setInterval(() => {
            setConfetti(prev => prev.map(particle => ({
                ...particle,
                y: particle.y + particle.speed,
                rotation: particle.rotation + particle.rotationSpeed,
            })).filter(particle => particle.y < window.innerHeight + 10));
        }, 50);

        const timeout = setTimeout(() => {
            clearInterval(interval);
        }, 10000); // Stop after 10 seconds

        return () => {
            clearInterval(interval);
            clearTimeout(timeout);
        };
    }, []);

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000 }}>
            {confetti.map(particle => (
                <div
                    key={particle.id}
                    style={{
                        position: 'absolute',
                        left: particle.x,
                        top: particle.y,
                        width: '10px',
                        height: '10px',
                        backgroundColor: particle.color,
                        transform: `rotate(${particle.rotation}deg)`,
                        borderRadius: '2px',
                    }}
                />
            ))}
        </div>
    );
};

const HomePage = ({ onPlay, onShowLeaderboard }: { onPlay: () => void, onShowLeaderboard: () => void }) => {
    const [topScore, setTopScore] = useState<Score | null>(null);

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
    }, []);

    return (
        <div style={containerStyles}>
            <Confetti />
            <Image src="/Bureau-Infernale.png" alt="Background" fill style={{ objectFit: 'cover', zIndex: -2 }} />
            <div style={overlayStyles}></div>
            <div style={{ position: 'relative', zIndex: 1, padding: '0 20px' }}>
                <h1 style={{ fontSize: '4rem', marginBottom: '1rem', textShadow: '2px 2px 4px #000' }}>
                    Office from Hell
                </h1>
                
                <div style={{
                    border: '2px solid #FF6B6B',
                    padding: '1.5rem',
                    borderRadius: '15px',
                    background: 'rgba(255, 107, 107, 0.15)',
                    marginBottom: '1.5rem',
                    maxWidth: '600px',
                    margin: '0 auto 1.5rem auto',
                    boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)'
                }}>
                    <h2 style={{ fontSize: '2.5rem', margin: 0, color: '#FFD700', textShadow: '2px 2px 4px #000' }}>
                        🎉 CONTEST ENDED! 🎉
                    </h2>
                    <p style={{ fontSize: '1.4rem', margin: '1rem 0', color: 'white', fontWeight: 'bold' }}>
                        Congratulations to all participants!
                    </p>
                    <p style={{ fontSize: '1.2rem', margin: '0.5rem 0', color: '#E2E8F0' }}>
                        The Office from Hell challenge is now closed.
                    </p>
                </div>

                {topScore && (
                    <div style={{
                        border: '3px solid #ffd700',
                        padding: '2rem',
                        borderRadius: '15px',
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05))',
                        marginBottom: '2rem',
                        maxWidth: '500px',
                        margin: '0 auto 2rem auto',
                        boxShadow: '0 0 30px rgba(255, 215, 0, 0.5)',
                        animation: 'pulse 2s infinite'
                    }}>
                        <style jsx>{`
                            @keyframes pulse {
                                0% { transform: scale(1); }
                                50% { transform: scale(1.02); }
                                100% { transform: scale(1); }
                            }
                        `}</style>
                        <h2 style={{ fontSize: '2rem', margin: 0, color: '#ffd700', textShadow: '2px 2px 4px #000' }}>
                            🏆 GRAND WINNER 🏆
                        </h2>
                        <p style={{ fontSize: '2.5rem', margin: '1rem 0', color: 'white', fontWeight: 'bold', textShadow: '2px 2px 4px #000' }}>
                            {topScore.pseudo}
                        </p>
                        <p style={{ fontSize: '2rem', margin: '0.5rem 0', color: '#FFD700', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            {topScore.score.toLocaleString()} points
                        </p>
                        <p style={{ fontSize: '1.3rem', margin: '1rem 0', color: '#4ECDC4', fontWeight: 'bold' }}>
                            🥤 Winner of the drink of their choice! 🥤
                        </p>
                    </div>
                )}

                <div>
                    <button style={buttonStyles} onClick={onPlay}>PLAY ANYWAY</button>
                    <button style={buttonStyles} onClick={onShowLeaderboard}>FINAL LEADERBOARD</button>
                </div>
            </div>
        </div>
    );
};

const TAUNT_MESSAGES = [
    "No drink for you! {topPlayer} wouldn't have missed that one.",
    "One more try! Or not. {topPlayer} is already sipping their victory (and soon a drink).",
    "You won't quench your thirst with that score. Ask {topPlayer} for advice.",
    "You got 'burned out' before even reaching the vending machine. {topPlayer} is still on top.",
    "Ouch. {topPlayer} made that score while sleeping. The drink is moving away...",
    "Dreaming of a drink is nice. Getting it is {topPlayer}'s job.",
    "Insufficient score. Please insert more 'skill' to unlock the drink. {topPlayer} did it.",
    "The coffee machine is broken, and apparently, so is your talent. Unlike {topPlayer}.",
    "Looks like you'll stay hydrated with tap water. The drink is for {topPlayer}.",
    "{topPlayer} must be laughing seeing your score. Try again, maybe?"
];

const GameOverScreen = ({ score, onLeaderboard }: { score: ScoreData | number, onLeaderboard: () => void }) => {
    const [pseudo, setPseudo] = useState(() => {
        // Load pseudo from cookies at startup
        return Cookies.get('lastPseudo') || '';
    });
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

                        // Select a taunt if the score isn't beaten
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
        // Only allow letters, up to 3 characters
        if (/^[a-zA-Z]*$/.test(value) && value.length <= 3) {
            setPseudo(value.toUpperCase());
            setError('');
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (pseudo.length < 1 || pseudo.length > 3 || !/^[a-zA-Z]+$/.test(pseudo) || typeof score === 'number') {
            setError('Pseudo must contain 1-3 letters (A-Z).');
            return;
        }

        // Save pseudo in cookies
        Cookies.set('lastPseudo', pseudo, { expires: 365 }); // Expires in 1 year

        const payload = { 
            pseudo, 
            score: score.score, 
            sessionToken: score.sessionToken, 
            startTime: score.startTime, 
            endTime: score.endTime,
            signature: score.signature 
        };
        console.log("Sending score to server:", payload);

        try {
            const response = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            console.log("Server response:", result);

            if (!response.ok) {
                console.error("Error saving score:", result.message);
                alert(`Error: ${result.message}`); // Show error to user
            }
            
            onLeaderboard();
        } catch (error) {
            console.error("Connection error when sending score:", error);
            alert("A connection error occurred. Unable to save score.");
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
                    <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0' }}>Your final score:</h2>
                    <p style={{ fontSize: '3.5rem', margin: 0, fontWeight: 'bold', color: '#63B3ED' }}>
                        <AnimatedNumber value={displayScore} />
                    </p>
                </div>

                {topScore && displayScore >= topScore.score && (
                    <div style={{ margin: '1.5rem 0', color: '#38A169', fontSize: '1.5rem', fontWeight: 'bold' }}>
                        🎉 NEW HIGH SCORE! 🎉
                    </div>
                )}
                {taunt && (
                    <div style={{ margin: '1.5rem 0', fontStyle: 'italic', color: '#A0AEC0' }}>
                       "{taunt}"
                    </div>
                )}
                
                {typeof score !== 'number' && (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <input
                            type="text"
                            value={pseudo}
                            onChange={handlePseudoChange}
                            placeholder="NICKNAME (3 LETTERS MAX)"
                            maxLength={3}
                            style={{
                                padding: '0.8rem',
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
                            SAVE
                        </button>
                    </form>
                )}

                <button onClick={onLeaderboard} style={{...buttonStyles, marginTop: '2rem'}}>
                    VIEW LEADERBOARD
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
                if (!res.ok) throw new Error('The server might be on a coffee break.');
                const data: Score[] = await res.json();
                
                if (Array.isArray(data)) {
                    setScores(data);

                    // Identify the last updated score (if recent)
                    if (data.length > 0) {
                        const mostRecent = data.reduce((latest, current) => {
                            if (!latest.end_time) return current;
                            if (!current.end_time) return latest;
                            return new Date(current.end_time) > new Date(latest.end_time) ? current : latest;
                        });
                        
                        // We consider an update as "recent" if it's less than 5 minutes old
                        if(mostRecent.end_time) {
                            const timeSinceUpdate = Date.now() - new Date(mostRecent.end_time).getTime();
                            const fiveMinutes = 5 * 60 * 1000;
                            if (timeSinceUpdate < fiveMinutes) {
                                setLastUpdatedPseudo(mostRecent.pseudo);
                            }
                        }
                    }

                } else {
                    throw new Error('Unexpected data format.');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
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
                    Employee Hall of Fame
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
                            const message = i === 0 ? "Record Broken!" : "New!";
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
                    {loading && <p style={{textAlign: 'center', fontSize: '1.5rem'}}>Analyzing performance...</p>}
                    {error && <p style={{color: '#ff6b6b', textAlign: 'center', fontSize: '1.5rem'}}>Error: {error}</p>}
                    
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
                                            {isLastUpdated && <span style={{color: '#39FF14', fontWeight: 'bold', fontSize: '0.8rem', textShadow: '0 0 5px #39FF14', animation: 'pulse 1.5s infinite'}}>New!</span>}
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
                        Back to Home
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
