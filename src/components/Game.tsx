"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { createNoise2D } from 'simplex-noise';

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

// --- ZOMBIE ---
const ZOMBIE_SIZE = 30;
const ZOMBIE_SPEED = 1.2;
const ZOMBIE_DAMAGE = 1; // Dégâts réduits à 1
const ZOMBIE_GREEN_COLOR = '#c0c0c0'; // Thème bureau: Trombones
const ZOMBIE_BLUE_COLOR = '#555555'; // Thème bureau: Imprimantes
const ZOMBIE_RED_COLOR = '#8B4513';   // Thème bureau: Bureaux
const YELLOW_ZOMBIE_COLOR = '#f1c40f'; // Thème bureau: Post-its

// --- SPAWN CONTINU ---
const SPAWN_BASE_INTERVAL = 1800; // ms au niveau 1
const SPAWN_RATE_GROWTH = 0.75; // Le délai est multiplié par ce facteur (25% plus rapide par niveau)
const SPAWN_XP_SCALING_START_LEVEL = 4;
const SPAWN_XP_SCALING_FACTOR = 1.0015; // Réduit l'intervalle pour chaque point d'XP après le niveau 4
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
const PIERCING_BLADE_SPEED = 10;
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

/* interface BreathEffect {
    id: number;
    angle: number;
    alpha: number;
} */

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
    onGameOver: (finalScore: number) => void;
}

const ALL_PERKS: Perk[] = [
    { id: 'FIRE_RATE', name: 'Boost de Caféine', description: 'Lancez des boules de papier 25% plus vite.' },
    { id: 'DAMAGE', name: 'Boules de papier Incandescentes', description: 'Vos boules de papier infligent le double de dégâts.' },
    { id: 'POISON', name: 'Café Renversé', description: 'Crée une flaque de café qui blesse et ralentit les ennemis.' },
    { id: 'LIGHTNING', name: 'Court-Circuit', description: "Toutes les 5s, un court-circuit frappe un groupe d'ennemis." },
    { id: 'PIERCING_BLADE', name: 'Ramette Tranchante', description: 'Toutes les 3s, lance une ramette de papier qui transperce les ennemis.' },
];

