import { Snake } from '../types/game';

interface HUDProps {
  playerSnake: Snake | null;
  leaderboard: { username: string; score: number }[];
}

export default function HUD({ playerSnake, leaderboard }: HUDProps) {
  if (!playerSnake) return null;

  const massPercentage = Math.min(100, (playerSnake.mass / 500) * 100);

  return (
    <>
      <div className="fixed top-4 left-4 bg-black bg-opacity-60 text-white p-4 rounded-lg z-40">
        <div className="text-2xl font-bold mb-2">Score: {playerSnake.score}</div>
        <div className="text-sm">Mass: {Math.floor(playerSnake.mass)}</div>
        <div className="text-sm">Kills: {playerSnake.kills}</div>
        <div className="text-sm">Length: {playerSnake.segments.length}</div>

        <div className="mt-3">
          <div className="text-xs mb-1">Mass</div>
          <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-300"
              style={{ width: `${massPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="fixed top-4 right-4 bg-black bg-opacity-60 text-white p-4 rounded-lg z-40 w-48">
        <div className="text-lg font-bold mb-3 border-b border-gray-600 pb-2">Leaderboard</div>
        <div className="space-y-2">
          {leaderboard.slice(0, 10).map((entry, index) => (
            <div
              key={index}
              className={`flex justify-between text-sm ${
                entry.username === playerSnake.username ? 'text-yellow-400 font-bold' : ''
              }`}
            >
              <span className="truncate flex-1">
                {index + 1}. {entry.username}
              </span>
              <span className="ml-2">{entry.score}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-60 px-4 py-2 rounded-lg z-40 hidden md:block">
        Move: Mouse | Boost: Space or Left Click
      </div>
    </>
  );
}
