import React, { useState } from 'react';
import { Shield, KeyRound, Copy, Check, ArrowRight, Info, AlertTriangle } from 'lucide-react';
import { G5MekaLogo } from '../../components/G5MekaLogo';
import { useAuth } from '../../context/AuthContext';
import { generateStrongPassword } from '../../utils/crypto';

export const InitialSetup: React.FC = () => {
  const { setupAdmin } = useAuth();
  const [username, setUsername] = useState('admin');
  const [email, setEmail] = useState('admin@g5meka.local');
  const [password, setPassword] = useState(() => generateStrongPassword(14));
  const [copied, setCopied] = useState(false);
  const [savedAcknowledged, setSavedAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<{ username: string; password: string } | null>(null);

  const handleCopy = () => {
    const textToCopy = `G5MEKA Super Admin Credentials\nUsername: ${username}\nEmail: ${email}\nPassword: ${password}\nStorage: Central Server Database (Multi-Device)`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerateNewPassword = () => {
    setPassword(generateStrongPassword(14));
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedAcknowledged) {
      alert('Please acknowledge that you have copied or saved these credentials securely.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await setupAdmin(username, password, email);
      setGeneratedResult(res);
    } catch (err) {
      console.error(err);
      alert('Failed to initialize administrator.');
    } finally {
      setIsSubmitting(false);
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
            First-Time System Initialization
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Super Administrator Setup
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-xs">
            Clean installation detected. Set up your local platform owner credentials to begin.
          </p>
        </div>

        {/* Centralized multi-device architecture notice */}
        <div className="mb-6 rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 text-xs text-zinc-300 space-y-2">
          <div className="flex items-center gap-2 text-zinc-200 font-semibold">
            <Info className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Centralized Multi-Device Architecture</span>
          </div>
          <p className="text-zinc-400 leading-relaxed text-[11px]">
            Once initialized on this device, your Super Admin credentials and gym records are centrally stored on the server database. You will be able to log in directly on mobile phones, tablets, or laptops without ever repeating setup.
          </p>
        </div>

        {/* Setup Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Super Admin Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              placeholder="e.g. admin"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Admin Contact Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 transition"
              placeholder="e.g. admin@g5meka.local"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Generated Strong Password
              </label>
              <button
                type="button"
                onClick={handleGenerateNewPassword}
                className="text-[11px] text-zinc-400 hover:text-white underline transition"
              >
                Regenerate
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 font-mono text-sm px-3.5 py-2.5 pr-20 text-zinc-100 focus:outline-none focus:border-zinc-500 transition"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded-lg bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Do not lose this password. You will need it to manage gyms and licenses.
            </p>
          </div>

          {/* Warning & Acknowledgment checkbox */}
          <div className="pt-2 border-t border-zinc-800">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={savedAcknowledged}
                onChange={(e) => setSavedAcknowledged(e.target.checked)}
                className="mt-0.5 rounded border-zinc-700 bg-zinc-950 text-white focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-xs text-zinc-300 leading-snug">
                I have securely copied or saved the Super Admin username and password.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !savedAcknowledged}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold py-3 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <span>{isSubmitting ? 'Initializing...' : 'Initialize & Access Super Admin'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-[11px] text-zinc-500 mt-6">
          G5MEKA &bull; Digital Gym Operating System &bull; Version 1.0.0
        </p>
      </div>
    </div>
  );
};
