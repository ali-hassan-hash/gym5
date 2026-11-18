import React, { useState, useEffect } from 'react';
import {
  Settings,
  Shield,
  KeyRound,
  Download,
  Upload,
  Check,
  AlertTriangle,
  Globe,
  Building,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getSystemSettings,
  updateSystemSettings,
  exportEntireDatabase,
  importEntireDatabase,
} from '../../db';
import type { SystemSettings } from '../../types';

export const SuperAdminSettings: React.FC = () => {
  const { admin, updateAdminPassword } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Backup / restore
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    getSystemSettings().then(setSettings);
  }, []);

  const handleSaveSystemSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSystemSettings(settings);
      setSaveMessage('System settings updated successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setSaveMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordMessage({ text: 'Password must be at least 8 characters long.', error: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'Passwords do not match.', error: true });
      return;
    }

    const success = await updateAdminPassword(newPassword);
    if (success) {
      setPasswordMessage({ text: 'Password updated successfully! Keep it secure.' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMessage(null), 4000);
    } else {
      setPasswordMessage({ text: 'Failed to update password.', error: true });
    }
  };

  const handleExportBackup = async () => {
    try {
      const json = await exportEntireDatabase();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `G5MEKA-Platform-Full-Backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to generate platform backup.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      'RESTORE WARNING:\nRestoring a full platform backup will replace current local database records with the file contents. Do you want to proceed?'
    );
    if (!confirmRestore) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await importEntireDatabase(content);
        alert('Database restored successfully! Reloading...');
        window.location.reload();
      } catch (err: any) {
        alert(`Failed to restore backup: ${err.message || 'Invalid format'}`);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  if (!settings) {
    return <div className="text-zinc-400 text-xs">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Super Admin Settings
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure central platform settings, currency, authentication credentials, and data backups.
        </p>
      </div>

      {saveMessage && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
          <Check className="w-4 h-4" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* 1. System & Currency Settings */}
      <form
        onSubmit={handleSaveSystemSettings}
        className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <Globe className="w-4 h-4 text-zinc-300" />
          <h2 className="text-sm font-semibold text-white">Platform Business & Currency</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-medium mb-1">Currency Code</label>
            <select
              value={settings.currency}
              onChange={(e) => {
                const cur = e.target.value;
                const symbols: Record<string, string> = {
                  PKR: 'Rs.',
                  USD: '$',
                  EUR: '€',
                  GBP: '£',
                  AED: 'AED',
                  SAR: 'SAR',
                  INR: '₹',
                };
                setSettings({
                  ...settings,
                  currency: cur,
                  currencySymbol: symbols[cur] || cur,
                });
              }}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white"
            >
              <option value="PKR">PKR (Pakistani Rupee - Rs.)</option>
              <option value="USD">USD (US Dollar - $)</option>
              <option value="EUR">EUR (Euro - €)</option>
              <option value="GBP">GBP (British Pound - £)</option>
              <option value="AED">AED (UAE Dirham - AED)</option>
              <option value="SAR">SAR (Saudi Riyal - SAR)</option>
              <option value="INR">INR (Indian Rupee - ₹)</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Currency Symbol Display</label>
            <input
              type="text"
              value={settings.currencySymbol}
              onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Platform Business Name</label>
            <input
              type="text"
              value={settings.businessName}
              onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Support Contact Email</label>
            <input
              type="email"
              value={settings.contactEmail}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white"
            />
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Business Settings'}</span>
          </button>
        </div>
      </form>

      {/* 2. Super Admin Password */}
      <form
        onSubmit={handleChangePassword}
        className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <KeyRound className="w-4 h-4 text-zinc-300" />
          <h2 className="text-sm font-semibold text-white">Change Super Admin Password</h2>
        </div>

        {passwordMessage && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              passwordMessage.error
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {passwordMessage.error ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
            <span>{passwordMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-medium mb-1">New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white font-mono"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white font-mono"
              placeholder="Re-enter new password"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 border border-zinc-700 transition"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Update Admin Password</span>
          </button>
        </div>
      </form>

      {/* 3. System Data Backup & Restore */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <Shield className="w-4 h-4 text-zinc-300" />
          <h2 className="text-sm font-semibold text-white">Full System Backup & Disaster Recovery</h2>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Because G5MEKA is local-first, backing up your data to a secure file protects your system against browser cache clears or hardware changes. You can export the entire database and restore it anytime.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Export button */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-white">Export Platform Backup</h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                Downloads a JSON archive containing all registered gyms, owners, members, payments, and licensing records.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-white text-xs font-medium hover:bg-zinc-700 border border-zinc-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Full Backup (JSON)</span>
            </button>
          </div>

          {/* Import / Restore */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-white">Restore Database</h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                Restore the database from a previously exported G5MEKA JSON backup file.
              </p>
            </div>
            <label className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium hover:text-white hover:bg-zinc-700 border border-zinc-700 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>{importing ? 'Restoring...' : 'Upload & Restore Backup'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
