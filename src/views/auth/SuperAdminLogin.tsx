import React, { useState } from 'react';
import { Shield, KeyRound, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { G5MekaLogo } from '../../components/G5MekaLogo';
import { useAuth } from '../../context/AuthContext';

interface SuperAdminLoginProps {
  onSwitchToOwnerLogin: () => void;
}

export const SuperAdminLogin: React.FC<SuperAdminLoginProps> = ({ onSwitchToOwnerLogin }) => {
  const { loginSuperAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginSuperAdmin(username, password);
      if (!res.success) {
        setError(res.error || 'Invalid credentials');
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
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <G5MekaLogo size="lg" showTagline={true} className="mb-4" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-medium text-zinc-300 mb-2">
            <Shield className="w-3.5 h-3.5 text-zinc-300" />
            Super Administrator Control Center
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Super Admin Sign In
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Restricted access for product owner to manage gyms, licensing, and pricing.
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
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
              Admin Username
            </label>
            <input
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              placeholder="e.g. admin"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Admin Password
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
            <span>{isLoading ? 'Verifying...' : 'Sign In as Super Admin'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Switch to Gym Owner login */}
        <div className="mt-6 text-center">
          <button
            onClick={onSwitchToOwnerLogin}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to Gym Owner Sign In</span>
          </button>
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-6">
          G5MEKA &bull; Protected Super Admin Portal
        </p>
      </div>
    </div>
  );
};
