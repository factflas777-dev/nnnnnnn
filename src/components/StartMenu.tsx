import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Zap, Upload as UploadIcon, X } from 'lucide-react';
import FaceUpload from './FaceUpload';
import { getOrCreateProfile, removeFaceImage, Profile } from '../services/ProfileService';

interface StartMenuProps {
  onStart: (username: string, color: string, skin: string, faceUrl?: string) => void;
}

interface Skin {
  id: string;
  name: string;
  unlock_level: number;
  unlock_xp: number;
  is_premium: boolean;
  pattern: string;
  glow_effect: boolean;
}

export default function StartMenu({ onStart }: StartMenuProps) {
  const [username, setUsername] = useState('');
  const [selectedColor, setSelectedColor] = useState('#00ff00');
  const [selectedSkin, setSelectedSkin] = useState('default');
  const [skins, setSkins] = useState<Skin[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showFaceUpload, setShowFaceUpload] = useState(false);

  const colors = [
    '#00ff00', '#ff0000', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff8800', '#88ff00', '#0088ff', '#ff0088', '#8800ff', '#00ff88'
  ];

  useEffect(() => {
    loadSkins();
    const savedUsername = localStorage.getItem('slither_username');
    if (savedUsername) {
      setUsername(savedUsername);
      loadProfile(savedUsername);
    }
  }, []);

  async function loadSkins() {
    const { data } = await supabase
      .from('skins')
      .select('*')
      .order('unlock_level');

    if (data) {
      setSkins(data);
    }
  }

  async function loadProfile(username: string) {
    const profileData = await getOrCreateProfile(username);
    if (profileData) {
      setProfile(profileData);
    }
  }

  function handleStart() {
    if (username.trim()) {
      localStorage.setItem('slither_username', username.trim());
      onStart(username.trim(), selectedColor, selectedSkin, profile?.face_url || undefined);
    }
  }

  async function handleRemoveFace() {
    if (!profile) return;
    const success = await removeFaceImage(profile.user_id);
    if (success) {
      setProfile({ ...profile, face_url: null, face_state: 'none' });
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center z-50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-10 -top-48 -left-48 animate-pulse" />
        <div className="absolute w-96 h-96 bg-green-500 rounded-full filter blur-3xl opacity-10 -bottom-48 -right-48 animate-pulse" />
      </div>

      <div className="relative bg-gray-900 bg-opacity-90 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 border-2 border-gray-700">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Zap className="w-12 h-12 text-green-500" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Slither Arena
          </h1>
          <p className="text-gray-400">Eat. Grow. Survive.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter Your Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleStart()}
              placeholder="Snake Master"
              maxLength={20}
              className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border-2 border-gray-700 focus:border-green-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Choose Your Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full transition-all transform hover:scale-110 ${
                    selectedColor === color
                      ? 'ring-4 ring-white scale-110'
                      : 'ring-2 ring-gray-700'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Skin
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {skins.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => setSelectedSkin(skin.name)}
                  className={`px-3 py-2 rounded-lg transition-all text-sm ${
                    selectedSkin === skin.name
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {skin.name}
                  {skin.glow_effect && ' ✨'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom Face (Head Only)
            </label>
            <div className="bg-gray-800 rounded-lg p-4 space-y-3">
              {profile?.face_url ? (
                <div className="flex items-center gap-4">
                  <img
                    src={profile.face_url}
                    alt="Face preview"
                    className="w-16 h-16 rounded-full border-2 border-green-500"
                  />
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">Custom face uploaded</p>
                    <p className="text-xs text-gray-500">
                      {profile.face_state === 'approved' && 'Active'}
                      {profile.face_state === 'pending' && 'Processing...'}
                      {profile.face_state === 'flagged' && 'Under review'}
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveFace}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowFaceUpload(true)}
                  disabled={!username.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <UploadIcon className="w-5 h-5" />
                  Upload Face
                </button>
              )}
              <p className="text-xs text-gray-500 text-center">
                Only your snake's head will show this image
              </p>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!username.trim()}
            className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
          >
            Start Game
          </button>
        </div>

        {showFaceUpload && profile && (
          <FaceUpload
            userId={profile.user_id}
            onSuccess={(faceUrl) => {
              setProfile({ ...profile, face_url: faceUrl, face_state: 'approved' });
              setShowFaceUpload(false);
            }}
            onClose={() => setShowFaceUpload(false)}
          />
        )}

        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Desktop: Move with mouse, boost with Space/Click</p>
          <p>Mobile: Use joystick and boost button</p>
        </div>
      </div>
    </div>
  );
}