const Game: React.FC<GameProps> = ({ onGameOver }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const playerStateRef = useRef<PlayerState>({
        level: 1,
        speedGround: 3,
        speedWater: 1.5,
        fireRate: 1500,
        orbSpeed: 2.5,
        damage: 1,
        activePerks: new Set(),
        health: PLAYER_MAX_HEALTH,
        maxHealth: PLAYER_MAX_HEALTH,
    });

    const cameraRef = useRef({ x: MAP_WIDTH * TILE_SIZE / 2, y: MAP_HEIGHT * TILE_SIZE / 2 });
    const keysPressedRef = useRef<Record<string, boolean>>({});
    const zombiesRef = useRef<Zombie[]>([]);
    const orbsRef = useRef<Orb[]>([]);
    const coinsRef = useRef<Coin[]>([]);
    const poisonZonesRef = useRef<PoisonZone[]>([]);
    const lightningsRef = useRef<Lightning[]>([]);
    const bladesRef = useRef<PiercingBlade[]>([]);
    const healthPotionsRef = useRef<HealthPotion[]>([]);
    const bubblesRef = useRef<Bubble[]>([]);
    const introAnimationRef = useRef({
        startTime: 0,
        duration: 2500, // ms
        startZoom: 4,
        endZoom: 1,
        currentZoom: 4,
        isPlaying: true,
    });
    const isInitializedRef = useRef(false);
    const purpleCircleTriggeredForLevelRef = useRef<Set<number>>(new Set());
    const chairImageRef = useRef<HTMLImageElement | null>(null);
    const postitImageRef = useRef<HTMLImageElement | null>(null);
    const bureauImageRef = useRef<HTMLImageElement | null>(null);
    const imprimanteImageRef = useRef<HTMLImageElement | null>(null);
    const trombonneImageRef = useRef<HTMLImageElement | null>(null);
    const papierImageRef = useRef<HTMLImageElement | null>(null);
    const playerImageRef = useRef<HTMLImageElement | null>(null);
    const xpRef = useRef<number>(0);
    const lastFireTimeRef = useRef<number>(0);
    const lastZombieSpawnRef = useRef<number>(0);
    const lastLightningTimeRef = useRef<number>(0);
    const playerHitCooldownEndRef = useRef<number>(0);
    const gameStartTimeRef = useRef<number>(0);
    const lastUpdateTimeRef = useRef<number>(0);
    const zombieSpeedBonusRef = useRef<number>(0);
    const playerLastMoveTimeRef = useRef<number>(0);
    const lastMovementDirectionRef = useRef({ dx: 0, dy: -1 }); // Default: up
    const redZombiesUnlockedRef = useRef<boolean>(false);
    const yellowZombiesUnlockedRef = useRef<boolean>(false);
    const lastYellowSpawnTimeRef = useRef<number>(0);
    const lastBladeTimeRef = useRef<number>(0);

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
    }, []);

    // États de jeu
    const [isLevelingUp, setIsLevelingUp] = useState(false);
    const [availablePerks, setAvailablePerks] = useState<Perk[]>([]);
    const [isGameOver, setIsGameOver] = useState(false);

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

    const totalXpForLevel = useCallback((level: number) => {
        let total = 0;
        for (let i = 1; i < level; i++) {
            total += xpForNextLevel(i);
        }
        return total;
    }, [xpForNextLevel]);

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

        const handleKeyDown = (e: KeyboardEvent) => { keysPressedRef.current[e.key.toLowerCase()] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressedRef.current[e.key.toLowerCase()] = false; };

        window.addEventListener('resize', handleResize);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        let animationFrameId: number;

        const update = (deltaTime: number) => {
            if (isLevelingUp || isGameOver) return;
            const now = Date.now();
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
            const elapsedTime = now - gameStartTimeRef.current;
            const newSpeedBonus = Math.floor(elapsedTime / 15000) * 0.05; // +0.05 vitesse toutes les 15s
            if (newSpeedBonus > zombieSpeedBonusRef.current) {
                zombieSpeedBonusRef.current = newSpeedBonus;
            }

            // 2. Suivi de l'inactivité du joueur
            const isIdle = now - playerLastMoveTimeRef.current > 3000;

            // Player movement
            let dx = 0;
            let dy = 0;
            if (keysPressedRef.current['z'] || keysPressedRef.current['arrowup']) dy -= 1;
            if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) dy += 1;
            if (keysPressedRef.current['q'] || keysPressedRef.current['arrowleft']) dx -= 1;
            if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) dx += 1;

            if (dx !== 0 || dy !== 0) {
                playerLastMoveTimeRef.current = now;
                const mag = Math.sqrt(dx * dx + dy * dy);
                dx /= mag;
                dy /= mag;

                lastMovementDirectionRef.current = { dx, dy };

                const currentTile = getTileAt(cameraRef.current.x, cameraRef.current.y);
                const speed = currentTile.type === 'water' ? playerStateRef.current.speedWater : playerStateRef.current.speedGround;
                
                cameraRef.current.x += dx * speed * timeScale;
                cameraRef.current.y += dy * speed * timeScale;
            }

            if (!introAnimationRef.current.isPlaying) {
                // Continuous spawn logic - Two-phase system
                let spawnInterval: number;
                const playerLevel = playerStateRef.current.level;

                if (playerLevel < SPAWN_XP_SCALING_START_LEVEL) {
                    // Phase 1: Difficulté basée sur le niveau
                    spawnInterval = SPAWN_BASE_INTERVAL * Math.pow(SPAWN_RATE_GROWTH, playerLevel - 1);
                } else {
                    // Phase 2: Difficulté exponentielle basée sur l'XP
                    const intervalAtLvl4Start = SPAWN_BASE_INTERVAL * Math.pow(SPAWN_RATE_GROWTH, SPAWN_XP_SCALING_START_LEVEL - 1);
                    const totalXpAtLvl4Start = totalXpForLevel(SPAWN_XP_SCALING_START_LEVEL);
                    const currentTotalXp = totalXpForLevel(playerLevel) + xpRef.current;
                    const xpGainedAfterLvl4 = currentTotalXp - totalXpAtLvl4Start;
                    
                    spawnInterval = intervalAtLvl4Start / Math.pow(SPAWN_XP_SCALING_FACTOR, xpGainedAfterLvl4);
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

                    const baseSpawnDist = Math.max(canvas.width, canvas.height) / 2;
                    const effectiveSpawnDist = isIdle ? baseSpawnDist * 0.7 : baseSpawnDist + ZOMBIE_SIZE; // Spawn 30% plus près si inactif
                    
                    const x = cameraRef.current.x + effectiveSpawnDist * Math.cos(angle);
                    const y = cameraRef.current.y + effectiveSpawnDist * Math.sin(angle);
                    
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
                        
                        const target = cameraRef.current;
                        const dx = target.x - zombie.x;
                        const dy = target.y - zombie.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist > 1) {
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
                for (let i = 0; i < 2; i++) {
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
                            if (distSq < minDis * minDis && distSq > 0) {
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

                    // Collisions Joueur-Zombie
                    zombiesRef.current.forEach(zombie => {
                        const pzx = cameraRef.current.x - zombie.x;
                        const pzy = cameraRef.current.y - zombie.y;
                        const distSq = pzx * pzx + pzy * pzy;
                        const minDis = PLAYER_SIZE / 2 + ZOMBIE_SIZE / 2;
                        if (distSq < minDis * minDis) {
                            // Le pushback ne s'applique que si le zombie n'est pas jaune
                            if (zombie.color !== YELLOW_ZOMBIE_COLOR) {
                                const dist = Math.sqrt(distSq);
                                const overlap = minDis - dist;
                                cameraRef.current.x += (pzx / dist) * overlap;
                                cameraRef.current.y += (pzy / dist) * overlap;
                            }

                            // Les dégâts s'appliquent pour tous les zombies, sauf s'ils sont en train de reculer
                            const isBeingKnockedBack = zombie.knockbackVx || zombie.knockbackVy;
                            if (now > playerHitCooldownEndRef.current && !isBeingKnockedBack) {
                                playerStateRef.current.health -= ZOMBIE_DAMAGE;
                                playerHitCooldownEndRef.current = now + PLAYER_HIT_COOLDOWN;
                                if (playerStateRef.current.health <= 0) {
                                    playerStateRef.current.health = 0;
                                    const finalScore = totalXpForLevel(playerStateRef.current.level) + xpRef.current;
                                    onGameOver(Math.floor(finalScore));
                                    setIsGameOver(true);
                                }
                            }
                        }
                    });
                }

                // Firing logic
                if (now > lastFireTimeRef.current + playerStateRef.current.fireRate) {
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
                zombiesRef.current = zombiesRef.current.filter(zombie => {
                    // Despawn des zombies jaunes par durée de vie
                    if (zombie.color === YELLOW_ZOMBIE_COLOR && zombie.spawnTime) {
                        if (now > zombie.spawnTime + YELLOW_ZOMBIE_LIFETIME) {
                            return false; // Supprime le zombie
                        }
                    }

                    orbsRef.current.forEach(orb => {
                        if (orb.targetId === zombie.id) {
                            const distSq = (orb.x - zombie.x)**2 + (orb.y - zombie.y)**2;
                            if (distSq < (ZOMBIE_SIZE / 2)**2) {
                                zombie.health -= playerStateRef.current.damage;
                                orbsToRemove.add(orb.id);

                                // Ajout du recul (knockback)
                                if (zombie.color !== YELLOW_ZOMBIE_COLOR) {
                                    const dx = zombie.x - orb.x;
                                    const dy = zombie.y - orb.y;
                                    const dist = Math.sqrt(distSq);
                                    if (dist > 0) {
                                        // Application d'une vélocité au lieu d'un déplacement direct
                                        zombie.knockbackVx = (zombie.knockbackVx || 0) + (dx / dist) * ORB_KNOCKBACK_STRENGTH;
                                        zombie.knockbackVy = (zombie.knockbackVy || 0) + (dy / dist) * ORB_KNOCKBACK_STRENGTH;
                                    }
                                }
                            }
                        }
                    });

                    if (zombie.health <= 0) {
                        xpRef.current += ZOMBIE_KILL_XP;
                        coinsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
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
                        zombiesRef.current = zombiesRef.current.filter(zombie => {
                            if (Math.hypot(zombie.x - zone.x, zombie.y - zone.y) < POISON_ZONE_RADIUS) {
                                zombie.health -= POISON_ZONE_DPS * 0.016; // DPS as damage per frame
                            }
                            if (zombie.health <= 0) {
                                xpRef.current += ZOMBIE_KILL_XP;
                                coinsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
                                // Drop de fiole
                                if (Math.random() < HEALTH_POTION_DROP_CHANCE) {
                                    healthPotionsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
                                }
                                return false;
                            }
                            return true;
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

                        zombiesRef.current = zombiesRef.current.filter(zombie => {
                            if (Math.hypot(zombie.x - strikeCenter.x, zombie.y - strikeCenter.y) < LIGHTNING_RADIUS) {
                            zombie.health -= LIGHTNING_DAMAGE;
                            }
                            if (zombie.health <= 0) {
                            xpRef.current += ZOMBIE_KILL_XP;
                            coinsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
                            // Drop de fiole
                            if (Math.random() < HEALTH_POTION_DROP_CHANCE) {
                                healthPotionsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
                            }
                            return false;
                        }
                        return true;
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
                                blade.hitZombieIds.add(zombie.id);
                            }
                        }
                    });
                });
                // Nettoyage des lames qui ont atteint leur portée et des zombies morts
                bladesRef.current = bladesRef.current.filter(b => b.distanceTraveled < PIERCING_BLADE_RANGE);
                zombiesRef.current = zombiesRef.current.filter(zombie => {
                    if(zombie.health <= 0){
                        xpRef.current += ZOMBIE_KILL_XP;
                        coinsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
                        // Drop de fiole
                        if (Math.random() < HEALTH_POTION_DROP_CHANCE) {
                            healthPotionsRef.current.push({ id: now + Math.random(), x: zombie.x, y: zombie.y });
                        }
                        return false;
                    }
                    return true;
                });

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
                bubble.life -= deltaTime;
                const growthPhase = 1 - (bubble.life / bubble.maxLife);
                bubble.radius = Math.sin(growthPhase * Math.PI) * 3; // Bubble grows and shrinks, max radius 3
            });
            bubblesRef.current = bubblesRef.current.filter(b => b.life > 0);
        };

        const draw = () => {
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
                        // Carrelage de base plus blanc
                        context.fillStyle = '#e8e8e8'; // Beaucoup plus clair/blanc
                        context.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        
                        // Joints de carrelage
                        context.fillStyle = 'rgba(0, 0, 0, 0.1)';
                        for(let i = 0; i < TILE_SIZE; i += 4) {
                            for(let j = 0; j < TILE_SIZE; j += 4) {
                                if ((i / 4 + j / 4) % 2 === 0) {
                                    context.fillRect(tileX + i, tileY + j, 2, 2);
                                }
                            }
                        }
                    } else { // 'water' est devenu 'café'
                        // Moquette sous la flaque
                        context.fillStyle = '#4a5568';
                        context.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);
                        // Flaque de café
                        context.fillStyle = '#693d3d';
                        context.fillRect(tileX, tileY, TILE_SIZE, TILE_SIZE);

                        // Texture de la flaque (reflets)
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

                        // Bordure plus sombre sur les bords de la flaque
                        const isBoundary = (neighbor: Tile | undefined) => !neighbor || neighbor.type === 'ground';
                        
                        context.strokeStyle = '#532e2e'; // Marron très foncé
                        context.lineWidth = 2;

                        if (isBoundary(map[y-1]?.[x])) { // Haut
                            context.beginPath(); context.moveTo(tileX, tileY + 1); context.lineTo(tileX + TILE_SIZE, tileY + 1); context.stroke();
                        }
                        if (isBoundary(map[y+1]?.[x])) { // Bas
                           context.beginPath(); context.moveTo(tileX, tileY + TILE_SIZE - 1); context.lineTo(tileX + TILE_SIZE, tileY + TILE_SIZE - 1); context.stroke();
                        }
                        if (isBoundary(map[y]?.[x-1])) { // Gauche
                            context.beginPath(); context.moveTo(tileX + 1, tileY); context.lineTo(tileX + 1, tileY + TILE_SIZE); context.stroke();
                        }
                        if (isBoundary(map[y]?.[x+1])) { // Droite
                            context.beginPath(); context.moveTo(tileX + TILE_SIZE - 1, tileY); context.lineTo(tileX + TILE_SIZE - 1, tileY + TILE_SIZE); context.stroke();
                        }
                    }
                }
            }
            
            // Draw bubbles in coffee
            bubblesRef.current.forEach(bubble => {
                const lifeRatio = bubble.life / bubble.maxLife;
                context.strokeStyle = `rgba(255, 239, 213, ${0.7 * lifeRatio})`; // PapayaWhip color for a creamy bubble look
                context.lineWidth = 1.5;
                context.beginPath();
                context.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
                context.stroke();
            });
            
            // Draw coins (Thème bureau: Punaises)
            coinsRef.current.forEach(coin => {
                // Tête de la punaise
                context.fillStyle = 'gold';
                context.beginPath();
                context.arc(coin.x, coin.y, COIN_SIZE / 2, 0, Math.PI * 2);
                context.fill();
                // Reflet
                context.fillStyle = 'rgba(255, 255, 255, 0.5)';
                context.beginPath();
                context.arc(coin.x - 2, coin.y - 2, COIN_SIZE / 4, 0, Math.PI * 2);
                context.fill();
            });

            // Draw poison zones (Thème bureau: Flaque de café renversé)
            poisonZonesRef.current.forEach(zone => {
                if (zone.active) {
                    // Flaque de café principale
                    const gradient = context.createRadialGradient(zone.x, zone.y, 0, zone.x, zone.y, POISON_ZONE_RADIUS);
                    gradient.addColorStop(0, "rgba(101, 67, 33, 0.8)"); // Centre plus foncé
                    gradient.addColorStop(0.4, "rgba(139, 69, 19, 0.6)"); // Milieu marron
                    gradient.addColorStop(0.8, "rgba(160, 82, 45, 0.4)"); // Bordure plus claire
                    gradient.addColorStop(1, "rgba(160, 82, 45, 0.1)"); // Bord très transparent
                    
                    context.fillStyle = gradient;
                    context.beginPath();
                    context.arc(zone.x, zone.y, POISON_ZONE_RADIUS, 0, Math.PI * 2);
                    context.fill();
                    
                    // Effet de vapeur/fumée
                    const time = Date.now() / 1000;
                    for (let i = 0; i < 8; i++) {
                        const angle = (i / 8) * Math.PI * 2 + time * 0.5;
                        const distance = POISON_ZONE_RADIUS * 0.7 + Math.sin(time * 2 + i) * 20;
                        const vaporX = zone.x + Math.cos(angle) * distance;
                        const vaporY = zone.y + Math.sin(angle) * distance - Math.sin(time * 3 + i) * 15;
                        
                        context.fillStyle = `rgba(101, 67, 33, ${0.3 * (1 + Math.sin(time * 4 + i)) / 2})`;
                        context.beginPath();
                        context.arc(vaporX, vaporY, 3 + Math.sin(time * 5 + i) * 2, 0, Math.PI * 2);
                        context.fill();
                    }
                    
                    // Reflets de surface liquide
                    for (let i = 0; i < 5; i++) {
                        const reflectX = zone.x + (Math.random() - 0.5) * POISON_ZONE_RADIUS * 1.5;
                        const reflectY = zone.y + (Math.random() - 0.5) * POISON_ZONE_RADIUS * 1.5;
                        const distance = Math.hypot(reflectX - zone.x, reflectY - zone.y);
                        
                        if (distance < POISON_ZONE_RADIUS) {
                            context.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.sin(time * 6 + i) * 0.05})`;
                            context.beginPath();
                            context.ellipse(reflectX, reflectY, 4, 2, Math.random() * Math.PI, 0, Math.PI * 2);
                            context.fill();
                        }
                    }
                    
                    // Bordure sombre pour définir la flaque
                    context.strokeStyle = "rgba(52, 46, 42, 0.7)";
                    context.lineWidth = 2;
                    context.beginPath();
                    context.arc(zone.x, zone.y, POISON_ZONE_RADIUS, 0, Math.PI * 2);
                    context.stroke();
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
                // Health bar
                const healthBarWidth = ZOMBIE_SIZE;
                context.fillStyle = '#333';
                context.fillRect(zombie.x - healthBarWidth / 2, zombie.y - ZOMBIE_SIZE / 2 - 10, healthBarWidth, 5);
                context.fillStyle = 'red';
                context.fillRect(zombie.x - healthBarWidth / 2, zombie.y - ZOMBIE_SIZE / 2 - 10, healthBarWidth * (zombie.health / zombie.maxHealth), 5);
            });
            
            // Draw orbs (Thème bureau: Boules de papier)
            orbsRef.current.forEach(orb => {
                context.save();
                context.translate(orb.x, orb.y);

                // Effet de rotation pour la boule de papier
                const spinAngle = (orb.id % 1000) / 500 * Math.PI + (Date.now() / 200);
                context.rotate(spinAngle);

                const ORB_SIZE = 24;
                const isDamageUpgraded = playerStateRef.current.activePerks.has('DAMAGE');

                if (papierImageRef.current?.complete) {
                    context.drawImage(papierImageRef.current, -ORB_SIZE / 2, -ORB_SIZE / 2, ORB_SIZE, ORB_SIZE);
                    
                    if (isDamageUpgraded) {
                        context.globalCompositeOperation = 'source-atop';
                        context.fillStyle = 'rgba(255, 69, 0, 0.4)'; // Superposition OrangeRed
                        context.fillRect(-ORB_SIZE / 2, -ORB_SIZE / 2, ORB_SIZE, ORB_SIZE);
                        context.globalCompositeOperation = 'source-over'; // Réinitialiser
                    }
                } else {
                    // Dessin de secours si l'image n'est pas chargée
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
            
            // Draw Piercing Blades (Thème bureau: Ramette de papier)
            bladesRef.current.forEach(blade => {
                context.save();
                context.translate(blade.x, blade.y);
                context.rotate(blade.angle);
                context.fillStyle = '#c0c0c0'; // Silver
                context.strokeStyle = '#ffffff';
                context.lineWidth = 2;
                context.fillRect(-PIERCING_BLADE_LENGTH / 2, -PIERCING_BLADE_WIDTH / 2, PIERCING_BLADE_LENGTH, PIERCING_BLADE_WIDTH);
                context.strokeRect(-PIERCING_BLADE_LENGTH / 2, -PIERCING_BLADE_WIDTH / 2, PIERCING_BLADE_LENGTH, PIERCING_BLADE_WIDTH);
                context.restore();
            });
            
            // Draw Health Potions (Thème bureau: Tasse de café)
            healthPotionsRef.current.forEach(potion => {
                // Le gobelet
                context.fillStyle = '#FFFFFF';
                context.beginPath();
                context.arc(potion.x, potion.y, HEALTH_POTION_SIZE / 2, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = '#dddddd';
                context.lineWidth = 1;
                context.stroke();

                // Le café dedans
                context.fillStyle = '#6F4E37'; // Marron café
                context.beginPath();
                context.arc(potion.x, potion.y, HEALTH_POTION_SIZE / 2 * 0.8, 0, Math.PI * 2);
                context.fill();
            });
            
            // Draw Player
            const now = Date.now();
            const isInvincible = now < playerHitCooldownEndRef.current;
            
            const playerX = cameraRef.current.x;
            const playerY = cameraRef.current.y;

            context.save();
            
            if (isInvincible && Math.floor(now / 100) % 2 === 0) {
                context.globalAlpha = 0.5; // Clignotement pour l'invincibilité
            }

            if (playerImageRef.current?.complete) {
                context.drawImage(playerImageRef.current, playerX - PLAYER_SIZE / 2, playerY - PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);
            } else {
                // Dessin de secours si l'image n'est pas chargée
                context.fillStyle = isInvincible ? 'rgba(255, 100, 100, 0.9)' : '#f8f8f8';
                context.beginPath();
                context.arc(playerX, playerY, PLAYER_SIZE / 2, 0, Math.PI * 2);
                context.fill();
            }

            context.restore();

            context.restore();
            
            // Draw UI
            const requiredXp = xpForNextLevel(playerStateRef.current.level);
            const xpPercentage = (xpRef.current / requiredXp) * 100;
            context.fillStyle = 'white';
            context.font = '20px Arial';
            context.fillText(`Level: ${playerStateRef.current.level}`, 10, 30);
            context.fillText(`XP: ${Math.floor(xpRef.current)} / ${requiredXp}`, 10, 60);

            // Barre d'XP
            context.fillStyle = '#555';
            context.fillRect(10, 70, 200, 20);
            context.fillStyle = 'gold';
            context.fillRect(10, 70, xpPercentage * 2, 20);

            // Vies (coeurs)
            const health = playerStateRef.current.health;
            const maxHealth = playerStateRef.current.maxHealth;
            const heartSize = 20;
            const heartSpacing = 8;
            const heartsY = 100;
            
            for (let i = 0; i < maxHealth; i++) {
                const x = 10 + i * (heartSize + heartSpacing);
                const y = heartsY;

                context.beginPath();
                const d = heartSize;
                context.moveTo(x, y + d / 4);
                context.quadraticCurveTo(x, y, x + d / 4, y);
                context.quadraticCurveTo(x + d / 2, y, x + d / 2, y + d / 4);
                context.quadraticCurveTo(x + d / 2, y, x + d * 3/4, y);
                context.quadraticCurveTo(x + d, y, x + d, y + d / 4);
                context.quadraticCurveTo(x + d, y + d / 2, x + d * 3 / 4, y + d * 3/4);
                context.lineTo(x + d / 2, y + d);
                context.lineTo(x + d / 4, y + d * 3/4);
                context.quadraticCurveTo(x, y + d / 2, x, y + d / 4);
                context.closePath();
                
                if (i < health) {
                    context.fillStyle = '#e74c3c'; // Flat red
                    context.fill();
                } else {
                    context.strokeStyle = 'white';
                    context.lineWidth = 1;
                    context.stroke();
                }
            }
        };
        
        const gameLoop = () => {
            const now = Date.now();
            const deltaTime = Math.min(now - lastUpdateTimeRef.current, 50); // Cap delta to prevent massive jumps
            lastUpdateTimeRef.current = now;

            update(deltaTime);
            draw();
            animationFrameId = requestAnimationFrame(gameLoop);
        };
        
        gameLoop();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationFrameId);
        };
    }, [isLevelingUp, isGameOver, map, noise2D, spawnPurpleCircle, onGameOver, getTileAt, totalXpForLevel, getRandomPerks, xpForNextLevel]);

    return (
        <div style={{ position: 'relative' }}>
            <canvas ref={canvasRef} style={{ background: 'black', display: 'block' }} />
            {isLevelingUp && (
                <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.8)', color: 'white', padding: '40px',
                    border: '2px solid white', borderRadius: '10px', textAlign: 'center'
                }}>
                    <h2>NIVEAU SUPÉRIEUR !</h2>
                    <p>Choisissez une amélioration :</p>
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
                        )) : <p>Toutes les améliorations ont été acquises !</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Game; 