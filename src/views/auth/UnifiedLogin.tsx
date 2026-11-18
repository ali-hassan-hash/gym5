import React, { useState } from 'react';
import {
  Shield,
  Dumbbell,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Lock,
  Building2,
} from 'lucide-react';
import { G5MekaLogo } from '../../components/G5MekaLogo';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import { LocalStorageBadge } from '../../components/OfflineIndicator';

type LoginPortal = 'owner' | 'admin';

export const UnifiedLogin: React.FC = () => {
  const { loginGymOwner, loginSuperAdmin } = useAuth();
  const [activePortal, setActivePortal] = useState<LoginPortal>('owner');

  // Gym Owner State
  const [gymUsername, setGymUsername] = useState('');
  const [gymPassword, setGymPassword] = useState('');

  // Super Admin State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginGymOwner(gymUsername, gymPassword);
      if (!res.success) {
        setError(res.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await loginSuperAdmin(adminUsername, adminPassword);
      if (!res.success) {
        setError(res.error || 'Invalid Super Admin credentials');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 sm:p-6 text-zinc-100 select-none">
      <div className="w-full max-w-md">
        {/* Top Bar Badges */}
        <div className="flex items-center justify-between mb-4">
          <LocalStorageBadge />
          <PWAInstallButton compact />
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <G5MekaLogo size="lg" showTagline={true} className="mb-3" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Digital Gym System
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Sign in to access your gym operations register or platform administrative controls.
          </p>
        </div>

        {/* Segmented Dual-Option Portal Switcher */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6 shadow-md">
          <button
            type="button"
            onClick={() => {
              setActivePortal('owner');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition ${
              activePortal === 'owner'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Dumbbell className={`w-4 h-4 ${activePortal === 'owner' ? 'text-emerald-400' : 'text-zinc-500'}`} />
            <span>Gym Owner Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActivePortal('admin');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition ${
              activePortal === 'admin'
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className={`w-4 h-4 ${activePortal === 'admin' ? 'text-zinc-200' : 'text-zinc-500'}`} />
            <span>Super Admin Login</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400 leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Portal 1: Gym Owner Login Form */}
        {activePortal === 'owner' && (
          <form
            onSubmit={handleOwnerSubmit}
            className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-zinc-300">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Gym Owner Sign In
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Gym Username or Email
              </label>
              <input
                type="text"
                required
                autoFocus
                value={gymUsername}
                onChange={(e) => setGymUsername(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition font-mono"
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
                value={gymPassword}
                onChange={(e) => setGymPassword(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition font-mono"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold py-3 text-sm transition disabled:opacity-50 shadow-lg mt-2"
            >
              <span>{isLoading ? 'Verifying Account...' : 'Sign In as Gym Owner'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-zinc-500">
                Only registered gym accounts can log in. No public gym registration.
              </p>
            </div>
          </form>
        )}

        {/* Portal 2: Super Admin Login Form */}
        {activePortal === 'admin' && (
          <form
            onSubmit={handleAdminSubmit}
            className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-zinc-300">
              <Shield className="w-4 h-4 text-zinc-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                Super Admin Access
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Admin Username or Email
              </label>
              <input
                type="text"
                required
                autoFocus
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition font-mono"
                placeholder="e.g. admin or admin@g5meka.local"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition font-mono"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold py-3 text-sm transition disabled:opacity-50 shadow-lg mt-2"
            >
              <span>{isLoading ? 'Verifying Super Admin...' : 'Sign In as Super Admin'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-zinc-500">
                Product Administrator portal only. Requires pre-configured master credentials.
              </p>
            </div>
          </form>
        )}

        {/* Security & Multi-Device Notice */}
        <div className="mt-6 rounded-xl bg-zinc-900/40 border border-zinc-800/80 p-3.5 text-center text-xs text-zinc-400">
          <p className="text-[11px] text-zinc-400">
            <strong>Centralized Platform:</strong> Accounts created by Super Admin are securely recognized across mobile phones, tablets, and laptops.
          </p>
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-6">
          G5MEKA &bull; Digital Gym Management System &bull; Multi-Device Central Sync
        </p>
      </div>
    </div>
  );
};
