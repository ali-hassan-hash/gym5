import React, { useEffect, useState } from 'react';
import { WifiOff, ShieldCheck } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-zinc-900 border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-300 shadow-xl">
      <span className="flex h-2 w-2 relative">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Offline Mode — All gym records are safely saved locally</span>
    </div>
  );
};

export const LocalStorageBadge: React.FC = () => {
  return (
    <div
      title="All data is centrally synchronized with persistent server storage and cached locally for speed and offline resilience."
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400"
    >
      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
      <span className="hidden sm:inline">Multi-Device Central Sync</span>
    </div>
  );
};
