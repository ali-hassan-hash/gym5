import React, { useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  Layers,
} from 'lucide-react';
import { G5MekaLogo } from '../../components/G5MekaLogo';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from '../../components/PWAInstallButton';
import { LocalStorageBadge, OfflineIndicator } from '../../components/OfflineIndicator';

export type SuperAdminTab = 'dashboard' | 'gyms' | 'pricing' | 'settings';

interface SuperAdminLayoutProps {
  currentTab: SuperAdminTab;
  onSelectTab: (tab: SuperAdminTab) => void;
  children: React.ReactNode;
}

export const SuperAdminLayout: React.FC<SuperAdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const { admin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { id: 'dashboard' as SuperAdminTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'gyms' as SuperAdminTab, label: 'Gyms & Licenses', icon: Building2 },
    { id: 'pricing' as SuperAdminTab, label: 'Pricing & Sales', icon: DollarSign },
    { id: 'settings' as SuperAdminTab, label: 'System Settings', icon: Settings },
  ];

  const handleTabClick = (tab: SuperAdminTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row">
      <OfflineIndicator />

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 shrink-0 select-none">
        {/* Brand header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <G5MekaLogo size="sm" showTagline={false} />
          <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            ADMIN
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Admin profile footer */}
        <div className="p-4 border-t border-zinc-800 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
              <Shield className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {admin?.username || 'Super Admin'}
              </p>
              <p className="text-[10px] text-zinc-500 truncate">{admin?.email}</p>
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

      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
        <G5MekaLogo size="xs" showTagline={false} />
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            Admin
          </span>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-900 border-b border-zinc-800 p-3 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  active
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 mt-2 border-t border-zinc-800 flex items-center justify-between px-1">
            <span className="text-xs text-zinc-400">{admin?.username}</span>
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
        {/* Top Navbar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-zinc-800 bg-zinc-950/60 backdrop-blur-xs">
          <div>
            <h2 className="text-base font-bold text-white capitalize">
              {navigation.find((n) => n.id === currentTab)?.label || 'Overview'}
            </h2>
            <p className="text-xs text-zinc-400">
              G5MEKA Central Platform Control
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LocalStorageBadge />
            <PWAInstallButton />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
};
