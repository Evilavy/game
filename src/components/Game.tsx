"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createNoise2D } from 'simplex-noise';
import { Joystick } from 'react-joystick-component';

// --- CONSTANTES DE SÉCURITÉ ---
const MIN_GAME_DURATION = 15000; // 15 seconds minimum
const MAX_GAME_DURATION = 3600000; // 1 hour maximum
const ANTI_CHEAT_SECRET_KEY = process.env.NEXT_PUBLIC_ANTI_CHEAT_SECRET_KEY;

// --- CONSTANTES DE JEU ---
const TILE_SIZE = 50;
const MAP_WIDTH = 250; // en tuiles
const MAP_HEIGHT = 250; // en tuiles

// --- JOUEUR ---
const PLAYER_SIZE = 45;
const PLAYER_FIRE_RANGE = 250;
const PLAYER_MAX_HEALTH = 5; // Santé réduite
const PLAYER_HIT_COOLDOWN = 1000; // 1s d'invincibilité après un coup
const ORB_KNOCKBACK_STRENGTH = 2.5; // Vélocité initiale du recul des agrafes

// --- COMPÉTENCE D'ESQUIVE (DASH) ---
const DASH_SPEED_MULTIPLIER = 5; // Vitesse multipliée par 5 pendant le dash
const DASH_DURATION = 200; // ms
const DASH_COOLDOWN = 4000; // ms
const DASH_AOE_DAMAGE = 10;
const DASH_AOE_RADIUS = 150;

// --- ZOMBIE ---
const ZOMBIE_SIZE = 30;
const ZOMBIE_SPEED = 1.5;
const ZOMBIE_DAMAGE = 1; // Dégâts réduits à 1
const ZOMBIE_GREEN_COLOR = '#c0c0c0'; // Thème bureau: Trombones
const ZOMBIE_BLUE_COLOR = '#555555'; // Thème bureau: Imprimantes
const ZOMBIE_RED_COLOR = '#8B4513';   // Thème bureau: Bureaux
const YELLOW_ZOMBIE_COLOR = '#f1c40f'; // Thème bureau: Post-its

// --- SPAWN CONTINU ---
const SPAWN_BASE_INTERVAL = 1800; // ms au niveau 1
const SPAWN_RATE_GROWTH = 0.75; // Le délai est multiplié par ce facteur (25% plus rapide par niveau)
const SPAWN_XP_SCALING_START_LEVEL = 4;
const SPAWN_WAVE_XP_THRESHOLD = 200; // Un palier de difficulté tous les 200 XP
const SPAWN_WAVE_DIFFICULTY_MULTIPLIER = 0.90; // Le spawn devient 10% plus rapide à chaque vague
const ZOMBIE_BLUE_CHANCE = 0.3; // Si pas rouge, 30% de chance d'être bleu
const ZOMBIE_RED_CHANCE = 0.1; // 10% de chance (absolue) qu'un zombie soit rouge (après déblocage)

// --- ÉVÉNEMENT ZOMBIE JAUNE ---
const YELLOW_ZOMBIE_HEALTH = 4;
const YELLOW_ZOMBIE_SPEED_MULTIPLIER = 1.25;
const YELLOW_ZOMBIE_LINE_COUNT = 10;
const YELLOW_ZOMBIE_SPAWN_INTERVAL = 30000; // 30s
const YELLOW_ZOMBIE_LIFETIME = 8000; // 8s

// --- SYSTÈME D'XP ---
const XP_BASE_REQ = 100;
const XP_GROWTH_FACTOR = 1.5;
const COIN_SIZE = 15;
const COIN_XP_VALUE = 10;
const ZOMBIE_KILL_XP = 5;
const HEALTH_POTION_DROP_CHANCE = 0.02; // 2% de chance (1 sur 50)
const HEALTH_POTION_SIZE = 20;

    // --- GRENADE ---
const GRENADE_COOLDOWN = 15000; // 10s
const GRENADE_EXPLOSION_DELAY = 3000; // 3s
const GRENADE_EXPLOSION_DAMAGE = 10;
const GRENADE_EXPLOSION_RADIUS = 200;
const GRENADE_ATTRACTION_RADIUS = 400;
const GRENADE_SPEED = 7; // Vitesse de déplacement de la grenade
const GRENADE_SIZE = 25;
const GRENADE_MAX_DISTANCE = 400; // Distance que la grenade parcourt

// --- COMPÉTENCES (PERKS) ---
// const PERK_TYPE_FIRE_RATE = 'FIRE_RATE';
// const PERK_TYPE_DAMAGE = 'DAMAGE';
// const PERK_TYPE_POISON = 'POISON';
// const PERK_TYPE_LIGHTNING = 'LIGHTNING';
// const BREATH_COOLDOWN = 3000;
// const BREATH_DAMAGE = 5;
// const BREATH_RANGE = 200;
// const BREATH_WIDTH_ANGLE = Math.PI / 4; // 45 degrees

// Zone de poison
const POISON_ZONE_RADIUS = 150;
const POISON_ZONE_DPS = 0.2;
const POISON_ZONE_SLOW = 0.6; // 60% de ralentissement
const POISON_DURATION = 5000; // 5s active
const POISON_COOLDOWN = 5000; // 5s inactive

// Éclair
const LIGHTNING_DAMAGE = 8;
const LIGHTNING_COOLDOWN = 5000; // ms
const LIGHTNING_RADIUS = 90;

// --- ÉVÉNEMENT ZOMBIE VIOLET ---
const PURPLE_ZOMBIE_HEALTH = 20;
const PURPLE_ZOMBIE_COLOR = '#333333'; // Thème bureau: Chaises de bureau
const PURPLE_ZOMBIE_SPAWN_RADIUS = 700;
const PURPLE_ZOMBIE_COUNT = 25;
const PURPLE_ZOMBIE_GAP_ANGLE = Math.PI / 9; // 20 degrés de trou (plus petit)

// --- COMPÉTENCES (PERKS) ---
const PIERCING_BLADE_COOLDOWN = 3000;
const PIERCING_BLADE_DAMAGE = 5;
const PIERCING_BLADE_RANGE = 450;
const PIERCING_BLADE_SPEED = 12;
const PIERCING_BLADE_WIDTH = 10;
const PIERCING_BLADE_LENGTH = 40;

// --- INTERFACES ---
interface Tile {
  type: 'ground' | 'water';
}

interface Zombie {
  id: number;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  color: string;
  direction?: { dx: number; dy: number };
  spawnTime?: number;
  knockbackVx?: number;
  knockbackVy?: number;
}

interface Orb {
  id: number;
  x: number;
  y: number;
  targetId: number;
}

interface Coin {
    id: number;
    x: number;
    y: number;
}

interface PoisonZone {
    x: number;
    y: number;
    active: boolean;
    timer: number;
}

interface Lightning {
    id: number;
    x: number;
    y: number;
    alpha: number;
}

interface GrenadeTrailParticle {
    x: number;
    y: number;
    alpha: number;
    size: number;
}

interface Grenade {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    distanceTraveled: number;
    isActivated: boolean;
    activationTime: number;
    trail: GrenadeTrailParticle[];
}

interface PiercingBlade {
    id: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    distanceTraveled: number;
    angle: number;
    hitZombieIds: Set<number>;
}

interface HealthPotion {
    id: number;
    x: number;
    y: number;
}

interface Bubble {
    id: number;
    x: number;
    y: number;
    radius: number;
    maxLife: number;
    life: number;
}

interface BloodParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
    shape: 'square' | 'pixel' | 'cross';  // Ajout de formes pixelisées
    rotation: number;  // Pour la rotation des particules
}

interface DashParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
}

interface FlashEffect {
    active: boolean;
    startTime: number;
    x: number;
    y: number;
    duration: number;
    radius: number;
}

interface AoEEffect {
    id: number;
    x: number;
    y: number;
    startTime: number;
    duration: number;
    radius: number;
}

// Type pour les scores du classement
type Score = { pseudo: string, score: number };

export interface ScoreData {
    score: number;
    sessionToken: string;
    startTime: number;
    endTime: number;
    signature: string;
}

type PerkID = 'FIRE_RATE' | 'DAMAGE' | 'POISON' | 'LIGHTNING' | 'PIERCING_BLADE';
interface Perk {
    id: PerkID;
    name: string;
    description: string;
}

interface PlayerState {
    level: number;
    speedGround: number;
    speedWater: number;
    fireRate: number; // ms entre les tirs
    orbSpeed: number;
    damage: number;
    activePerks: Set<PerkID>;
    health: number;
    maxHealth: number;
}

interface GameProps {
    onGameOver: (scoreData: ScoreData | number) => void;
}

const ALL_PERKS: Perk[] = [
    { id: 'FIRE_RATE', name: 'Caffeine Boost', description: 'Throw paper balls 25% faster.' },
    { id: 'DAMAGE', name: 'Blazing Paper Balls', description: 'Your paper balls deal double damage.' },
    { id: 'POISON', name: 'Spilled Coffee', description: 'Creates a coffee puddle that hurts and slows enemies.' },
    { id: 'LIGHTNING', name: 'Short Circuit', description: "Every 5s, a short circuit strikes a group of enemies." },
    { id: 'PIERCING_BLADE', name: 'Sharp Ream', description: 'Every 3s, launches a paper ream that pierces through enemies.' },
];

// --- RAGE MODE ---
const RAGE_POTION_DROP_CHANCE = 0.05; // 5% de chance
const RAGE_POTION_SIZE = 20;
const RAGE_DURATION = 8000; // 8s
const RAGE_FIRE_RATE_MULTIPLIER = 5;

interface RagePotion {
    id: number;
    x: number;
    y: number;
}

interface Bloodstain {
    id: number;
    x: number;
    y: number;
    radius: number;
    rotation: number;  // Rotation aléatoire de l'image
    scale: number;    // Échelle aléatoire
    createdAt: number;
    fadeStartTime: number;
}

// Ajouter la constante pour le multiplicateur de vitesse en rage
const RAGE_SPEED_MULTIPLIER = 1.1; // +10% de vitesse

// Fonction utilitaire pour générer des motifs de sang pixelisés
const generateBloodPattern = (x: number, y: number, isRage: boolean) => {
    const pattern: BloodParticle[] = [];
    // Réduction du nombre de particules en mode rage
    const count = isRage ? 15 : 20;
    // Réduction de la taille de base en mode rage
    const baseSize = isRage ? 3 : 2;
    
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        // Réduction significative de la vitesse en mode rage
        const speed = isRage ? (Math.random() * 0.8 + 0.5) : (Math.random() * 2 + 0.5);
        const shape = isRage ? 
            (Math.random() > 0.5 ? 'cross' : 'pixel') : 
            (Math.random() > 0.7 ? 'pixel' : 'square');
        
        pattern.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
                            // Reduced lifetime in rage mode
            life: Math.random() * 30 + (isRage ? 30 : 30),
            color: isRage ? 
                `rgba(${180 + Math.random() * 75}, ${Math.random() * 20}, ${Math.random() * 20}, ${0.6 + Math.random() * 0.2})` :
                `rgba(${140 + Math.random() * 40}, ${Math.random() * 20}, ${Math.random() * 20}, ${0.6 + Math.random() * 0.2})`,
            size: baseSize + Math.random() * baseSize,
            shape,
            rotation: Math.random() * Math.PI * 2
        });
    }
    return pattern;
};

