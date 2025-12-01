import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { PlayerStats } from './types/game';
import { savePlayerProgress } from './services/GameService';
import { audioService } from './services/AudioService';
import StartMenu from './components/StartMenu';
import HUD from './components/HUD';
import DeathScreen from './components/DeathScreen';
import Joystick from './components/Joystick';
import Minimap from './components/Minimap';

type GamePhase = 'menu' | 'playing' | 'dead';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const [gamePhase, setGamePhase] = useState<GamePhase>('menu');
  const [leaderboard, setLeaderboard] = useState<{ username: string; score: number }[]>([]);
  const [deathStats, setDeathStats] = useState<PlayerStats | null>(null);
  const [playerConfig, setPlayerConfig] = useState({ username: '', color: '', skin: '' });

  const lastScoreRef = useRef(0);
  const lastKillsRef = useRef(0);

  useEffect(() => {
    if (canvasRef.current && !gameEngineRef.current) {
      gameEngineRef.current = new GameEngine(canvasRef.current);
    }

    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (gamePhase !== 'playing' || !gameEngineRef.current) return;

    const interval = setInterval(() => {
      const gameState = gameEngineRef.current!.getGameState();
      const snakesArray = Array.from(gameState.snakes.values())
        .filter(s => !s.isDead)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(s => ({ username: s.username, score: s.score }));

      setLeaderboard(snakesArray);

      if (gameState.playerSnake) {
        if (gameState.playerSnake.score > lastScoreRef.current) {
          audioService.playEatSound();
          lastScoreRef.current = gameState.playerSnake.score;
        }

        if (gameState.playerSnake.kills > lastKillsRef.current) {
          audioService.playKillSound();
          lastKillsRef.current = gameState.playerSnake.kills;
        }

        if (gameState.playerSnake.isDead) {
          handleDeath();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [gamePhase]);

  function handleStart(username: string, color: string, skin: string) {
    setPlayerConfig({ username, color, skin });
    if (gameEngineRef.current) {
      gameEngineRef.current.initialize(username, color, skin);
      gameEngineRef.current.start();
      audioService.resume();
      setGamePhase('playing');
      lastScoreRef.current = 0;
      lastKillsRef.current = 0;
    }
  }

  async function handleDeath() {
    if (!gameEngineRef.current) return;

    const gameState = gameEngineRef.current.getGameState();
    const playerSnake = gameState.playerSnake;

    if (!playerSnake) return;

    const snakesArray = Array.from(gameState.snakes.values())
      .filter(s => !s.isDead)
      .sort((a, b) => b.score - a.score);

    const rank = snakesArray.findIndex(s => s.id === 'player') + 1;

    const stats: PlayerStats = {
      score: playerSnake.score,
      mass: Math.floor(playerSnake.mass),
      kills: playerSnake.kills,
      timeAlive: gameEngineRef.current.getTimeAlive(),
      rank: rank > 0 ? rank : snakesArray.length + 1
    };

    setDeathStats(stats);
    setGamePhase('dead');
    audioService.playDeathSound();

    const xpGained = stats.score + stats.kills * 50 + stats.timeAlive;
    await savePlayerProgress(playerConfig.username, stats, xpGained);
  }

  function handleRespawn() {
    if (gameEngineRef.current) {
      gameEngineRef.current.respawn(playerConfig.username, playerConfig.color, playerConfig.skin);
      setGamePhase('playing');
      setDeathStats(null);
      lastScoreRef.current = 0;
      lastKillsRef.current = 0;
    }
  }

  useEffect(() => {
    if (gamePhase !== 'playing' || !gameEngineRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      gameEngineRef.current?.setMousePosition(e.clientX, e.clientY);
    };

    const handleMouseDown = () => {
      gameEngineRef.current?.setBoosting(true);
    };

    const handleMouseUp = () => {
      gameEngineRef.current?.setBoosting(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        gameEngineRef.current?.setBoosting(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        gameEngineRef.current?.setBoosting(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gamePhase]);

  const gameState = gameEngineRef.current?.getGameState();

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {gamePhase === 'menu' && <StartMenu onStart={handleStart} />}

      {gamePhase === 'playing' && gameState?.playerSnake && (
        <>
          <HUD playerSnake={gameState.playerSnake} leaderboard={leaderboard} />
          <Minimap gameState={gameState} playerSnake={gameState.playerSnake} />
          <Joystick
            onMove={(x, y) => gameEngineRef.current?.setTouchPosition(x, y)}
            onRelease={() => gameEngineRef.current?.setTouchPosition(null, null)}
            onBoost={(boosting) => gameEngineRef.current?.setBoosting(boosting)}
          />
        </>
      )}

      {gamePhase === 'dead' && deathStats && (
        <DeathScreen stats={deathStats} onRespawn={handleRespawn} />
      )}
    </div>
  );
}

export default App;
