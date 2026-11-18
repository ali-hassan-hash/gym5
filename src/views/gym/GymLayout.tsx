import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  CreditCard,
  BellRing,
  UserX,
  Settings,
  LogOut,
  Menu,
  X,
  Dumbbell,
  Calendar,
} from 'lucide-react';
import { G5MekaLogo } from '../../components/G5MekaLogo';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import { LocalStorageBadge, OfflineIndicator } from '../../components/OfflineIndicator';

export type GymTab =
  | 'dashboard'
  | 'members'
  | 'add_member'
  | 'fees'
  | 'renewals'
  | 'expired'
  | 'settings';

interface GymLayoutProps {
  currentTab: GymTab;
  onSelectTab: (tab: GymTab) => void;
  renewalsDueCount?: number;
  children: React.ReactNode;
}

export const GymLayout: React.FC<GymLayoutProps> = ({
  currentTab,
  onSelectTab,
  renewalsDueCount = 0,
  children,
}) => {
  const { currentGym, gymSettings, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { id: 'dashboard' as GymTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'members' as GymTab, label: 'Members', icon: Users },
    { id: 'add_member' as GymTab, label: 'Add Member', icon: UserPlus },
    { id: 'fees' as GymTab, label: 'Fee Management', icon: CreditCard },
    {
      id: 'renewals' as GymTab,
      label: 'Upcoming Renewals',
      icon: BellRing,
      badge: renewalsDueCount > 0 ? renewalsDueCount : undefined,
    },
    { id: 'expired' as GymTab, label: 'Expired Members', icon: UserX },
    { id: 'settings' as GymTab, label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tab: GymTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  const gymDisplayName = gymSettings?.gymName || currentGym?.gymName || 'G5MEKA Gym';
  const ownerName = gymSettings?.ownerName || currentGym?.ownerName || 'Gym Owner';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      <OfflineIndicator />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 shrink-0 select-none">
        {/* Gym Brand Header */}
        <div className="p-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <G5MekaLogo size="sm" showText={false} />
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-white truncate leading-tight">
                {gymDisplayName}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-zinc-400 font-mono">
                  {currentGym?.id}
                </span>
                <span className="text-[10px] text-zinc-600">&bull;</span>
                <span className="text-[10px] text-emerald-400 font-medium">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer with Owner Profile */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300">
              {ownerName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">{ownerName}</p>
              <p className="text-[10px] text-zinc-500 truncate">
                {currentGym?.ownerMobile || 'Gym Owner'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PWAInstallButton compact />
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs font-medium text-zinc-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-950/20 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <G5MekaLogo size="xs" showText={false} />
          <div>
            <h2 className="text-xs font-bold text-white truncate max-w-[170px]">
              {gymDisplayName}
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">{currentGym?.id}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {renewalsDueCount > 0 && (
            <button
              onClick={() => onSelectTab('renewals')}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
            >
              {renewalsDueCount} due
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-900 border-b border-zinc-800 p-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-2 mt-2 border-t border-zinc-800 flex items-center justify-between px-1">
            <span className="text-xs text-zinc-400">{ownerName}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 text-xs font-medium text-red-400 hover:bg-zinc-800 border border-zinc-800"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur-xs">
          <div className="flex items-center gap-4">
            <h1 className="text-base font-bold text-white">
              {navigation.find((n) => n.id === currentTab)?.label || 'Dashboard'}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 border-l border-zinc-800 pl-4 font-mono">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LocalStorageBadge />
            <PWAInstallButton />
          </div>
        </header>

        {/* Child Views */}
        <div className="flex-1 p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
};
