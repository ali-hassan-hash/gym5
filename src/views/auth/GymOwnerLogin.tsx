import React, { useState } from 'react';
import { Dumbbell, ArrowRight, ShieldAlert, AlertCircle, Lock } from 'lucide-react';
import { G5MekaLogo } from '../../components/G5MekaLogo';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import { LocalStorageBadge } from '../../components/OfflineIndicator';

interface GymOwnerLoginProps {
  onSwitchToSuperAdmin: () => void;
}

export const GymOwnerLogin: React.FC<GymOwnerLoginProps> = ({ onSwitchToSuperAdmin }) => {
  const { loginGymOwner } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginGymOwner(username, password);
      if (!res.success) {
        setError(res.error || 'Authentication failed');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 sm:p-6 text-zinc-100">
      <div className="w-full max-w-md">
        {/* Top Badges */}
        <div className="flex items-center justify-between mb-4">
          <LocalStorageBadge />
          <PWAInstallButton compact />
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <G5MekaLogo size="lg" showTagline={true} className="mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Gym Owner Sign In
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Enter your authorized gym credentials provided by your G5MEKA administrator.
          </p>
        </div>

        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Gym Username
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              placeholder="e.g. powergym"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              placeholder="••••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold py-3 text-sm transition disabled:opacity-50 shadow-lg mt-2"
          >
            <span>{isLoading ? 'Signing In...' : 'Sign In to Gym Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Access Notice: No public registration */}
        <div className="mt-6 rounded-xl bg-zinc-900/50 border border-zinc-800/80 p-3.5 text-center text-xs text-zinc-400">
          <p className="text-[11px] text-zinc-400">
            <strong>Private System:</strong> No public registration is available. Only authorized gym owners registered by Super Admin can access the system.
          </p>
        </div>

        {/* Super admin portal switch */}
        <div className="mt-5 text-center">
          <button
            onClick={onSwitchToSuperAdmin}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
          >
            <Lock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Product Owner / Super Admin Portal</span>
          </button>
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-6">
          G5MEKA &bull; Digital Gym Management System &bull; Local-First
        </p>
      </div>
    </div>
  );
};
