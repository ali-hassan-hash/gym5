import React, { useEffect, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  Users,
  DollarSign,
  CreditCard,
  Clock,
  ShieldCheck,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { GymAccount, SystemSettings } from '../../types';
import { getAllGyms, getSystemSettings } from '../../db';
import { formatDate } from '../../utils/date';

interface SuperAdminDashboardProps {
  onNavigateTab: (tab: 'gyms' | 'pricing' | 'settings') => void;
  onOpenAddGym: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onNavigateTab,
  onOpenAddGym,
}) => {
  const [gyms, setGyms] = useState<GymAccount[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const allGyms = await getAllGyms();
      const sysSettings = await getSystemSettings();
      setGyms(allGyms);
      setSettings(sysSettings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const currency = settings?.currencySymbol || 'Rs.';

  // Actual Calculations
  const totalGyms = gyms.length;
  const activeGyms = gyms.filter((g) => g.accountStatus === 'active').length;
  const inactiveGyms = gyms.filter((g) => g.accountStatus === 'inactive' || g.accountStatus === 'suspended').length;
  const totalOwners = gyms.length; // 1 owner per registered gym

  const totalSales = gyms.reduce((acc, g) => acc + (g.pricing?.negotiatedPrice || 0), 0);
  const totalRevenue = gyms.reduce((acc, g) => acc + (g.pricing?.paymentReceived || 0), 0);
  const pendingPayments = gyms.reduce((acc, g) => acc + (g.pricing?.remainingPayment || 0), 0);
  const totalLicenses = gyms.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-zinc-400 text-sm">
        Loading system records...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-850 border border-zinc-800 p-6 shadow-sm">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Platform Administrator
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            G5MEKA Control Center
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time status across all client gym registrations and licensing.
          </p>
        </div>

        <button
          onClick={onOpenAddGym}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Gym</span>
        </button>
      </div>

      {/* Primary Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gyms */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Registered Gyms</span>
            <Building2 className="w-4 h-4 text-zinc-300" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalGyms}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Total gyms on system</p>
        </div>

        {/* Active Gyms */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Active Licenses</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{activeGyms}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Currently operating gyms</p>
        </div>

        {/* Inactive / Suspended Gyms */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Inactive / Suspended</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-300 font-mono">{inactiveGyms}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Expired or blocked</p>
        </div>

        {/* Total Owners */}
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-medium">Gym Owners</span>
            <Users className="w-4 h-4 text-zinc-300" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalOwners}</div>
          <p className="text-[11px] text-zinc-500 mt-1">Authorized owner accounts</p>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-300" />
            <h2 className="text-sm font-semibold text-white">Sales & Revenue Real-Time Summary</h2>
          </div>
          <button
            onClick={() => onNavigateTab('pricing')}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
          >
            <span>Manage Pricing</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 block mb-1">Total Sales Billed</span>
            <div className="text-xl font-bold text-white font-mono">
              {currency} {totalSales.toLocaleString()}
            </div>
            <span className="text-[10px] text-zinc-500">Across {totalGyms} gym accounts</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 block mb-1">Total Revenue Collected</span>
            <div className="text-xl font-bold text-emerald-400 font-mono">
              {currency} {totalRevenue.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-500/80">Received in cash / bank</span>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80">
            <span className="text-xs text-zinc-400 block mb-1">Pending License Dues</span>
            <div className="text-xl font-bold text-amber-400 font-mono">
              {currency} {pendingPayments.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-500/80">Remaining receivables</span>
          </div>
        </div>
      </div>

      {/* Recent Gyms Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-white">Registered Gym Clients</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Recently added gym licenses</p>
          </div>
          <button
            onClick={() => onNavigateTab('gyms')}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
          >
            <span>View All ({gyms.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {gyms.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Building2 className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No Gyms Registered Yet</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Your database is clean. Click "Add New Gym" to register your first gym client and issue their owner credentials.
            </p>
            <button
              onClick={onOpenAddGym}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Register First Gym</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Gym ID</th>
                  <th className="px-5 py-3 font-medium">Gym Name</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">License Status</th>
                  <th className="px-5 py-3 font-medium">License Expiry</th>
                  <th className="px-5 py-3 font-medium text-right">Fee Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {gyms.slice(0, 5).map((gym) => (
                  <tr key={gym.id} className="hover:bg-zinc-850/50 transition">
                    <td className="px-5 py-3.5 font-mono text-zinc-400">{gym.id}</td>
                    <td className="px-5 py-3.5 font-semibold text-white">{gym.gymName}</td>
                    <td className="px-5 py-3.5 text-zinc-300">{gym.ownerName}</td>
                    <td className="px-5 py-3.5 text-zinc-400">{gym.ownerMobile}</td>
                    <td className="px-5 py-3.5">
                      {gym.accountStatus === 'active' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      ) : gym.accountStatus === 'suspended' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-mono">
                      {formatDate(gym.licenseExpiryDate)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-zinc-300">
                      {currency} {(gym.pricing?.paymentReceived || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