const Game: React.FC<GameProps> = ({ onGameOver }) => {
    const handleZombieDeath = useCallback((zombie: Zombie, now: number) => {
        if (deadZombiesForFrameRef.current.has(zombie.id)) return;

        deadZombiesForFrameRef.current.add(zombie.id);
        xpRef.current += ZOMBIE_KILL_XP;
        newCoinsForFrameRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });

        // Drop rage potion
        if (Math.random() < RAGE_POTION_DROP_CHANCE) {
            ragePotionsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
        }

        // Drop health potion
        if (playerStateRef.current.health < playerStateRef.current.maxHealth && Math.random() < HEALTH_POTION_DROP_CHANCE) {
            healthPotionsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
        }

        if (isRageActiveRef.current) {
            const currentTime = Date.now();
            bloodstainsRef.current.push({
                id: zombie.id,
                x: zombie.x,
                y: zombie.y,
                // Réduction de la taille de base et de la variation aléatoire
                radius: ZOMBIE_SIZE * 0.8 + Math.random() * 10,
                rotation: Math.random() * Math.PI * 2,
                // Réduction de l'échelle en mode rage
                scale: 0.6 + Math.random() * 0.3,
                createdAt: currentTime,
                fadeStartTime: currentTime + 2000
            });
        }

        spawnBloodParticles(zombie.x, zombie.y, 20, zombie.color === ZOMBIE_GREEN_COLOR ? '#c0c0c0' : '#555555');
    }, []);

    // --- REFS ---
    // Canvas & Core Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const cameraRef = useRef({ x: MAP_WIDTH * TILE_SIZE / 2, y: MAP_HEIGHT * TILE_SIZE / 2 });
    
    // Entity & Item Refs
    const zombiesRef = useRef<Zombie[]>([]);
    const orbsRef = useRef<Orb[]>([]);
    const coinsRef = useRef<Coin[]>([]);
    const ragePotionsRef = useRef<RagePotion[]>([]);
    const bloodstainsRef = useRef<Bloodstain[]>([]);
    const healthPotionsRef = useRef<HealthPotion[]>([]);
    const bubblesRef = useRef<Bubble[]>([]);
    const grenadesRef = useRef<Grenade[]>([]);
    
    // Particle & Effect Refs
    const bloodParticlesRef = useRef<BloodParticle[]>([]);
    const dashParticlesRef = useRef<DashParticle[]>([]);
    const flashEffectRef = useRef<FlashEffect>({ active: false, startTime: 0, x: 0, y: 0, duration: 150, radius: 120 });
    const aoeEffectsRef = useRef<AoEEffect[]>([]);
    const poisonZonesRef = useRef<PoisonZone[]>([]);
    const lightningsRef = useRef<Lightning[]>([]);
    const bladesRef = useRef<PiercingBlade[]>([]);
    const deadZombiesForFrameRef = useRef(new Set<number>());
    const newCoinsForFrameRef = useRef<Coin[]>([]);

    // Image Refs
    const chairImageRef = useRef<HTMLImageElement | null>(null);
    const postitImageRef = useRef<HTMLImageElement | null>(null);
    const bureauImageRef = useRef<HTMLImageElement | null>(null);
    const imprimanteImageRef = useRef<HTMLImageElement | null>(null);
    const trombonneImageRef = useRef<HTMLImageElement | null>(null);
    const papierImageRef = useRef<HTMLImageElement | null>(null);
    const playerImageRef = useRef<HTMLImageElement | null>(null);

    // Player State & Abilities Refs
    const playerStateRef = useRef<PlayerState>({
        level: 1, speedGround: 4, speedWater: 2, fireRate: 1500, orbSpeed: 4,
        damage: 1, activePerks: new Set(), health: PLAYER_MAX_HEALTH, maxHealth: PLAYER_MAX_HEALTH,
    });
    const xpRef = useRef(0);
    const keysPressedRef = useRef<Record<string, boolean>>({});
    const lastMovementDirectionRef = useRef({ dx: 0, dy: -1 });
    const isDashingRef = useRef(false);
    const dashEndTimeRef = useRef(0);
    const dashCooldownEndRef = useRef(0);
    const isRageActiveRef = useRef(false);
    const rageEndTimeRef = useRef(0);

    // Game State Refs
    const gameStartTimeRef = useRef<number | null>(null);
    const lastUpdateTimeRef = useRef(0);
    const isInitializedRef = useRef(false);
    const playerHitRef = useRef(false);
    const playerHitCooldownEndRef = useRef(0);
    const introAnimationRef = useRef({ isPlaying: true, startTime: 0, duration: 2000, startZoom: 4, endZoom: 1, currentZoom: 4 });
    const playerRankRef = useRef<number | null>(null);
    const zombieSpeedBonusRef = useRef(0);
    const playerLastMoveTimeRef = useRef(0);
    const redZombiesUnlockedRef = useRef(false);
    const yellowZombiesUnlockedRef = useRef(false);
    const purpleCircleTriggeredForLevelRef = useRef(new Set<number>());
    const sessionTokenRef = useRef<string>(crypto.randomUUID());
    const displayedScoreRef = useRef<number>(0);
    const pauseStartTimeRef = useRef<number>(0);

    // Timers & Cooldowns
    const lastFireTimeRef = useRef(0);
    const lastZombieSpawnRef = useRef(0);
    const lastLightningTimeRef = useRef(0);
    const lastPoisonTimeRef = useRef(0);
    const lastYellowSpawnTimeRef = useRef(0);
    const lastBladeTimeRef = useRef(0);
    const lastGrenadeTimeRef = useRef(0);
    
    // Input Refs
    const joystickDirectionRef = useRef({ dx: 0, dy: 0 });

    // --- STATE ---
    const [isLevelingUp, setIsLevelingUp] = useState(false);
    const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isDashOnCooldown, setIsDashOnCooldown] = useState(false);
    const [leaderboard, setLeaderboard] = useState<Score[]>([]);
    const [rankUpAnimation, setRankUpAnimation] = useState({ show: false, rank: 0, text: '' });
    
    // --- DERIVED STATE & CONSTANTS ---
    const totalXpForLevel = useCallback((level: number) => {
        let total = 0;
        for (let i = 1; i < level; i++) {
            total += xpForNextLevel(i);
        }
        return total;
    }, []);

    // Déplacer handleGameOver en dehors du useEffect
    const handleGameOver = useCallback(async (finalScore: number) => {
        if (!gameStartTimeRef.current) return;
        const gameDuration = Date.now() - gameStartTimeRef.current;
        console.log("Game duration:", gameDuration, "ms");
        
        // Minimum duration verification
        if (gameDuration < MIN_GAME_DURATION) {
            console.error(`Game duration too short (${gameDuration}ms < ${MIN_GAME_DURATION}ms)`);
            alert("The game is too short to be recorded (minimum 15 seconds).");
            onGameOver(0);
            return;
        }
        
        if (!gameStartTimeRef.current) {
            console.error("Game start time not defined!");
            onGameOver(0);
            return;
        }
        
        const score = Math.floor(finalScore);
        const sessionToken = sessionTokenRef.current;
        const startTime = gameStartTimeRef.current;
        const endTime = Date.now();

        if (!ANTI_CHEAT_SECRET_KEY) {
            console.error("Anti-cheat secret key not defined on client side!");
            onGameOver(0);
            return;
        }

        // Creating anti-cheat signature
        const dataString = `${score}|${sessionToken}|${startTime}|${endTime}`;
        
        const encoder = new TextEncoder();
        const keyData = encoder.encode(ANTI_CHEAT_SECRET_KEY);
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            keyData,
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(dataString));
        
        const hashArray = Array.from(new Uint8Array(signatureBuffer));
        const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const scoreData: ScoreData = {
            score,
            sessionToken,
            startTime,
            endTime,
            signature,
        };
        
        onGameOver(scoreData);
    }, [onGameOver]);

    useEffect(() => {
        const chairImg = new Image();
        chairImg.src = '/chaise.png';
        chairImg.onload = () => chairImageRef.current = chairImg;

        const postitImg = new Image();
        postitImg.src = '/postit.png';
        postitImg.onload = () => postitImageRef.current = postitImg;

        const bureauImg = new Image();
        bureauImg.src = '/bureau.png';
        bureauImg.onload = () => bureauImageRef.current = bureauImg;

        const imprimanteImg = new Image();
        imprimanteImg.src = '/imprimante.png';
        imprimanteImg.onload = () => imprimanteImageRef.current = imprimanteImg;

        const trombonneImg = new Image();
        trombonneImg.src = '/trombonne.png';
        trombonneImg.onload = () => trombonneImageRef.current = trombonneImg;

        const papierImg = new Image();
        papierImg.src = '/papier.png';
        papierImg.onload = () => papierImageRef.current = papierImg;

        const playerImg = new Image();
        playerImg.src = '/base-state.png';
        playerImageRef.current = playerImg;

        setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);

    useEffect(() => {
        const now = Date.now();
        if (isLevelingUp) {
            pauseStartTimeRef.current = now;
        } else {
            if (pauseStartTimeRef.current > 0) {
                const pauseDuration = now - pauseStartTimeRef.current;
                
                // Adjust all relevant timestamps
                if (dashCooldownEndRef.current > 0) dashCooldownEndRef.current += pauseDuration;
                if (lastFireTimeRef.current > 0) lastFireTimeRef.current += pauseDuration;
                if (lastZombieSpawnRef.current > 0) lastZombieSpawnRef.current += pauseDuration;
                if (lastLightningTimeRef.current > 0) lastLightningTimeRef.current += pauseDuration;
                if (playerHitCooldownEndRef.current > 0) playerHitCooldownEndRef.current += pauseDuration;
                if (lastYellowSpawnTimeRef.current > 0) lastYellowSpawnTimeRef.current += pauseDuration;
                if (lastBladeTimeRef.current > 0) lastBladeTimeRef.current += pauseDuration;
                if (dashEndTimeRef.current > 0) dashEndTimeRef.current += pauseDuration;

                // Adjust timestamps on active effects
                if (flashEffectRef.current.active) flashEffectRef.current.startTime += pauseDuration;
                aoeEffectsRef.current.forEach(effect => effect.startTime += pauseDuration);
                zombiesRef.current.forEach(zombie => {
                    if (zombie.spawnTime) zombie.spawnTime += pauseDuration;
                });
                grenadesRef.current.forEach(grenade => {
                    if (grenade.isActivated) grenade.activationTime += pauseDuration;
                });
                
                pauseStartTimeRef.current = 0;
            }
        }
    }, [isLevelingUp]);

    // Récupérer le classement au démarrage
    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('/api/scores');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) {
                        setLeaderboard(data);
                    }
                }
            } catch (error) {
                console.error("Error loading leaderboard:", error);
            }
        };
        fetchLeaderboard();
    }, []);

    const spawnBloodParticles = useCallback((x: number, y: number, count: number, color: string) => {
        const isRageActive = isRageActiveRef.current;
        const bloodPattern = generateBloodPattern(x, y, isRageActive);
        bloodParticlesRef.current.push(...bloodPattern);
    }, []);

    const noise2D = useMemo(() => createNoise2D(), []);
    const map: Tile[][] = useMemo(() => {
        const generatedMap: Tile[][] = [];
        const scale = 0.05;
        for (let y = 0; y < MAP_HEIGHT; y++) {
            generatedMap[y] = [];
            for (let x = 0; x < MAP_WIDTH; x++) {
                const noiseValue = noise2D(x * scale, y * scale);
                generatedMap[y][x] = { type: noiseValue > -0.2 ? 'ground' : 'water' };
            }
        }

        // Algorithme pour s'assurer qu'il n'y a qu'une seule "île" de sol jouable
        const visited = new Set<string>();
        const components: {x: number, y: number}[][] = [];

        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (generatedMap[y][x].type === 'ground' && !visited.has(`${x},${y}`)) {
                    const currentComponent = [];
                    const queue = [{x, y}];
                    visited.add(`${x},${y}`);

                    while(queue.length > 0) {
                        const {x: cx, y: cy} = queue.shift()!;
                        currentComponent.push({x: cx, y: cy});

                        const neighbors = [
                            {x: cx, y: cy - 1}, {x: cx, y: cy + 1},
                            {x: cx - 1, y: cy}, {x: cx + 1, y: cy}
                        ];

                        for (const n of neighbors) {
                            if (n.x >= 0 && n.x < MAP_WIDTH && n.y >= 0 && n.y < MAP_HEIGHT &&
                                generatedMap[n.y][n.x].type === 'ground' && !visited.has(`${n.x},${n.y}`)) {
                                visited.add(`${n.x},${n.y}`);
                                queue.push(n);
                            }
                        }
                    }
                    components.push(currentComponent);
                }
            }
        }

        if (components.length > 0) {
            let largestComponentIndex = 0;
            for (let i = 1; i < components.length; i++) {
                if (components[i].length > components[largestComponentIndex].length) {
                    largestComponentIndex = i;
                }
            }

            for (let i = 0; i < components.length; i++) {
                if (i === largestComponentIndex) continue;
                for (const {x, y} of components[i]) {
                    generatedMap[y][x].type = 'water';
                }
            }
        }

        return generatedMap;
    }, [noise2D]);
    
    const getTileAt = useCallback((px: number, py: number): Tile => {
        const tileX = Math.floor(px / TILE_SIZE);
        const tileY = Math.floor(py / TILE_SIZE);
        return map[tileY]?.[tileX] || { type: 'ground' };
    }, [map]);

    const xpForNextLevel = useCallback((level: number) => Math.floor(XP_BASE_REQ * Math.pow(XP_GROWTH_FACTOR, level - 1)), []);

    const getRandomPerks = useCallback((): Perk[] => {
        const unselectedPerks = ALL_PERKS.filter(p => !playerStateRef.current.activePerks.has(p.id));
        const shuffled = unselectedPerks.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    }, []);

    const spawnPurpleCircle = useCallback((centerX: number, centerY: number) => {
        // Les positions des brèches sont maintenant aléatoires
        const gap1CenterAngle = Math.random() * 2 * Math.PI; 
        const gap2CenterAngle = (gap1CenterAngle + Math.PI + (Math.random() - 0.5) * Math.PI) % (2 * Math.PI); // À peu près à l'opposé
        
        const gapHalfAngle = PURPLE_ZOMBIE_GAP_ANGLE / 2;

        const isAngleInGap = (angle: number, gapCenter: number, gapHalfAngle: number) => {
            let diff = Math.abs(angle - gapCenter);
            if (diff > Math.PI) diff = 2 * Math.PI - diff;
            return diff < gapHalfAngle;
        };

        for (let i = 0; i < PURPLE_ZOMBIE_COUNT; i++) {
            const angle = (i / PURPLE_ZOMBIE_COUNT) * 2 * Math.PI;

            if (isAngleInGap(angle, gap1CenterAngle, gapHalfAngle) || isAngleInGap(angle, gap2CenterAngle, gapHalfAngle)) {
                continue;
            }

            const x = centerX + PURPLE_ZOMBIE_SPAWN_RADIUS * Math.cos(angle);
            const y = centerY + PURPLE_ZOMBIE_SPAWN_RADIUS * Math.sin(angle);

            const newZombie: Zombie = {
                id: Date.now() + Math.random(),
                x, y,
                health: PURPLE_ZOMBIE_HEALTH,
                maxHealth: PURPLE_ZOMBIE_HEALTH,
                color: PURPLE_ZOMBIE_COLOR,
            };
            zombiesRef.current.push(newZombie);
        }
    }, []);

    const selectPerk = (perk: Perk) => {
        playerStateRef.current.activePerks.add(perk.id);
        
        switch (perk.id) {
            case 'FIRE_RATE':
                playerStateRef.current.fireRate *= 0.75;
                break;
            case 'DAMAGE':
                playerStateRef.current.damage *= 2;
                break;
            case 'POISON':
                poisonZonesRef.current.push({ x: 0, y: 0, active: false, timer: POISON_COOLDOWN });
                break;
            case 'LIGHTNING':
                lastLightningTimeRef.current = Date.now();
                break;
            case 'PIERCING_BLADE':
                lastBladeTimeRef.current = Date.now();
                break;
        }

        setIsLevelingUp(false);
    };

    const triggerDash = () => {
        const now = Date.now();
                    if (isLevelingUp) return; // Don't allow dash during perk selection
        if (now > dashCooldownEndRef.current) {
            const preDashX = cameraRef.current.x;
            const preDashY = cameraRef.current.y;

            // Apply AoE Damage
            zombiesRef.current.forEach(zombie => {
                const distSq = (preDashX - zombie.x)**2 + (preDashY - zombie.y)**2;
                if (distSq < DASH_AOE_RADIUS * DASH_AOE_RADIUS) {
                    zombie.health -= DASH_AOE_DAMAGE;
                    if (zombie.health <= 0) {
                        handleZombieDeath(zombie, now);
                    }
                    spawnBloodParticles(zombie.x, zombie.y, 10, '#ffffff');
                }
            });

            // Add visual effect for AoE shockwave
            aoeEffectsRef.current.push({
                id: now,
                x: preDashX,
                y: preDashY,
                startTime: now,
                duration: 300, // ms
                radius: DASH_AOE_RADIUS,
            });

            isDashingRef.current = true;
            dashEndTimeRef.current = now + DASH_DURATION;
            dashCooldownEndRef.current = now + DASH_COOLDOWN;
            setIsDashOnCooldown(true);

            // Trigger flash effect
            flashEffectRef.current = {
                ...flashEffectRef.current,
                active: true,
                startTime: now,
                x: cameraRef.current.x,
                y: cameraRef.current.y,
            };

            // Create a burst of green smoke particles
            const smokeParticleCount = 5;
            const movementAngle = Math.atan2(lastMovementDirectionRef.current.dy, lastMovementDirectionRef.current.dx);
            for (let i = 0; i < smokeParticleCount; i++) {
                const angle = movementAngle + Math.PI + (Math.random() - 0.5) * (Math.PI / 2);
                const pSpeed = Math.random() * 1.5 + 0.5;
                const maxLife = 400 + Math.random() * 200;
                dashParticlesRef.current.push({
                    x: cameraRef.current.x,
                    y: cameraRef.current.y,
                    vx: Math.cos(angle) * pSpeed,
                    vy: Math.sin(angle) * pSpeed,
                    life: maxLife,
                    maxLife: maxLife,
                    size: Math.random() * 8 + 4,
                    color: ''
                });
            }

            // The timeout is now handled in the update loop
        }
    };

    const throwGrenade = () => {
        const now = Date.now();
                    if (isLevelingUp) return; // Don't allow grenade throwing during perk selection
        if (now > lastGrenadeTimeRef.current + GRENADE_COOLDOWN) {
            lastGrenadeTimeRef.current = now;
            const direction = lastMovementDirectionRef.current;
            
            // Position initiale légèrement devant le joueur
            const spawnDistance = PLAYER_SIZE;
            const spawnX = cameraRef.current.x + direction.dx * spawnDistance;
            const spawnY = cameraRef.current.y + direction.dy * spawnDistance;

            // Calculer le point d'atterrissage (une distance fixe devant le joueur)
            const throwDistance = 200; // Distance fixe de lancer
            const targetX = cameraRef.current.x + direction.dx * throwDistance;
            const targetY = cameraRef.current.y + direction.dy * throwDistance;

            // Calculer la vélocité pour atteindre le point d'atterrissage
            const dx = targetX - spawnX;
            const dy = targetY - spawnY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;

            grenadesRef.current.push({
                id: now,
                x: spawnX,
                y: spawnY,
                vx: normalizedDx * GRENADE_SPEED,
                vy: normalizedDy * GRENADE_SPEED,
                angle: 0,
                distanceTraveled: 0,
                isActivated: false,
                activationTime: 0,
                trail: [], // Initialiser la traînée vide
            });
        }
    };

    const handleJoystickMove = (event: any) => {
        const { x, y } = event;
        if (x !== null && y !== null) {
            joystickDirectionRef.current = { dx: x / 50, dy: -y / 50 }; // Normalize and invert Y
        }
    };

    const handleJoystickStop = () => {
        joystickDirectionRef.current = { dx: 0, dy: 0 };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        if (!isInitializedRef.current) {
            // --- SAFE SPAWN LOGIC ---
            const findSafeSpawn = () => {
                const centerX = Math.floor(MAP_WIDTH / 2);
                const centerY = Math.floor(MAP_HEIGHT / 2);
        
                if (map[centerY]?.[centerX]?.type === 'ground') {
                    return { x: centerX * TILE_SIZE + TILE_SIZE / 2, y: centerY * TILE_SIZE + TILE_SIZE / 2 };
                }
        
                // Spiral search for a 'ground' tile
                let x = 0, y = 0, dx = 0, dy = -1;
                const maxI = Math.max(MAP_WIDTH, MAP_HEIGHT)**2;
                for (let i = 0; i < maxI; i++) {
                    const checkX = centerX + x;
                    const checkY = centerY + y;
        
                    if (checkX >= 0 && checkX < MAP_WIDTH && checkY >= 0 && checkY < MAP_HEIGHT) {
                        if (map[checkY][checkX].type === 'ground') {
                            return { x: checkX * TILE_SIZE + TILE_SIZE / 2, y: checkY * TILE_SIZE + TILE_SIZE / 2 };
                        }
                    }
                    
                    if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) {
                        [dx, dy] = [-dy, dx];
                    }
                    x += dx;
                    y += dy;
                }
        
                // Fallback (should be nearly impossible with current map gen)
                return { x: centerX * TILE_SIZE + TILE_SIZE / 2, y: centerY * TILE_SIZE };
            };

            const safeSpawnPoint = findSafeSpawn();
            cameraRef.current.x = safeSpawnPoint.x;
            cameraRef.current.y = safeSpawnPoint.y;
            // --- END SAFE SPAWN LOGIC ---

            gameStartTimeRef.current = Date.now();
            playerLastMoveTimeRef.current = Date.now();
            introAnimationRef.current.startTime = Date.now();
            lastUpdateTimeRef.current = Date.now();
            isInitializedRef.current = true;
        }

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        handleResize();

        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressedRef.current[e.key.toLowerCase()] = true;
            if (e.key === ' ') {
                e.preventDefault();
                triggerDash();
            }
            if (e.key.toLowerCase() === 'g') {
                e.preventDefault();
                throwGrenade();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressedRef.current[e.key.toLowerCase()] = false; };

        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        let animationFrameId: number;

        const update = (deltaTime: number, now: number) => {
            if (isLevelingUp || isGameOver) return;

            // At the start of each frame, clear the lists of entities to be processed
            deadZombiesForFrameRef.current.clear();
            newCoinsForFrameRef.current = [];

            // Handle dash cooldown completion
            if (isDashOnCooldown && now > dashCooldownEndRef.current) {
                setIsDashOnCooldown(false);
            }

            // Handle rage mode completion
            if (isRageActiveRef.current && now > rageEndTimeRef.current) {
                isRageActiveRef.current = false;
            }

            const timeScale = deltaTime / (1000 / 60); // Normalize movement to a 60 FPS baseline

            if (introAnimationRef.current.isPlaying) {
                const elapsedTime = now - introAnimationRef.current.startTime;
                if (elapsedTime >= introAnimationRef.current.duration) {
                    introAnimationRef.current.isPlaying = false;
                    introAnimationRef.current.currentZoom = introAnimationRef.current.endZoom;
                    lastZombieSpawnRef.current = now; // Permet au spawn de commencer
                } else {
                    const progress = elapsedTime / introAnimationRef.current.duration;
                    const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
                    introAnimationRef.current.currentZoom =
                        introAnimationRef.current.startZoom +
                        (introAnimationRef.current.endZoom - introAnimationRef.current.startZoom) * easedProgress;
                }
            }

            // --- Système d'agressivité ---
            // 1. Les zombies deviennent plus rapides avec le temps
            const elapsedTime = now - (gameStartTimeRef.current || now);
            const newSpeedBonus = Math.floor(elapsedTime / 15000) * 0.05; // +0.05 vitesse toutes les 15s
            if (newSpeedBonus > zombieSpeedBonusRef.current) {
                zombieSpeedBonusRef.current = newSpeedBonus;
            }

            // 2. Suivi de l'inactivité du joueur
            const isIdle = now - playerLastMoveTimeRef.current > 3000;

            // Player movement
            let dx = 0;
            let dy = 0;

            // Stop dashing if duration is over
            if (isDashingRef.current && now > dashEndTimeRef.current) {
                isDashingRef.current = false;
            }

            if (keysPressedRef.current['z'] || keysPressedRef.current['arrowup']) dy -= 1;
            if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) dy += 1;
            if (keysPressedRef.current['q'] || keysPressedRef.current['arrowleft']) dx -= 1;
            if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) dx += 1;

            if (joystickDirectionRef.current.dx !== 0 || joystickDirectionRef.current.dy !== 0) {
                dx = joystickDirectionRef.current.dx;
                dy = joystickDirectionRef.current.dy;
            }

            if (dx !== 0 || dy !== 0) {
                playerLastMoveTimeRef.current = now;
                const mag = Math.sqrt(dx * dx + dy * dy);
                dx /= mag;
                dy /= mag;

                lastMovementDirectionRef.current = { dx, dy };

                const currentTile = getTileAt(cameraRef.current.x, cameraRef.current.y);
                let speed = currentTile.type === 'water' ? playerStateRef.current.speedWater : playerStateRef.current.speedGround;
                
                // Appliquer le bonus de vitesse en mode rage
                if (isRageActiveRef.current) {
                    speed *= RAGE_SPEED_MULTIPLIER;
                }
                
                if (isDashingRef.current) {
                    speed *= DASH_SPEED_MULTIPLIER;
                }
                
                cameraRef.current.x += dx * speed * timeScale;
                cameraRef.current.y += dy * speed * timeScale;

                // Vérifier si le joueur est sorti de la map
                const playerTileX = Math.floor(cameraRef.current.x / TILE_SIZE);
                const playerTileY = Math.floor(cameraRef.current.y / TILE_SIZE);
                
                if (playerTileX < 0 || playerTileX >= MAP_WIDTH || playerTileY < 0 || playerTileY >= MAP_HEIGHT) {
                    // Le joueur est sorti de la map
                    playerStateRef.current.health = 0;
                    spawnBloodParticles(cameraRef.current.x, cameraRef.current.y, 100, '#ff0000');
                    
                    // Effet visuel dramatique
                    flashEffectRef.current = {
                        active: true,
                        startTime: now,
                        x: cameraRef.current.x,
                        y: cameraRef.current.y,
                        duration: 300,
                        radius: 200
                    };
                    
                    const finalScore = totalXpForLevel(playerStateRef.current.level) + xpRef.current;
                    handleGameOver(Math.floor(finalScore));
                    setIsGameOver(true);
                    return;
                }

                // Empêcher le joueur de sortir de la carte
                const halfSize = PLAYER_SIZE / 2;
                cameraRef.current.x = Math.max(halfSize, Math.min(cameraRef.current.x, MAP_WIDTH * TILE_SIZE - halfSize));
                cameraRef.current.y = Math.max(halfSize, Math.min(cameraRef.current.y, MAP_HEIGHT * TILE_SIZE - halfSize));
            }

            if (!introAnimationRef.current.isPlaying) {
                // Grenade Logic
                const grenadesToRemove = new Set<number>();
                grenadesRef.current.forEach(grenade => {
                    if (grenade.isActivated) {
                        // Mettre à jour l'alpha des particules de la traînée
                        grenade.trail.forEach(particle => {
                            particle.alpha -= 0.03 * timeScale;
                        });
                        // Supprimer les particules invisibles
                        grenade.trail = grenade.trail.filter(particle => particle.alpha > 0);

                        if (now > grenade.activationTime + GRENADE_EXPLOSION_DELAY) {
                            // Explode
                            console.log('💥 Grenade exploding:', {
                                x: grenade.x,
                                y: grenade.y,
                                id: grenade.id
                            });
                            grenadesToRemove.add(grenade.id);
                    
                            // Add explosion visual effect
                            aoeEffectsRef.current.push({
                                id: now,
                                x: grenade.x,
                                y: grenade.y,
                                startTime: now,
                                duration: 400,
                                radius: GRENADE_EXPLOSION_RADIUS,
                            });
                    
                            // Deal damage
                            zombiesRef.current.forEach(zombie => {
                                const distSq = (grenade.x - zombie.x)**2 + (grenade.y - zombie.y)**2;
                                if (distSq < GRENADE_EXPLOSION_RADIUS * GRENADE_EXPLOSION_RADIUS) {
                                    zombie.health -= GRENADE_EXPLOSION_DAMAGE;
                                    if (zombie.health <= 0) {
                                        handleZombieDeath(zombie, now);
                                    }
                                    spawnBloodParticles(zombie.x, zombie.y, 10, '#ffa500');
                                }
                            });
                        }
                    } else {
                        // Grenade is traveling
                        if (grenade.distanceTraveled < GRENADE_MAX_DISTANCE) {
                            const moveX = grenade.vx * timeScale;
                            const moveY = grenade.vy * timeScale;
                            grenade.x += moveX;
                            grenade.y += moveY;
                            grenade.distanceTraveled += Math.hypot(moveX, moveY);
                            grenade.angle += 0.1 * timeScale;

                            // Ajouter des particules à la traînée
                            grenade.trail.push({
                                x: grenade.x,
                                y: grenade.y,
                                alpha: 1,
                                size: 8 + Math.random() * 4
                            });

                            // Si la grenade a atteint sa distance maximale, elle s'active
                            if (grenade.distanceTraveled >= GRENADE_MAX_DISTANCE) {
                                grenade.isActivated = true;
                                grenade.activationTime = now;
                            }
                        }
                    }
                });
                
                if (grenadesToRemove.size > 0) {
                    grenadesRef.current = grenadesRef.current.filter(g => !grenadesToRemove.has(g.id));
                }

                // Continuous spawn logic - Two-phase system
                let spawnInterval: number;
                const playerLevel = playerStateRef.current.level;

                if (playerLevel < SPAWN_XP_SCALING_START_LEVEL) {
                    // Phase 1: Difficulté basée sur le niveau
                    spawnInterval = SPAWN_BASE_INTERVAL * Math.pow(SPAWN_RATE_GROWTH, playerLevel - 1);
                } else {
                    // Phase 2: Difficulté exponentielle par vagues d'XP
                    const intervalAtLvl4Start = SPAWN_BASE_INTERVAL * Math.pow(SPAWN_RATE_GROWTH, SPAWN_XP_SCALING_START_LEVEL - 1);
                    const totalXpAtLvl4Start = totalXpForLevel(SPAWN_XP_SCALING_START_LEVEL);
                    const currentTotalXp = totalXpForLevel(playerLevel) + xpRef.current;
                    const xpGainedAfterLvl4 = Math.max(0, currentTotalXp - totalXpAtLvl4Start);
                    
                    const waveCount = Math.floor(xpGainedAfterLvl4 / SPAWN_WAVE_XP_THRESHOLD);

                    spawnInterval = intervalAtLvl4Start * Math.pow(SPAWN_WAVE_DIFFICULTY_MULTIPLIER, waveCount);
                }
                
                if(isIdle) spawnInterval *= 0.5; // Spawn 2x plus vite si inactif

                if (now > lastZombieSpawnRef.current + spawnInterval) {
                    lastZombieSpawnRef.current = now;

                    let angle;
                    // Après l'événement des zombies violets, le spawn devient plus agressif
                    if (purpleCircleTriggeredForLevelRef.current.size > 0 && (dx !== 0 || dy !== 0)) {
                        const movementAngle = Math.atan2(dy, dx);
                        // "Opération Tenaille"
                        if (Math.random() < 0.7) { // 70% de chance de spawn devant
                            // Cône de 120 degrés devant le joueur
                            angle = movementAngle + (Math.random() - 0.5) * (Math.PI * 2 / 3);
                        } else { // 30% de chance de spawn sur les flancs/arrière pour encercler
                            // Cône de 90 degrés derrière le joueur
                            angle = movementAngle + Math.PI + (Math.random() - 0.5) * (Math.PI / 2);
                        }
                    } else {
                        // Spawn aléatoire normal
                        angle = Math.random() * 2 * Math.PI;
                    }

                    const spawnDist = 800; // FIX: Use a fixed spawn distance
                    
                    const x = cameraRef.current.x + spawnDist * Math.cos(angle);
                    const y = cameraRef.current.y + spawnDist * Math.sin(angle);
                    
                    let health = 1;
                    let color = ZOMBIE_GREEN_COLOR;

                    const roll = Math.random();
                    if (redZombiesUnlockedRef.current && roll < ZOMBIE_RED_CHANCE) {
                        // Spawn Rouge
                        color = ZOMBIE_RED_COLOR;
                        health = 2;
                    } else if (playerStateRef.current.level >= 2 && roll < ZOMBIE_BLUE_CHANCE + ZOMBIE_RED_CHANCE) {
                        // Spawn Bleu
                        color = ZOMBIE_BLUE_COLOR;
                        health = 2;
                    }
                    
                    const newZombie: Zombie = {
                        id: now + Math.random(), x, y, health, maxHealth: health, color,
                    };
                    zombiesRef.current.push(newZombie);
                }

                // Zombie movement
                zombiesRef.current.forEach(zombie => {
                    let speed: number;
                    let moveDx = 0;
                    let moveDy = 0;

                    if (zombie.direction) { // Logique pour les zombies jaunes
                        speed = playerStateRef.current.speedGround * YELLOW_ZOMBIE_SPEED_MULTIPLIER;
                        moveDx = zombie.direction.dx * speed;
                        moveDy = zombie.direction.dy * speed;
                    } else { // Logique pour les autres zombies
                        if (zombie.color === ZOMBIE_RED_COLOR) {
                            speed = ZOMBIE_SPEED * 1.2 + zombieSpeedBonusRef.current;
                        } else {
                            speed = ZOMBIE_SPEED + zombieSpeedBonusRef.current;
                        }
                        
                        // Ralentissement spécifique pour les "chaises" (violet)
                        if (zombie.color === PURPLE_ZOMBIE_COLOR) {
                            speed *= 0.85; // 15% plus lents
                        }
                        
                        // Poison slow
                        poisonZonesRef.current.forEach(zone => {
                            if (zone.active && Math.hypot(zombie.x - zone.x, zombie.y - zone.y) < POISON_ZONE_RADIUS) {
                                speed *= (1 - POISON_ZONE_SLOW);
                            }
                        });
                        
                        // --- GRENADE ATTRACTION ---
                        let target: { x: number; y: number } = cameraRef.current;
                        let isAttracted = false;

                        let closestGrenade: Grenade | null = null;
                        let minGrenadeDistSq = GRENADE_ATTRACTION_RADIUS * GRENADE_ATTRACTION_RADIUS;

                        grenadesRef.current.forEach(grenade => {
                            if (grenade.isActivated) { // Only attract to landed grenades
                                const distSq = (zombie.x - grenade.x)**2 + (zombie.y - grenade.y)**2;
                                if (distSq < minGrenadeDistSq) {
                                    minGrenadeDistSq = distSq;
                                    closestGrenade = grenade;
                                }
                            }
                        });

                        if (closestGrenade) {
                            target = closestGrenade;
                            isAttracted = true;
                        }
                        // --- END GRENADE ATTRACTION ---
                        
                        const dx = target.x - zombie.x;
                        const dy = target.y - zombie.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);

                        // Si attiré, le zombie s'arrête près de la grenade, sinon il fonce sur le joueur
                        const stopDistance = isAttracted ? ZOMBIE_SIZE / 2 : 1;
                        if (dist > stopDistance) {
                            moveDx = (dx / dist) * speed;
                            moveDy = (dy / dist) * speed;
                        }
                    }

                    // Application du recul (knockback) avec friction
                    if (zombie.knockbackVx || zombie.knockbackVy) {
                        zombie.knockbackVx = zombie.knockbackVx || 0;
                        zombie.knockbackVy = zombie.knockbackVy || 0;

                        moveDx += zombie.knockbackVx;
                        moveDy += zombie.knockbackVy;

                        // Friction pour le ralentissement
                        const friction = 0.96; 
                        zombie.knockbackVx *= Math.pow(friction, timeScale);
                        zombie.knockbackVy *= Math.pow(friction, timeScale);

                        if (Math.hypot(zombie.knockbackVx, zombie.knockbackVy) < 0.1) {
                            zombie.knockbackVx = 0;
                            zombie.knockbackVy = 0;
                        }
                    }

                    zombie.x += moveDx * timeScale;
                    zombie.y += moveDy * timeScale;
                });

                // --- COLLISION RESOLUTION ---
                // This unified loop runs multiple times to let physics "settle",
                // preventing objects from getting stuck or being pushed too hard (teleporting).
                for (let i = 0; i < 5; i++) {
                    // Collisions Zombie-Zombie
                    for (let j = 0; j < zombiesRef.current.length; j++) {
                        for (let k = j + 1; k < zombiesRef.current.length; k++) {
                            const z1 = zombiesRef.current[j];
                            const z2 = zombiesRef.current[k];

                            // Yellow zombies (post-its) pass through other entities
                            if (z1.color === YELLOW_ZOMBIE_COLOR || z2.color === YELLOW_ZOMBIE_COLOR) {
                                continue;
                            }

                            const dzx = z2.x - z1.x;
                            const dzy = z2.y - z1.y;
                            const distSq = dzx * dzx + dzy * dzy;
                            const minDis = ZOMBIE_SIZE + 6; // +2 pour un petit espace entre eux
                            if (distSq > 0 && distSq < minDis * minDis) {
                                const dist = Math.sqrt(distSq);
                                const overlap = (minDis - dist) * 0.5;
                                const pushX = (dzx / dist) * overlap;
                                const pushY = (dzy / dist) * overlap;
                                z1.x -= pushX;
                                z1.y -= pushY;
                                z2.x += pushX;
                                z2.y += pushY;
                            }
                        }
                    }

                    // Collisions Joueur-Zombie (Physics push-out)
                    for (const zombie of zombiesRef.current) {
                        if (zombie.color === YELLOW_ZOMBIE_COLOR) continue;

                        const vecX = cameraRef.current.x - zombie.x;
                        const vecY = cameraRef.current.y - zombie.y;
                        const distSq = vecX * vecX + vecY * vecY;
                        const minDis = PLAYER_SIZE / 2 + ZOMBIE_SIZE / 2;

                        if (distSq > 0 && distSq < minDis * minDis) {
                            const distance = Math.sqrt(distSq);
                            const overlap = minDis - distance;
                            
                            const pushX = (vecX / distance) * overlap;
                            const pushY = (vecY / distance) * overlap;
                            
                            cameraRef.current.x += pushX;
                            cameraRef.current.y += pushY;
                        }
                    }
                }

                // After all physics is resolved, check for damage
                for (const zombie of zombiesRef.current) {
                    const pzx = cameraRef.current.x - zombie.x;
                    const pzy = cameraRef.current.y - zombie.y;
                    const distSq = pzx * pzx + pzy * pzy;
                    const minDis = PLAYER_SIZE / 2 + ZOMBIE_SIZE / 2;
                    if (distSq < minDis * minDis) {
                        const isBeingKnockedBack = zombie.knockbackVx || zombie.knockbackVy;
                        if (now > playerHitCooldownEndRef.current && !isBeingKnockedBack && !isDashingRef.current) {
                            playerStateRef.current.health -= ZOMBIE_DAMAGE;
                            playerHitCooldownEndRef.current = now + PLAYER_HIT_COOLDOWN;
                            spawnBloodParticles(cameraRef.current.x, cameraRef.current.y, 40, '#ff4d4d');
                            
                            if (playerStateRef.current.health <= 0) {
                                playerStateRef.current.health = 0;
                                const finalScore = totalXpForLevel(playerStateRef.current.level) + xpRef.current;
                                handleGameOver(Math.floor(finalScore));
                                setIsGameOver(true);
                            }
                        }
                    }
                }

                // Vérifier si le joueur est sorti de la map
                const playerTileX = Math.floor(cameraRef.current.x / TILE_SIZE);
                const playerTileY = Math.floor(cameraRef.current.y / TILE_SIZE);
                
                if (playerTileX < 0 || playerTileX >= MAP_WIDTH || playerTileY < 0 || playerTileY >= MAP_HEIGHT) {
                    // Le joueur est sorti de la map
                    playerStateRef.current.health = 0;
                    spawnBloodParticles(cameraRef.current.x, cameraRef.current.y, 100, '#ff0000');
                    
                    // Effet visuel dramatique
                    flashEffectRef.current = {
                        active: true,
                        startTime: now,
                        x: cameraRef.current.x,
                        y: cameraRef.current.y,
                        duration: 300,
                        radius: 200
                    };
                    
                    const finalScore = totalXpForLevel(playerStateRef.current.level) + xpRef.current;
                    handleGameOver(Math.floor(finalScore));
                    setIsGameOver(true);
                }

                // Firing logic
                const fireRate = isRageActiveRef.current ? playerStateRef.current.fireRate / RAGE_FIRE_RATE_MULTIPLIER : playerStateRef.current.fireRate;
                if (now > lastFireTimeRef.current + fireRate) {
                    let closestZombie: Zombie | null = null;
                    let minDistanceSq = PLAYER_FIRE_RANGE * PLAYER_FIRE_RANGE;

                    zombiesRef.current.forEach(zombie => {
                        const distanceSq = (cameraRef.current.x - zombie.x)**2 + (cameraRef.current.y - zombie.y)**2;
                        if (distanceSq < minDistanceSq) {
                            minDistanceSq = distanceSq;
                            closestZombie = zombie;
                        }
                    });

                    if (closestZombie) {
                        lastFireTimeRef.current = now;
                        orbsRef.current.push({
                            id: now + Math.random(),
                            x: cameraRef.current.x,
                            y: cameraRef.current.y,
                            targetId: (closestZombie as Zombie).id,
                        });
                    }
                }

                // Orb movement & collision
                const orbsToRemove = new Set<number>();
                zombiesRef.current.forEach(zombie => {
                    // Despawn yellow zombies by lifetime
                    if (zombie.color === YELLOW_ZOMBIE_COLOR && zombie.spawnTime) {
                        if (now > zombie.spawnTime + YELLOW_ZOMBIE_LIFETIME) {
                            return false; // Supprime le zombie
                        }
                    }

                    orbsRef.current.forEach(orb => {
                        if (orb.targetId === zombie.id) {
                            const distSq = (orb.x - zombie.x)**2 + (orb.y - zombie.y)**2;
                            if (distSq < (ZOMBIE_SIZE / 2)**2) {
                                orbsToRemove.add(orb.id);
                                zombie.health -= playerStateRef.current.damage;
                                
                                if (zombie.health <= 0) {
                                    handleZombieDeath(zombie, now);
                                }

                                const knockbackAngle = Math.atan2(zombie.y - orb.y, zombie.x - orb.x);
                                zombie.knockbackVx = Math.cos(knockbackAngle) * ORB_KNOCKBACK_STRENGTH;
                                zombie.knockbackVy = Math.sin(knockbackAngle) * ORB_KNOCKBACK_STRENGTH;
                            }
                        }
                    });

                    if (zombie.health <= 0) {
                        xpRef.current += ZOMBIE_KILL_XP;
                        coinsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
                        spawnBloodParticles(zombie.x, zombie.y, 25, '#8b0000'); // Sang des zombies (rouge foncé)
                        // Drop de fiole
                        if (Math.random() < HEALTH_POTION_DROP_CHANCE) {
                            healthPotionsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
                        }
                        return false;
                    }
                    return true;
                });
                orbsRef.current = orbsRef.current.filter(o => !orbsToRemove.has(o.id));
                
                // Update remaining orbs
                orbsRef.current.forEach(orb => {
                    const targetZombie = zombiesRef.current.find(z => z.id === orb.targetId);
                    if (targetZombie) {
                        const dx = targetZombie.x - orb.x;
                        const dy = targetZombie.y - orb.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 1) {
                            orb.x += (dx / dist) * playerStateRef.current.orbSpeed * timeScale;
                            orb.y += (dy / dist) * playerStateRef.current.orbSpeed * timeScale;
                        }
                    } else { // Target is gone
                        orbsToRemove.add(orb.id);
                    }
                });
                if(orbsToRemove.size > 0) {
                    orbsRef.current = orbsRef.current.filter(o => !orbsToRemove.has(o.id));
                }

                // Perk logic
                // Poison
                poisonZonesRef.current.forEach(zone => {
                    zone.timer -= deltaTime; 
                    if(zone.timer <= 0) {
                        zone.active = !zone.active;
                        zone.timer = zone.active ? POISON_DURATION : POISON_COOLDOWN;
                        if(zone.active) {
                            zone.x = cameraRef.current.x;
                            zone.y = cameraRef.current.y;
                        }
                    }

                    if(zone.active) {
                        zombiesRef.current.forEach(zombie => {
                            if (Math.hypot(zombie.x - zone.x, zombie.y - zone.y) < POISON_ZONE_RADIUS) {
                                zombie.health -= POISON_ZONE_DPS * 0.016; // DPS as damage per frame
                            }
                        });
                    }
                });

                // Lightning
                if (playerStateRef.current.activePerks.has('LIGHTNING') && now > lastLightningTimeRef.current + LIGHTNING_COOLDOWN) {
                    if (zombiesRef.current.length > 0) {
                        lastLightningTimeRef.current = now;
                        const randomZombieIndex = Math.floor(Math.random() * zombiesRef.current.length);
                        const strikeCenter = { ...zombiesRef.current[randomZombieIndex] }; // Copie pour éviter les pbs de référence
                        
                        lightningsRef.current.push({ id: now + Math.random(), x: strikeCenter.x, y: strikeCenter.y, alpha: 1.0 });

                        zombiesRef.current.forEach(zombie => {
                            if (Math.hypot(zombie.x - strikeCenter.x, zombie.y - strikeCenter.y) < LIGHTNING_RADIUS) {
                                zombie.health -= LIGHTNING_DAMAGE;
                                if (zombie.health <= 0) {
                                    handleZombieDeath(zombie, now);
                                }
                                const newLightning: Lightning = {
                                    id: now + Math.random(),
                                    x: zombie.x + (Math.random() - 0.5) * 40,
                                    y: strikeCenter.y,
                                    alpha: 1.0
                                };
                                lightningsRef.current.push(newLightning);
                            }
                        });
                    }
                }

                // Update lightning effects
                lightningsRef.current.forEach(l => l.alpha -= 0.05 * timeScale);
                lightningsRef.current = lightningsRef.current.filter(l => l.alpha > 0);

                // Piercing Blade Perk
                if (playerStateRef.current.activePerks.has('PIERCING_BLADE') && now > lastBladeTimeRef.current + PIERCING_BLADE_COOLDOWN) {
                    lastBladeTimeRef.current = now;
                    const direction = lastMovementDirectionRef.current;
                    bladesRef.current.push({
                        id: now,
                        x: cameraRef.current.x,
                        y: cameraRef.current.y,
                        dx: direction.dx,
                        dy: direction.dy,
                        distanceTraveled: 0,
                        angle: 0,
                        hitZombieIds: new Set(),
                    });
                }

                // Update Piercing Blades
                bladesRef.current.forEach(blade => {
                    blade.x += blade.dx * PIERCING_BLADE_SPEED * timeScale;
                    blade.y += blade.dy * PIERCING_BLADE_SPEED * timeScale;
                    blade.distanceTraveled += PIERCING_BLADE_SPEED * timeScale;
                    blade.angle += 0.2 * timeScale; // Rotation visuelle

                    zombiesRef.current.forEach(zombie => {
                        if (!blade.hitZombieIds.has(zombie.id)) {
                            const dist = Math.hypot(blade.x - zombie.x, blade.y - zombie.y);
                            if (dist < ZOMBIE_SIZE / 2 + PIERCING_BLADE_LENGTH / 2) {
                                zombie.health -= PIERCING_BLADE_DAMAGE;
                                if (zombie.health <= 0) {
                                    handleZombieDeath(zombie, now);
                                }
                                blade.hitZombieIds.add(zombie.id);
                                spawnBloodParticles(zombie.x, zombie.y, 5, '#cccccc');
                            }
                        }
                    });
                });
                // Nettoyage des lames qui ont atteint leur portée et des zombies morts
                bladesRef.current = bladesRef.current.filter(b => b.distanceTraveled < PIERCING_BLADE_RANGE);
                
                const newZombies: Zombie[] = [];
                zombiesRef.current.forEach(zombie => {
                    if (zombie.health <= 0) {
                        handleZombieDeath(zombie, now);
                    } else {
                        newZombies.push(zombie);
                    }
                });
                zombiesRef.current = newZombies;

                // Health Potion collection
                let potionConsumedThisFrame = false;
                healthPotionsRef.current = healthPotionsRef.current.filter(potion => {
                    if (potionConsumedThisFrame) return true; // Ne pas consommer plus d'une fiole par frame

                    const distSq = (cameraRef.current.x - potion.x)**2 + (cameraRef.current.y - potion.y)**2;
                    if (distSq < (PLAYER_SIZE / 2 + HEALTH_POTION_SIZE / 2)**2) {
                        playerStateRef.current.health = playerStateRef.current.maxHealth;
                        potionConsumedThisFrame = true;
                        return false; // Supprime la fiole
                    }
                    return true;
                });

                // Rage Potion collection
                ragePotionsRef.current = ragePotionsRef.current.filter(potion => {
                    const distSq = (cameraRef.current.x - potion.x)**2 + (cameraRef.current.y - potion.y)**2;
                    if (distSq < (PLAYER_SIZE / 2 + RAGE_POTION_SIZE / 2)**2) {
                        if (!isRageActiveRef.current) {
                           isRageActiveRef.current = true;
                        }
                        rageEndTimeRef.current = now + RAGE_DURATION;
                        return false; // Supprime la fiole
                    }
                    return true;
                });

                // Coin collection
                coinsRef.current = coinsRef.current.filter(coin => {
                    const distSq = (cameraRef.current.x - coin.x)**2 + (cameraRef.current.y - coin.y)**2;
                    if (distSq < (PLAYER_SIZE / 2 + COIN_SIZE / 2)**2) {
                        xpRef.current += COIN_XP_VALUE;
                        return false;
                    }
                    return true;
                });

                // --- Purple Zombie Circle Event Trigger ---
                const currentLevel = playerStateRef.current.level;
                if (!purpleCircleTriggeredForLevelRef.current.has(currentLevel)) {
                    let trigger = false;
                    let xpThreshold = 0;

                    if (currentLevel === 2) {
                        xpThreshold = xpForNextLevel(2) / 2; // Mid-level
                        if (xpRef.current >= xpThreshold) {
                            trigger = true;
                        }
                    } else if (currentLevel > 2) {
                        xpThreshold = xpForNextLevel(currentLevel) * 0.75; // 3/4 of the way
                        if (xpRef.current >= xpThreshold) {
                            trigger = true;
                        }
                    }

                    if (trigger) {
                        purpleCircleTriggeredForLevelRef.current.add(currentLevel);
                        spawnPurpleCircle(cameraRef.current.x, cameraRef.current.y);
                    }
                }

                // Red Zombie Unlock Check
                if (!redZombiesUnlockedRef.current && playerStateRef.current.level === 3) {
                    const xpToReachLevel4 = xpForNextLevel(3);
                    const oneThirdXp = xpToReachLevel4 / 3;
                    if (xpRef.current >= oneThirdXp) {
                        redZombiesUnlockedRef.current = true;
                    }
                }

                // Yellow Zombie Unlock
                if (!yellowZombiesUnlockedRef.current && playerStateRef.current.level === 3) {
                    const xpToReachLevel4 = xpForNextLevel(3);
                    const oneThirdXp = xpToReachLevel4 / 3;
                    if (xpRef.current >= oneThirdXp) {
                        yellowZombiesUnlockedRef.current = true;
                        lastYellowSpawnTimeRef.current = now; // Pour qu'ils apparaissent tout de suite
                    }
                }

                // Yellow Zombie Rush Event
                if (yellowZombiesUnlockedRef.current && now > lastYellowSpawnTimeRef.current + YELLOW_ZOMBIE_SPAWN_INTERVAL) {
                    lastYellowSpawnTimeRef.current = now;
                    const canvas = canvasRef.current;
                    if(canvas){
                        const side = Math.floor(Math.random() * 4);
                        let startX=0, startY=0, dirX=0, dirY=0;
                        const viewBounds = {
                            left: cameraRef.current.x - canvas.width / 2, right: cameraRef.current.x + canvas.width / 2,
                            top: cameraRef.current.y - canvas.height / 2, bottom: cameraRef.current.y + canvas.height / 2,
                        };

                        switch (side) {
                            case 0: // Haut
                                startX = cameraRef.current.x; startY = viewBounds.top - ZOMBIE_SIZE;
                                dirX = 0; dirY = 1;
                                break;
                            case 1: // Droite
                                startX = viewBounds.right + ZOMBIE_SIZE; startY = cameraRef.current.y;
                                dirX = -1; dirY = 0;
                                break;
                            case 2: // Bas
                                startX = cameraRef.current.x; startY = viewBounds.bottom + ZOMBIE_SIZE;
                                dirX = 0; dirY = -1;
                                break;
                            default: // Gauche
                                startX = viewBounds.left - ZOMBIE_SIZE; startY = cameraRef.current.y;
                                dirX = 1; dirY = 0;
                                break;
                        }

                        for (let i = 0; i < YELLOW_ZOMBIE_LINE_COUNT; i++) {
                            const offset = (i - Math.floor(YELLOW_ZOMBIE_LINE_COUNT / 2)) * ZOMBIE_SIZE * 1.5;
                            const newZombie: Zombie = {
                                id: now + Math.random() + i,
                                x: startX + (dirY * offset), y: startY + (dirX * offset * -1),
                                health: YELLOW_ZOMBIE_HEALTH, maxHealth: YELLOW_ZOMBIE_HEALTH,
                                color: YELLOW_ZOMBIE_COLOR,
                                direction: { dx: dirX, dy: dirY },
                                spawnTime: now
                            };
                            zombiesRef.current.push(newZombie);
                        }
                    }
                }

                // --- Level Up ---
                const requiredXp = xpForNextLevel(playerStateRef.current.level);
                if (xpRef.current >= requiredXp) {
                    xpRef.current -= requiredXp;
                    playerStateRef.current.level++;
                    playerStateRef.current.health = playerStateRef.current.maxHealth; // Restaure la santé au level up

                    // Débloque les zombies rouges et jaunes à certains niveaux
                    if (playerStateRef.current.level === 3) redZombiesUnlockedRef.current = true;
                    if (playerStateRef.current.level === 5) yellowZombiesUnlockedRef.current = true;

                    const perks = getRandomPerks();
                    if (perks.length > 0) {
                        setAvailablePerks(perks);
                        setIsLevelingUp(true);
                    }
                    // Si plus de perks, le jeu continue sans pause.
                }

                // --- Logique du classement en direct ---
                const currentTotalXp = totalXpForLevel(playerStateRef.current.level) + xpRef.current;
                if (leaderboard.length > 0) {
                    let rank = leaderboard.length + 1;
                    for (let i = 0; i < leaderboard.length; i++) {
                        if (currentTotalXp > leaderboard[i].score) {
                            rank = i + 1;
                            break;
                        }
                    }

                    if (playerRankRef.current === null) {
                        playerRankRef.current = rank;
                    } else if (rank < playerRankRef.current) {
                        // Player has climbed the rankings!
                        const rankUpMessages = ["Well done!", "Superb!", "Keep going!", "Excellent!", "Incredible!"];
                        const message = rankUpMessages[Math.floor(Math.random() * rankUpMessages.length)];
                        setRankUpAnimation({ show: true, rank, text: message });
                        setTimeout(() => setRankUpAnimation({ show: false, rank: 0, text: '' }), 3000); // Animation de 3s
                    }
                    playerRankRef.current = rank;
                }
                // --- Fin de la logique du classement ---
            }

            // Coffee Bubbles Logic
            if(canvasRef.current) {
                const visibleTilesStartY = Math.max(0, Math.floor((cameraRef.current.y - canvasRef.current.height / 2) / TILE_SIZE));
                const visibleTilesEndY = Math.min(MAP_HEIGHT, visibleTilesStartY + Math.ceil(canvasRef.current.height / TILE_SIZE) + 1);
                const visibleTilesStartX = Math.max(0, Math.floor((cameraRef.current.x - canvasRef.current.width / 2) / TILE_SIZE));
                const visibleTilesEndX = Math.min(MAP_WIDTH, visibleTilesStartX + Math.ceil(canvasRef.current.width / TILE_SIZE) + 1);
    
                for (let y = visibleTilesStartY; y < visibleTilesEndY; y++) {
                    for (let x = visibleTilesStartX; x < visibleTilesEndX; x++) {
                        if (map[y][x].type === 'water' && Math.random() < 0.015) {
                            const life = (40 + Math.random() * 50) * (1000/60); // 0.6 to 1.5 seconds life in ms
                            bubblesRef.current.push({
                                id: now + Math.random(),
                                x: x * TILE_SIZE + Math.random() * TILE_SIZE,
                                y: y * TILE_SIZE + Math.random() * TILE_SIZE,
                                radius: 0,
                                maxLife: life,
                                life: life,
                            });
                        }
                    }
                }
            }

            bubblesRef.current.forEach(bubble => {
                bubble.life -= timeScale;
                const growthPhase = 1 - (bubble.life / bubble.maxLife);
                bubble.radius = Math.sin(growthPhase * Math.PI) * 3; // Bubble grows and shrinks, max radius 3
            });
            bubblesRef.current = bubblesRef.current.filter(b => b.life > 0);
            
            // Mettre à jour les particules de sang
            bloodParticlesRef.current.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // Gravité
                p.life--;
            });
            bloodParticlesRef.current = bloodParticlesRef.current.filter(p => p.life > 0);

            // Mettre à jour les particules de dash
            dashParticlesRef.current.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= timeScale
            });
            dashParticlesRef.current = dashParticlesRef.current.filter(p => p.life > 0);

            // Update AoE effects
            aoeEffectsRef.current = aoeEffectsRef.current.filter(effect => now < effect.startTime + effect.duration);

            // Gestion de la disparition des taches de sang
            bloodstainsRef.current = bloodstainsRef.current.filter(stain => {
                const timeSinceFadeStart = now - stain.fadeStartTime;
                return timeSinceFadeStart < 2000; // Remove after 2 seconds of fade
            });
        };
        
        const draw = (now: number) => {
            if (!context || !canvas) return;
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.save();
            
            const zoom = introAnimationRef.current.currentZoom;
            context.translate(canvas.width / 2, canvas.height / 2);
            context.scale(zoom, zoom);
            context.translate(-cameraRef.current.x, -cameraRef.current.y);
            
            // Draw map (Thème bureau: moquette et taches de café)
            const startY = Math.max(0, Math.floor((cameraRef.current.y - canvas.height / 2 / zoom) / TILE_SIZE));
            const endY = Math.min(MAP_HEIGHT, startY + Math.ceil(canvas.height / TILE_SIZE / zoom) + 2);
            const startX = Math.max(0, Math.floor((cameraRef.current.x - canvas.width / 2 / zoom) / TILE_SIZE));
            const endX = Math.min(MAP_WIDTH, startX + Math.ceil(canvas.width / TILE_SIZE / zoom) + 2);

            for (let y = startY; y < endY; y++) {
                for (let x = startX; x < endX; x++) {
                    const tileX = x * TILE_SIZE;
                    const tileY = y * TILE_SIZE;

                    if (map[y][x].type === 'ground') {
                        context.fillStyle = '#e8e8e8';
                        context.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        context.fillStyle = 'rgba(0, 0, 0, 0.1)';
                        for(let i = 0; i < TILE_SIZE; i += 4) {
                            for(let j = 0; j < TILE_SIZE; j += 4) {
                                if ((i / 4 + j / 4) % 2 === 0) {
                                    context.fillRect(tileX + i, tileY + j, 2, 2);
                                }
                            }
                        }
                    } else { // 'water' is devenu 'café'
                        context.fillStyle = '#4a5568';
                        context.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        context.fillStyle = '#693d3d';
                        context.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        context.fillStyle = 'rgba(255, 255, 255, 0.05)';
                        for(let i = 0; i < 3; i++) {
                            context.beginPath();
                            context.arc(
                                tileX + Math.random() * TILE_SIZE, 
                                tileY + Math.random() * TILE_SIZE, 
                                Math.random() * 2 + 1, 
                                0, Math.PI * 2
                            );
                            context.fill();
                        }
                        const isBoundary = (neighbor: Tile | undefined) => !neighbor || neighbor.type === 'ground';
                        context.strokeStyle = '#532e2e';
                        context.lineWidth = 2;
                        if (isBoundary(map[y-1]?.[x])) { context.beginPath(); context.moveTo(tileX, tileY + 1); context.lineTo(tileX + TILE_SIZE, tileY + 1); context.stroke(); }
                        if (isBoundary(map[y+1]?.[x])) { context.beginPath(); context.moveTo(tileX, tileY + TILE_SIZE - 1); context.lineTo(tileX + TILE_SIZE, tileY + TILE_SIZE - 1); context.stroke(); }
                        if (isBoundary(map[y]?.[x-1])) { context.beginPath(); context.moveTo(tileX + 1, tileY); context.lineTo(tileX + 1, tileY + TILE_SIZE); context.stroke(); }
                        if (isBoundary(map[y]?.[x+1])) { context.beginPath(); context.moveTo(tileX + TILE_SIZE - 1, tileY); context.lineTo(tileX + TILE_SIZE - 1, tileY + TILE_SIZE); context.stroke(); }
                    }
                }
            }
            
            // Draw bloodstains
            bloodstainsRef.current.forEach(stain => {
                const timeSinceFadeStart = now - stain.fadeStartTime;
                let fadeAlpha = 1;
                
                if (timeSinceFadeStart > 0) {
                    fadeAlpha = Math.max(0, 1 - (timeSinceFadeStart / 2000));
                }

                if (bloodImageRef.current) {
                    context.save();
                    
                    // Configurer la transparence
                    context.globalAlpha = fadeAlpha;
                    
                    // Positionner au centre de la tache
                    context.translate(stain.x, stain.y);
                    
                    // Appliquer la rotation
                    context.rotate(stain.rotation);
                    
                    // Appliquer l'échelle
                    const size = stain.radius * 2 * stain.scale;
                    context.scale(stain.scale, stain.scale);
                    
                    // Dessiner l'image
                    context.drawImage(
                        bloodImageRef.current,
                        -size / 2,
                        -size / 2,
                        size,
                        size
                    );
                    
                    context.restore();
                }
            });

            // Draw poison zones (Thème bureau: Flaque de café renversé)
            poisonZonesRef.current.forEach(zone => {
                if (zone.active) {
                    const gradient = context.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, POISON_ZONE_RADIUS);
                    gradient.addColorStop(0, "rgba(101, 67, 33, 0.8)");
                    gradient.addColorStop(0.4, "rgba(139, 69, 19, 0.6)");
                    gradient.addColorStop(0.8, "rgba(160, 82, 45, 0.4)");
                    gradient.addColorStop(1, "rgba(160, 82, 45, 0.1)");
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(zone.x, zone.y, POISON_ZONE_RADIUS, 0, Math.PI * 2);
                    context.fill();
                }
            });

            // Draw coins (Thème bureau: Punaises)
            coinsRef.current.forEach(coin => {
                context.fillStyle = '#d69e2e';
                context.beginPath();
                context.arc(coin.x, coin.y, COIN_SIZE / 2, 0, Math.PI * 2);
                context.fill();
            });
            
            // Draw Health Potions
            healthPotionsRef.current.forEach(potion => {
                if (healthPotionImageRef.current) {
                    context.save();
                    
                    // Effet de pulsation
                    const scale = 1 + Math.sin(now / 100) * 0.1;
                    const size = HEALTH_POTION_SIZE * scale;
                    
                    // Aura verte pulsante
                    const auraSize = size * 1.5;
                    const gradient = context.createRadialGradient(potion.x, potion.y, 0, potion.x, potion.y, auraSize);
                    gradient.addColorStop(0, 'rgba(104, 211, 145, 0.3)');
                    gradient.addColorStop(1, 'rgba(104, 211, 145, 0)');
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(potion.x, potion.y, auraSize, 0, 2 * Math.PI);
                    context.fill();
                    
                    // Dessiner l'image de la potion
                    context.translate(potion.x, potion.y);
                    context.scale(scale, scale);
                    context.drawImage(
                        healthPotionImageRef.current,
                        -HEALTH_POTION_SIZE / 2,
                        -HEALTH_POTION_SIZE / 2,
                        HEALTH_POTION_SIZE,
                        HEALTH_POTION_SIZE
                    );
                    
                    context.restore();
                }
            });
            
            // Draw rage potions
            ragePotionsRef.current.forEach(potion => {
                if (ragePotionImageRef.current) {
                    // Pulsating effect
                    const scale = 1 + Math.sin(now / 150) * 0.1; // Scale varie entre 0.9 et 1.1
                    const size = RAGE_POTION_SIZE * scale;
                    
                    context.save();
                    
                    // Aura rouge pulsante
                    const auraSize = size * 1.5;
                    let gradient = context.createRadialGradient(potion.x, potion.y, 0, potion.x, potion.y, auraSize);
                    gradient.addColorStop(0, 'rgba(255, 50, 50, 0.3)');
                    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(potion.x, potion.y, auraSize, 0, 2 * Math.PI);
                    context.fill();
                    
                    // Dessiner l'image de la potion
                    context.translate(potion.x, potion.y);
                    context.scale(scale, scale);
                    context.drawImage(
                        ragePotionImageRef.current,
                        -RAGE_POTION_SIZE / 2,
                        -RAGE_POTION_SIZE / 2,
                        RAGE_POTION_SIZE,
                        RAGE_POTION_SIZE
                    );
                    
                    context.restore();
                }
            });

            // Draw zombies
            zombiesRef.current.forEach(zombie => {
                if (zombie.color === PURPLE_ZOMBIE_COLOR && chairImageRef.current?.complete) {
                    context.drawImage(chairImageRef.current, zombie.x - ZOMBIE_SIZE / 2, zombie.y - ZOMBIE_SIZE / 2, ZOMBIE_SIZE, ZOMBIE_SIZE);
                } else if (zombie.color === YELLOW_ZOMBIE_COLOR && postitImageRef.current?.complete) {
                    context.drawImage(postitImageRef.current, zombie.x - ZOMBIE_SIZE / 2, zombie.y - ZOMBIE_SIZE / 2, ZOMBIE_SIZE, ZOMBIE_SIZE);
                } else if (zombie.color === ZOMBIE_RED_COLOR && bureauImageRef.current?.complete) {
                    context.drawImage(bureauImageRef.current, zombie.x - ZOMBIE_SIZE / 2, zombie.y - ZOMBIE_SIZE / 2, ZOMBIE_SIZE, ZOMBIE_SIZE);
                } else if (zombie.color === ZOMBIE_BLUE_COLOR && imprimanteImageRef.current?.complete) {
                    context.drawImage(imprimanteImageRef.current, zombie.x - ZOMBIE_SIZE / 2, zombie.y - ZOMBIE_SIZE / 2, ZOMBIE_SIZE, ZOMBIE_SIZE);
                } else if (zombie.color === ZOMBIE_GREEN_COLOR && trombonneImageRef.current?.complete) {
                    context.drawImage(trombonneImageRef.current, zombie.x - ZOMBIE_SIZE / 2, zombie.y - ZOMBIE_SIZE / 2, ZOMBIE_SIZE, ZOMBIE_SIZE);
                }
                else {
                    context.fillStyle = zombie.color;
                    context.beginPath();
                    context.arc(zombie.x, zombie.y, ZOMBIE_SIZE / 2, 0, Math.PI * 2);
                    context.fill();
                }
                const healthBarWidth = ZOMBIE_SIZE;
                context.fillStyle = '#333';
                context.fillRect(zombie.x - healthBarWidth / 2, zombie.y - ZOMBIE_SIZE / 2 - 10, healthBarWidth, 5);
                context.fillStyle = 'red';
                context.fillRect(zombie.x - healthBarWidth / 2, zombie.y - ZOMBIE_SIZE / 2 - 10, healthBarWidth * (zombie.health / zombie.maxHealth), 5);
            });

            // Draw Grenades and their trails
            grenadesRef.current.forEach(grenade => {
                // Dessiner la traînée
                context.save();
                grenade.trail.forEach(particle => {
                    const gradient = context.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, particle.size
                    );
                    gradient.addColorStop(0, `rgba(255, 50, 50, ${particle.alpha})`);
                    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
                    
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    context.fill();
                });
                context.restore();

                // Dessiner la grenade avec un effet de lueur
                if (grenadeImageRef.current) {
                    context.save();
                    
                    // Effet de lueur
                    const glowSize = GRENADE_SIZE * 1.5;
                    const gradient = context.createRadialGradient(
                        grenade.x, grenade.y, 0,
                        grenade.x, grenade.y, glowSize
                    );
                    gradient.addColorStop(0, 'rgba(255, 165, 0, 0.4)');
                    gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
                    
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(grenade.x, grenade.y, glowSize, 0, Math.PI * 2);
                    context.fill();

                    // Corps principal de la grenade
                    context.translate(grenade.x, grenade.y);
                    context.rotate(grenade.angle);
                    
                    // Dessiner l'image de la grenade
                    context.drawImage(
                        grenadeImageRef.current,
                        -GRENADE_SIZE,
                        -GRENADE_SIZE,
                        GRENADE_SIZE * 2,
                        GRENADE_SIZE * 2
                    );

                    // Effet clignotant
                    if (!grenade.isActivated) {
                        const timeSinceSpawn = now - (lastGrenadeTimeRef.current || now);
                        if (Math.floor(timeSinceSpawn / 200) % 2 === 0) {
                            context.fillStyle = 'rgba(255, 255, 0, 0.3)';
                            context.beginPath();
                            context.arc(0, 0, GRENADE_SIZE, 0, Math.PI * 2);
                            context.fill();
                        }
                    }

                    context.restore();
                }
            });

            // Draw Player
            const isInvincible = now < playerHitCooldownEndRef.current;
            context.save();
            if (isInvincible && Math.floor(now / 100) % 2 === 0) {
                context.globalAlpha = 0.5;
            }
            if (playerImageRef.current?.complete) {
                context.drawImage(playerImageRef.current, cameraRef.current.x - PLAYER_SIZE / 2, cameraRef.current.y - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
            } else {
                context.fillStyle = isInvincible ? 'rgba(255, 100, 100, 0.9)' : '#f8f8f8';
                context.beginPath();
                context.arc(cameraRef.current.x, cameraRef.current.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
                context.fill();
            }
            context.restore();
            if (isRageActiveRef.current) {
                const rageProgress = (rageEndTimeRef.current - now) / RAGE_DURATION;
                const auraRadius = PLAYER_SIZE / 2 + 10 + Math.sin(now / 80) * 4;
                context.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.max(0, rageProgress) * 0.2})`;
                context.beginPath();
                context.arc(cameraRef.current.x, cameraRef.current.y, auraRadius * 1.5, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.max(0, rageProgress) * 0.4})`;
                context.lineWidth = 3;
                context.beginPath();
                context.arc(cameraRef.current.x, cameraRef.current.y, auraRadius, 0, Math.PI * 2);
                context.stroke();
            }

            // Draw orbs (Thème bureau: Boules de papier)
            orbsRef.current.forEach(orb => {
                context.save();
                context.translate(orb.x, orb.y);
                const spinAngle = (orb.id % 1000) / 500 * Math.PI + (Date.now() / 200);
                context.rotate(spinAngle);
                const ORB_SIZE = 24;
                const isDamageUpgraded = playerStateRef.current.activePerks.has('DAMAGE');
                if (papierImageRef.current?.complete) {
                    context.drawImage(papierImageRef.current, -ORB_SIZE / 2, -ORB_SIZE / 2, ORB_SIZE, ORB_SIZE);
                    if (isDamageUpgraded) {
                        context.globalCompositeOperation = 'source-atop';
                        context.fillStyle = 'rgba(255, 69, 0, 0.4)';
                        context.fillRect(-ORB_SIZE / 2, -ORB_SIZE / 2, ORB_SIZE, ORB_SIZE);
                        context.globalCompositeOperation = 'source-over';
                    }
                } else {
                    context.fillStyle = isDamageUpgraded ? '#ff4500' : '#dddddd';
                    context.beginPath();
                    context.arc(0, 0, ORB_SIZE / 2, 0, Math.PI * 2);
                    context.fill();
                }
                context.restore();
            });
            
            // Draw Lightnings
            lightningsRef.current.forEach(l => {
                context.strokeStyle = `rgba(255, 255, 0, ${l.alpha})`;
                context.lineWidth = 5;
                context.beginPath();
                context.moveTo(l.x, l.y - 100);
                context.lineTo(l.x, l.y + 100);
                context.stroke();
            });
            
            // Draw Piercing Blades
            bladesRef.current.forEach(blade => {
                context.save();
                context.translate(blade.x, blade.y);
                context.rotate(blade.angle);
                context.fillStyle = '#c0c0c0';
                context.strokeStyle = '#ffffff';
                context.lineWidth = 2;
                context.fillRect(-PIERCING_BLADE_LENGTH / 2, -PIERCING_BLADE_WIDTH / 2, PIERCING_BLADE_LENGTH, PIERCING_BLADE_WIDTH);
                context.strokeRect(-PIERCING_BLADE_LENGTH / 2, -PIERCING_BLADE_WIDTH / 2, PIERCING_BLADE_LENGTH, PIERCING_BLADE_WIDTH);
                context.restore();
            });
            
            // Draw bubbles in coffee
            bubblesRef.current.forEach(bubble => {
                const lifeRatio = bubble.life / bubble.maxLife;
                context.strokeStyle = `rgba(255, 239, 213, ${0.7 * lifeRatio})`;
                context.lineWidth = 1.5;
                context.beginPath();
                context.arc(bubble.x, bubble.y, Math.max(0, bubble.radius), 0, Math.PI * 2);
                context.stroke();
            });

            // Draw blood particles
            bloodParticlesRef.current.forEach(p => {
                context.save();
                context.translate(p.x, p.y);
                context.rotate(p.rotation);
                
                const alpha = (p.life / 40);
                context.fillStyle = p.color;
                
                switch (p.shape) {
                    case 'cross':
                        // Dessine une croix pixelisée
                        context.fillRect(-p.size, -p.size/3, p.size * 2, p.size/1.5);
                        context.fillRect(-p.size/3, -p.size, p.size/1.5, p.size * 2);
                        break;
                    case 'pixel':
                        // Dessine un pixel avec un contour plus sombre
                        context.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                        context.strokeStyle = `rgba(100, 0, 0, ${alpha})`;
                        context.strokeRect(-p.size/2, -p.size/2, p.size, p.size);
                        break;
                    default:
                        // Carré simple avec ombre
                        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
                        context.shadowBlur = 2;
                        context.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                }
                
                context.restore();
            });

            // --- VISUAL EFFECTS (ON TOP) ---
            context.save();
            context.globalCompositeOperation = 'lighter';
            // Draw flash
            const flash = flashEffectRef.current;
            if (flash.active) {
                const elapsed = now - flash.startTime;
                if (elapsed < flash.duration) {
                    const lifeRatio = elapsed / flash.duration;
                    const easeOut = 1 - Math.pow(1 - lifeRatio, 4);
                    const currentRadius = flash.radius * easeOut;
                    const currentOpacity = 1 - lifeRatio;
                    const gradient = context.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, currentRadius);
                    gradient.addColorStop(0, `rgba(173, 255, 47, ${currentOpacity * 0.8})`);
                    gradient.addColorStop(0.5, `rgba(57, 255, 20, ${currentOpacity * 0.5})`);
                    gradient.addColorStop(1, `rgba(0, 200, 0, 0)`);
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(flash.x, flash.y, Math.max(0, currentRadius), 0, Math.PI * 2);
                    context.fill();
                } else {
                    flash.active = false;
                }
            }
            // Draw gas particles
            dashParticlesRef.current.forEach(p => {
                const lifeRatio = p.life / p.maxLife;
                const radius = p.size * lifeRatio;
                const gradient = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(0, radius));
                gradient.addColorStop(0, `rgba(152, 251, 152, ${lifeRatio * 0.7})`);
                gradient.addColorStop(0.7, `rgba(0, 250, 154, ${lifeRatio * 0.3})`);
                gradient.addColorStop(1, `rgba(46, 139, 87, 0)`);
                context.fillStyle = gradient;
                context.beginPath();
                context.arc(p.x, p.y, Math.max(0, radius), 0, Math.PI * 2);
                context.fill();
            });
            context.restore();

            // Draw AoE shockwave effect
            aoeEffectsRef.current.forEach(effect => {
                const elapsed = now - effect.startTime;
                const lifeRatio = elapsed / effect.duration;
                const easeOut = 1 - Math.pow(1 - lifeRatio, 2);
                const currentRadius = effect.radius * easeOut;
                const currentOpacity = 1 - lifeRatio;
                context.strokeStyle = `rgba(127, 255, 0, ${currentOpacity * 0.9})`;
                context.lineWidth = 4 * (1 - easeOut);
                context.beginPath();
                context.arc(effect.x, effect.y, Math.max(0, currentRadius), 0, Math.PI * 2);
                context.stroke();
            });

            context.restore(); // END CAMERA TRANSFORM
            
            // --- NOUVELLE INTERFACE UTILISATEUR (HUD) ---
            const drawPixelatedFrame = (x: number, y: number, width: number, height: number) => {
                context.fillStyle = 'rgba(0, 0, 0, 0.5)';
                context.fillRect(x, y, width, height);
                context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
                context.lineWidth = 2;
                context.strokeRect(x, y, width, height);
                context.strokeStyle = 'rgba(0, 0, 0, 0.8)';
                context.strokeRect(x+2, y+2, width-4, height-4);
            };

            // --- LEFT FRAME (Level, XP, Lives) ---
            const frameX = 15;
            const frameY = 15;
            const frameWidth = 220;
            const frameHeight = 130;
            drawPixelatedFrame(frameX, frameY, frameWidth, frameHeight);

            // Level
            context.fillStyle = 'white';
            context.font = 'bold 20px "Courier New", Courier, monospace';
            context.shadowColor = 'black';
            context.shadowBlur = 4;
            context.textAlign = 'left';
            context.fillText(`LEVEL ${playerStateRef.current.level}`, frameX + 15, frameY + 30);
            
            // Score
            const currentTotalXp = Math.floor(totalXpForLevel(playerStateRef.current.level) + xpRef.current);
            context.font = '16px "Courier New", Courier, monospace';
            context.fillText(`SCORE: ${currentTotalXp}`, frameX + 15, frameY + 55);

            // Barre d'XP
            const xpBarY = frameY + 70;
            const xpBarWidth = frameWidth - 30;
            const requiredXp = xpForNextLevel(playerStateRef.current.level);
            const xpPercentage = (xpRef.current / requiredXp);
            context.fillStyle = '#333';
            context.fillRect(frameX + 15, xpBarY, xpBarWidth, 15);
            context.fillStyle = 'gold';
            context.fillRect(frameX + 15, xpBarY, xpBarWidth * xpPercentage, 15);
            context.strokeStyle = '#666';
            context.strokeRect(frameX + 15, xpBarY, xpBarWidth, 15);

            // Vies (coeurs)
            const health = playerStateRef.current.health;
            const maxHealth = playerStateRef.current.maxHealth;
            const heartSize = 24;
            const heartSpacing = 6;
            const heartsY = frameY + 95;
            
            for (let i = 0; i < maxHealth; i++) {
                const heartX = frameX + 15 + i * (heartSize + heartSpacing);
                context.fillStyle = (i < health) ? '#e74c3c' : '#444';
                // Dessin du coeur en pixel art
                context.fillRect(heartX + heartSize*0.25, heartsY, heartSize*0.5, heartSize*0.25);
                context.fillRect(heartX, heartsY + heartSize*0.25, heartSize, heartSize*0.5);
                context.fillRect(heartX + heartSize*0.25, heartsY + heartSize*0.75, heartSize*0.5, heartSize*0.25);
            }

            // --- RIGHT FRAME (Ranking) ---
            const rightFrameWidth = isMobile ? frameWidth : 240;
            const rightFrameX = isMobile ? frameX : canvas.width - rightFrameWidth - 15;
            const rightFrameY = isMobile ? frameY + frameHeight + 15 : frameY;
            drawPixelatedFrame(rightFrameX, rightFrameY, rightFrameWidth, frameHeight - 20);
            
            // Rank
            context.textAlign = isMobile ? 'left' : 'right';
            if (playerRankRef.current !== null) {
                context.fillStyle = 'white';
                context.font = 'bold 22px "Courier New", Courier, monospace';
                const rankTextX = isMobile ? rightFrameX + 15 : canvas.width - 25;
                context.fillText(`RANK #${playerRankRef.current}`, rankTextX, rightFrameY + 35);
            }

            // Progress bar towards #1
            if (leaderboard.length > 0) {
                const topScore = leaderboard[0].score;
                const currentTotalXp = totalXpForLevel(playerStateRef.current.level) + xpRef.current;
                const progressPercentage = Math.min((currentTotalXp / topScore), 1);
                
                const progressY = rightFrameY + 60;
                const progressWidth = rightFrameWidth - 30;
                
                context.fillStyle = '#333';
                context.fillRect(rightFrameX + 15, progressY, progressWidth, 15);
                
                const gradient = context.createLinearGradient(rightFrameX + 15, 0, rightFrameX + 15 + progressWidth, 0);
                gradient.addColorStop(0, '#39FF14');
                gradient.addColorStop(1, '#00c700');
                context.fillStyle = gradient;
                context.fillRect(rightFrameX + 15, progressY, progressWidth * progressPercentage, 15);
                context.strokeStyle = '#666';
                context.strokeRect(rightFrameX + 15, progressY, progressWidth, 15);
                
                context.font = '12px "Courier New", Courier, monospace';
                context.fillStyle = 'white';
                context.textAlign = 'right';
                const progressTextX = isMobile ? rightFrameX + 15 + progressWidth : canvas.width - 25;
                context.fillText(`${Math.floor(progressPercentage*100)}% to #1`, progressTextX, progressY - 5);
            }
            
            // --- BOTTOM FRAME (Skills) ---
            if (!isMobile) {
                const skillsFrameX = frameX;
                const skillsFrameY = canvas.height - 75;
                const skillsFrameWidth = frameWidth;
                const skillsFrameHeight = 60;
                drawPixelatedFrame(skillsFrameX, skillsFrameY, skillsFrameWidth, skillsFrameHeight);

                // Dash Skill
                context.font = 'bold 16px "Courier New", Courier, monospace';
                context.fillStyle = 'white';
                context.fillText('💨 TOXIC FART', skillsFrameX + 15, skillsFrameY + 25);
                context.font = '12px "Courier New", Courier, monospace';
                context.fillStyle = '#ccc';
                context.textAlign = 'right';
                context.fillText('[SPACE]', skillsFrameX + skillsFrameWidth - 15, skillsFrameY + 25);
                context.textAlign = 'left';

                const cooldownBarY = skillsFrameY + 40;
                const cooldownBarWidth = skillsFrameWidth - 30;
                
                // Freeze the cooldown bar visually during level up
                const cooldownNow = isLevelingUp && pauseStartTimeRef.current > 0 ? pauseStartTimeRef.current : now;
                const timeSinceCooldownStart = Math.max(0, cooldownNow - (dashCooldownEndRef.current - DASH_COOLDOWN));
                const cooldownPercentage = Math.min(timeSinceCooldownStart / DASH_COOLDOWN, 1);

                context.fillStyle = '#333';
                context.fillRect(skillsFrameX + 15, cooldownBarY, cooldownBarWidth, 10);
                context.fillStyle = cooldownPercentage >= 1 ? '#39FF14' : 'orange';
                context.fillRect(skillsFrameX + 15, cooldownBarY, cooldownBarWidth * cooldownPercentage, 10);
                context.strokeStyle = '#666';
                context.strokeRect(skillsFrameX + 15, cooldownBarY, cooldownBarWidth, 10);

                // Grenade Frame
                const grenadeFrameX = skillsFrameX + skillsFrameWidth + 15;
                drawPixelatedFrame(grenadeFrameX, skillsFrameY, skillsFrameWidth, skillsFrameHeight);

                // Grenade Skill
                context.font = 'bold 16px "Courier New", Courier, monospace';
                context.fillStyle = 'white';
                context.fillText('💣 GRENADE [G]', grenadeFrameX + 15, skillsFrameY + 25);
                context.font = '12px "Courier New", Courier, monospace';
                context.fillStyle = '#ccc';
                context.textAlign = 'right';
                context.fillText('15s', grenadeFrameX + skillsFrameWidth - 15, skillsFrameY + 25);
                context.textAlign = 'left';

                const grenadeCooldownBarY = skillsFrameY + 40;
                const grenadeCooldownBarWidth = skillsFrameWidth - 30;
                
                const grenadeCooldownPercentage = lastGrenadeTimeRef.current === 0 ? 1 : Math.min((cooldownNow - lastGrenadeTimeRef.current) / GRENADE_COOLDOWN, 1);

                context.fillStyle = '#333';
                context.fillRect(grenadeFrameX + 15, grenadeCooldownBarY, grenadeCooldownBarWidth, 10);
                context.fillStyle = grenadeCooldownPercentage >= 1 ? '#39FF14' : 'orange';
                context.fillRect(grenadeFrameX + 15, grenadeCooldownBarY, grenadeCooldownBarWidth * grenadeCooldownPercentage, 10);
                context.strokeStyle = '#666';
                context.strokeRect(grenadeFrameX + 15, grenadeCooldownBarY, grenadeCooldownBarWidth, 10);
            }
            
            // Reset context
            context.shadowBlur = 0;
            context.textAlign = 'left';

            // Draw dash particles
            dashParticlesRef.current.forEach(p => {
                const lifeRatio = p.life / p.maxLife;
                context.fillStyle = `rgba(255, 255, 255, ${lifeRatio * 0.7})`;
                context.beginPath();
                context.arc(p.x, p.y, Math.max(0, (1 - lifeRatio) * 15), 0, Math.PI * 2);
                context.fill();
            });

            // Draw AoE shockwave effect
            aoeEffectsRef.current.forEach(effect => {
                const elapsed = now - effect.startTime;
                const lifeRatio = elapsed / effect.duration;
                const easeOut = 1 - Math.pow(1 - lifeRatio, 2);

                const currentRadius = effect.radius * easeOut;
                const currentOpacity = 1 - lifeRatio;

                context.strokeStyle = `rgba(127, 255, 0, ${currentOpacity * 0.9})`; // Chartreuse
                context.lineWidth = 4 * (1 - easeOut);
                context.beginPath();
                context.arc(effect.x, effect.y, Math.max(0, currentRadius), 0, Math.PI * 2);
                context.stroke();
            });

            context.save();
            context.globalCompositeOperation = 'lighter';

            // Draw blood particles
            bloodParticlesRef.current.forEach(p => {
                context.fillStyle = p.color;
                context.fillRect(p.x, p.y, p.size, p.size);
            });

            context.restore();

            // Draw Grenades and their trails
            grenadesRef.current.forEach(grenade => {
                // Debug: Dessiner un grand cercle rouge à la position de la grenade
                context.save();
                context.fillStyle = 'red';
                context.beginPath();
                context.arc(grenade.x, grenade.y, 30, 0, Math.PI * 2);
                context.fill();
                context.restore();

                // Debug: Dessiner une ligne de la position du joueur à la grenade
                context.save();
                context.strokeStyle = 'yellow';
                context.lineWidth = 5;
                context.beginPath();
                context.moveTo(cameraRef.current.x, cameraRef.current.y);
                context.lineTo(grenade.x, grenade.y);
                context.stroke();
                context.restore();

                // Dessiner la traînée
                context.save();
                grenade.trail.forEach(particle => {
                    const gradient = context.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, particle.size
                    );
                    gradient.addColorStop(0, `rgba(255, 50, 50, ${particle.alpha})`);
                    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
                    
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    context.fill();
                });
                context.restore();

                // Dessiner la grenade avec un effet de lueur
                context.save();
                
                // Effet de lueur
                const glowSize = GRENADE_SIZE * 1.5;
                const gradient = context.createRadialGradient(
                    grenade.x, grenade.y, 0,
                    grenade.x, grenade.y, glowSize
                );
                gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                
                context.fillStyle = gradient;
                context.beginPath();
                context.arc(grenade.x, grenade.y, glowSize, 0, Math.PI * 2);
                context.fill();

                // Corps principal de la grenade
                context.translate(grenade.x, grenade.y);
                context.rotate(grenade.angle);

                // Dessiner un rectangle plus grand pour la grenade
                context.fillStyle = '#ff0000';
                context.fillRect(-GRENADE_SIZE, -GRENADE_SIZE, GRENADE_SIZE * 2, GRENADE_SIZE * 2);
                
                // Contour épais
                context.strokeStyle = '#ffffff';
                context.lineWidth = 4;
                context.strokeRect(-GRENADE_SIZE, -GRENADE_SIZE, GRENADE_SIZE * 2, GRENADE_SIZE * 2);

                // Effet clignotant
                if (!grenade.isActivated) {
                    const timeSinceSpawn = now - (lastGrenadeTimeRef.current || now);
                    if (Math.floor(timeSinceSpawn / 200) % 2 === 0) {
                        context.fillStyle = '#ffff00';
                        context.beginPath();
                        context.arc(0, 0, GRENADE_SIZE / 2, 0, Math.PI * 2);
                        context.fill();
                    }
                }

                context.restore();

                // Debug: Afficher les coordonnées
                context.save();
                context.fillStyle = 'white';
                context.font = '16px Arial';
                context.fillText(`Grenade: ${Math.round(grenade.x)}, ${Math.round(grenade.y)}`, grenade.x + 40, grenade.y);
                context.fillText(`Camera: ${Math.round(cameraRef.current.x)}, ${Math.round(cameraRef.current.y)}`, grenade.x + 40, grenade.y + 20);
                context.restore();
            });

            // Draw bloodstains
            bloodstainsRef.current.forEach(stain => {
                const timeSinceFadeStart = now - stain.fadeStartTime;
                let fadeAlpha = 1;
                
                if (timeSinceFadeStart > 0) {
                    fadeAlpha = Math.max(0, 1 - (timeSinceFadeStart / 2000));
                }

                if (bloodImageRef.current) {
                    context.save();
                    
                    // Configurer la transparence
                    context.globalAlpha = fadeAlpha;
                    
                    // Positionner au centre de la tache
                    context.translate(stain.x, stain.y);
                    
                    // Appliquer la rotation
                    context.rotate(stain.rotation);
                    
                    // Appliquer l'échelle
                    const size = stain.radius * 2 * stain.scale;
                    context.scale(stain.scale, stain.scale);
                    
                    // Dessiner l'image
                    context.drawImage(
                        bloodImageRef.current,
                        -size / 2,
                        -size / 2,
                        size,
                        size
                    );
                    
                    context.restore();
                }
            });

            // Draw bubbles
            bubblesRef.current.forEach(bubble => {
                context.fillStyle = 'rgba(226, 232, 240, 0.4)';
                context.beginPath();
                context.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
                context.fill();
            });

            // Draw health potions
            healthPotionsRef.current.forEach(potion => {
                context.fillStyle = '#68d391'; // Vert menthe
                context.beginPath();
                context.arc(potion.x, potion.y, HEALTH_POTION_SIZE / 2 + Math.sin(now / 100) * 5, 0, 2 * Math.PI);
                context.strokeStyle = '#dddddd';
                context.lineWidth = 1;
                context.stroke();
            });

            // Draw rage potions
            ragePotionsRef.current.forEach(potion => {
                context.fillStyle = '#e53e3e'; // Rouge
                context.beginPath();
                context.arc(potion.x, potion.y, RAGE_POTION_SIZE / 2, 0, 2 * Math.PI);
                context.strokeStyle = 'rgba(252, 129, 129, 0.8)';
                context.lineWidth = 2;
                context.stroke();
            });

            // Draw coins
            coinsRef.current.forEach(coin => {
                if (xpImageRef.current) {
                    context.save();
                    
                    // Effet de rotation et pulsation
                    const scale = 1 + Math.sin(now / 200) * 0.1;
                    const rotation = (now / 500) % (Math.PI * 2);
                    
                    // Aura dorée pulsante
                    const auraSize = COIN_SIZE * 1.5;
                    const gradient = context.createRadialGradient(coin.x, coin.y, 0, coin.x, coin.y, auraSize);
                    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
                    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(coin.x, coin.y, auraSize, 0, Math.PI * 2);
                    context.fill();
                    
                    // Position et rotation de l'image
                    context.translate(coin.x, coin.y);
                    context.rotate(rotation);
                    context.scale(scale, scale);
                    
                    // Dessiner l'image de l'XP
                    context.drawImage(
                        xpImageRef.current,
                        -COIN_SIZE / 2,
                        -COIN_SIZE / 2,
                        COIN_SIZE,
                        COIN_SIZE
                    );
                    
                    context.restore();
                }
            });

            // Draw Grenades
            grenadesRef.current.forEach(grenade => {
                // Dessiner la traînée
                context.save();
                grenade.trail.forEach(particle => {
                    const gradient = context.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, particle.size
                    );
                    gradient.addColorStop(0, `rgba(255, 50, 50, ${particle.alpha})`);
                    gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
                    
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    context.fill();
                });
                context.restore();

                // Dessiner la grenade avec un effet de lueur
                if (grenadeImageRef.current) {
                    context.save();
                    
                    // Effet de lueur
                    const glowSize = GRENADE_SIZE * 1.5;
                    const gradient = context.createRadialGradient(
                        grenade.x, grenade.y, 0,
                        grenade.x, grenade.y, glowSize
                    );
                    gradient.addColorStop(0, 'rgba(255, 165, 0, 0.4)');
                    gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
                    
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(grenade.x, grenade.y, glowSize, 0, Math.PI * 2);
                    context.fill();

                    // Corps principal de la grenade
                    context.translate(grenade.x, grenade.y);
                    context.rotate(grenade.angle);
                    
                    // Dessiner l'image de la grenade
                    context.drawImage(
                        grenadeImageRef.current,
                        -GRENADE_SIZE,
                        -GRENADE_SIZE,
                        GRENADE_SIZE * 2,
                        GRENADE_SIZE * 2
                    );

                    // Effet clignotant
                    if (!grenade.isActivated) {
                        const timeSinceSpawn = now - (lastGrenadeTimeRef.current || now);
                        if (Math.floor(timeSinceSpawn / 200) % 2 === 0) {
                            context.fillStyle = 'rgba(255, 255, 0, 0.3)';
                            context.beginPath();
                            context.arc(0, 0, GRENADE_SIZE, 0, Math.PI * 2);
                            context.fill();
                        }
                    }

                    context.restore();
                }
            });

            // Draw player
            const playerBodyColor = playerHitCooldownEndRef.current < now ? '#c53030' : '#2c5282'; // Thème bureau: Stylo bleu/rouge
            context.fillStyle = playerBodyColor;
            context.fillRect(
                cameraRef.current.x - PLAYER_SIZE / 2,
                cameraRef.current.y - PLAYER_SIZE / 2,
                PLAYER_SIZE, PLAYER_SIZE
            );
            // "Yeux" du joueur pour indiquer la direction
            const eyeOffsetX = lastMovementDirectionRef.current.dx * (PLAYER_SIZE / 4);
            const eyeOffsetY = lastMovementDirectionRef.current.dy * (PLAYER_SIZE / 4);
            context.fillStyle = 'white';
            context.beginPath();
            context.arc(cameraRef.current.x + eyeOffsetX, cameraRef.current.y + eyeOffsetY, PLAYER_SIZE / 8, 0, 2 * Math.PI);
            context.fill();

            if (isRageActiveRef.current) {
                const rageProgress = (rageEndTimeRef.current - now) / RAGE_DURATION;
                const auraRadius = PLAYER_SIZE / 2 + 10 + Math.sin(now / 80) * 4;
                
                context.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.max(0, rageProgress) * 0.2})`;
                context.beginPath();
                context.arc(cameraRef.current.x, cameraRef.current.y, auraRadius * 1.5, 0, Math.PI * 2);
                context.fill();

                context.strokeStyle = `rgba(255, 0, 0, ${0.3 + Math.max(0, rageProgress) * 0.4})`;
                context.lineWidth = 3;
                context.beginPath();
                context.arc(cameraRef.current.x, cameraRef.current.y, auraRadius, 0, Math.PI * 2);
                context.stroke();
            }
        };
        
        const gameLoop = () => {
            const now = Date.now();
            const deltaTime = Math.min(now - lastUpdateTimeRef.current, 50); // Cap delta to prevent massive jumps
            lastUpdateTimeRef.current = now;

            update(deltaTime, now);
            draw(now);
            animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        gameLoop();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isLevelingUp, isGameOver, map, noise2D, spawnPurpleCircle, handleGameOver, getTileAt, totalXpForLevel, getRandomPerks, xpForNextLevel, leaderboard, handleGameOver, spawnBloodParticles, isMobile]);

    useEffect(() => {
        if (playerStateRef.current.health <= 0) {
            playerStateRef.current.health = 0;
            const finalScore = totalXpForLevel(playerStateRef.current.level) + xpRef.current;
            handleGameOver(Math.floor(finalScore));
            setIsGameOver(true);
        }
    }, [handleGameOver, totalXpForLevel]);

    // Ajouter la référence à l'image de sang
    const bloodImageRef = useRef<HTMLImageElement | null>(null);

    // Charger l'image de sang
    useEffect(() => {
        const bloodImage = new Image();
        bloodImage.src = '/sang.png';
        bloodImage.onload = () => {
            bloodImageRef.current = bloodImage;
        };
    }, []);

    // Ajouter la référence à l'image de la potion de rage
    const ragePotionImageRef = useRef<HTMLImageElement | null>(null);

    // Charger l'image de la potion de rage
    useEffect(() => {
        const ragePotionImage = new Image();
        ragePotionImage.src = '/potion-rage.png';
        ragePotionImage.onload = () => {
            ragePotionImageRef.current = ragePotionImage;
        };
    }, []);

    // Ajouter les références aux images
    const healthPotionImageRef = useRef<HTMLImageElement | null>(null);
    const grenadeImageRef = useRef<HTMLImageElement | null>(null);
    const xpImageRef = useRef<HTMLImageElement | null>(null);

    // Charger les images
    useEffect(() => {
        const healthPotionImage = new Image();
        healthPotionImage.src = '/potion-vie.png';
        healthPotionImage.onload = () => {
            healthPotionImageRef.current = healthPotionImage;
        };

        const grenadeImage = new Image();
        grenadeImage.src = '/grenade.png';
        grenadeImage.onload = () => {
            grenadeImageRef.current = grenadeImage;
        };

        const xpImage = new Image();
        xpImage.src = '/XP.png';
        xpImage.onload = () => {
            xpImageRef.current = xpImage;
        };
    }, []);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            {rankUpAnimation.show && (
                <div style={{
                    position: 'absolute',
                    bottom: '10%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    padding: '12px 25px',
                    background: 'rgba(20, 30, 45, 0.85)',
                    backdropFilter: 'blur(5px)',
                    color: 'white',
                    borderRadius: '12px',
                    border: '1px solid #39FF14',
                    boxShadow: '0 0 15px rgba(57, 255, 20, 0.4)',
                    textAlign: 'center',
                    animation: 'rankUp-toast-animation 3s ease-out forwards',
                }}>
                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                        {rankUpAnimation.text} You climb to rank <span style={{color: '#39FF14'}}>#{rankUpAnimation.rank}</span>!
                    </p>
                </div>
            )}
            <canvas ref={canvasRef} style={{ background: 'black', display: 'block' }} />
            {isLevelingUp && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.8)', color: 'white', padding: '40px',
                    border: '2px solid white', borderRadius: '10px', textAlign: 'center'
                }}>
                    <h2>LEVEL UP!</h2>
                    <p>Choose an upgrade:</p>
                    <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
                        {availablePerks.length > 0 ? availablePerks.map(perk => (
                            <button key={perk.id} onClick={() => selectPerk(perk)} style={{
                                padding: '20px', cursor: 'pointer', border: '2px solid white',
                                background: '#333', color: 'white', fontSize: '16px',
                                minWidth: '150px'
                            }}>
                                <strong>{perk.name}</strong>
                                <p style={{ fontSize: '12px', marginTop: '5px' }}>{perk.description}</p>
                            </button>
                        )) : <p>All upgrades have been acquired!</p>}
                    </div>
                </div>
            )}
            <style>
                {`
                    @keyframes rankUp-toast-animation {
                        0% { transform: translate(-50%, 100px); opacity: 0; }
                        20% { transform: translate(-50%, 0); opacity: 1; }
                        80% { transform: translate(-50%, 0); opacity: 1; }
                        100% { transform: translate(-50%, 100px); opacity: 0; }
                    }
                `}
            </style>
            {isMobile && (
                <div style={{ position: 'absolute', bottom: '50px', right: '50px', zIndex: 10 }}>
                    <Joystick
                        size={100}
                        baseColor="rgba(255, 255, 255, 0.2)"
                        stickColor="rgba(255, 255, 255, 0.5)"
                        move={handleJoystickMove}
                        stop={handleJoystickStop}
                    />
                </div>
            )}
            {isMobile && (
                 <div style={{ position: 'absolute', bottom: '50px', right: '150px', zIndex: 10 }}>
                     <button
                         onClick={triggerDash}
                         disabled={isDashOnCooldown}
                         style={{
                             width: '80px',
                             height: '80px',
                             borderRadius: '50%',
                             background: isDashOnCooldown ? 'rgba(100, 100, 100, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                             border: '2px solid rgba(255, 255, 255, 0.5)',
                             color: 'white',
                             fontSize: '1.5rem',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             cursor: isDashOnCooldown ? 'not-allowed' : 'pointer',
                             opacity: isDashOnCooldown ? 0.5 : 1,
                             transition: 'opacity 0.3s, background 0.3s'
                         }}
                     >
                         💨
                     </button>
                 </div>
            )}
        </div>
    );
};

export default Game; 