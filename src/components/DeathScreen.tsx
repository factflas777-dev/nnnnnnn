import { PlayerStats } from '../types/game';

interface DeathScreenProps {
  stats: PlayerStats;
  onRespawn: () => void;
}

export default function DeathScreen({ stats, onRespawn }: DeathScreenProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border-2 border-red-600">
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold text-red-500 mb-2">You Died!</h2>
          <p className="text-gray-400">Better luck next time</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
            <span className="text-gray-300">Final Score</span>
            <span className="text-2xl font-bold text-yellow-400">{stats.score}</span>
          </div>

          <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
            <span className="text-gray-300">Final Mass</span>
            <span className="text-xl font-bold text-blue-400">{stats.mass}</span>
          </div>

          <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
            <span className="text-gray-300">Kills</span>
            <span className="text-xl font-bold text-green-400">{stats.kills}</span>
          </div>

          <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
            <span className="text-gray-300">Time Alive</span>
            <span className="text-xl font-bold text-purple-400">
              {Math.floor(stats.timeAlive / 60)}:{(stats.timeAlive % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
            <span className="text-gray-300">Rank</span>
            <span className="text-xl font-bold text-orange-400">#{stats.rank}</span>
          </div>
        </div>

        <button
          onClick={onRespawn}
          className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-200 transform hover:scale-105"
        >
          Respawn
        </button>
      </div>
    </div>
  );
}
