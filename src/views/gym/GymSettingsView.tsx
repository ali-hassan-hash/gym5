import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building,
  User,
  Phone,
  MapPin,
  MessageSquare,
  Download,
  Upload,
  Check,
  Save,
  ShieldCheck,
  DollarSign,
  Clock,
  RotateCcw,
} from 'lucide-react';
import type { GymSettings } from '../../types';
import {
  getGymSettings,
  saveGymSettings,
  exportGymData,
  importGymData,
} from '../../db';
import { useAuth } from '../../context/AuthContext';
import { buildRenewalWhatsAppMessage } from '../../utils/date';

interface GymSettingsViewProps {
  gymId: string;
}

export const GymSettingsView: React.FC<GymSettingsViewProps> = ({ gymId }) => {
  const { currentGym, updateCurrentGymSettings } = useAuth();
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    getGymSettings(gymId).then(setSettings);
  }, [gymId]);

  if (!settings) {
    return <div className="text-zinc-400 text-xs py-8">Loading gym settings...</div>;
  }

  const currency = settings.currencySymbol || 'Rs.';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateCurrentGymSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportGymBackup = async () => {
    try {
      const json = await exportGymData(gymId);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `${settings.gymName.replace(/[^a-zA-Z0-9]/g, '_')}-Backup-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to export gym data.');
    }
  };

  const handleImportGymBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      'RESTORE CONFIRMATION:\nRestoring a backup will replace your current members and payment logs with the records in the backup file. Proceed?'
    );
    if (!confirmRestore) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await importGymData(gymId, content);
        alert('Gym data restored successfully! Refreshing...');
        window.location.reload();
      } catch (err: any) {
        alert(`Failed to restore gym data: ${err.message || 'Invalid format'}`);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  // Preview message with current template
  const previewMessage = buildRenewalWhatsAppMessage({
    template: settings.whatsappMessageTemplate,
    memberName: 'Ahmed',
    gymName: settings.gymName,
    daysRemaining: 5,
    renewalDate: '2026-11-10',
    monthlyFee: settings.defaultMonthlyFee,
    currencySymbol: currency,
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Gym Settings & Owner Profile
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Manage gym contact information, membership fee defaults, WhatsApp message template, and backups.
        </p>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
          <Check className="w-4 h-4" />
          <span>Gym settings saved successfully.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* 1. Gym Profile */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-zinc-300" />
              <h2 className="text-sm font-semibold text-white">Gym & Owner Information</h2>
            </div>
            <div className="text-[11px] font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              Gym ID: <span className="text-white font-bold">{currentGym?.id}</span> (Permanent)
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Gym Name *</label>
              <input
                type="text"
                required
                value={settings.gymName}
                onChange={(e) => setSettings({ ...settings, gymName: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Owner Name *</label>
              <input
                type="text"
                required
                value={settings.ownerName}
                onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Contact Phone Number</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Gym Physical Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2. Membership Fee Defaults */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
            <DollarSign className="w-4 h-4 text-zinc-300" />
            <h2 className="text-sm font-semibold text-white">Membership Fee Defaults</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Default Monthly Fee ({currency})
              </label>
              <input
                type="number"
                value={settings.defaultMonthlyFee}
                onChange={(e) => setSettings({ ...settings, defaultMonthlyFee: Number(e.target.value) })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white font-mono focus:outline-none"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Pre-fills the monthly fee field when adding new members.
              </span>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Default Duration (Months)
              </label>
              <select
                value={settings.defaultDurationMonths}
                onChange={(e) => setSettings({ ...settings, defaultDurationMonths: Number(e.target.value) })}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white focus:outline-none"
              >
                <option value={1}>1 Month</option>
                <option value={2}>2 Months</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months</option>
                <option value={12}>12 Months (1 Year)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. WhatsApp Reminder Template */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">WhatsApp Reminder Message Template</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettings({
                  ...settings,
                  whatsappMessageTemplate:
                    'Hello {member_name}! Your {gym_name} gym membership is due for renewal in {days} days ({renewal_date}). Monthly fee: {fee_amount}. Please renew to continue your workout streak. Thank you!',
                });
              }}
              className="text-[11px] text-zinc-400 hover:text-white underline"
            >
              Reset to Default
            </button>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">
              Custom Message Template
            </label>
            <textarea
              rows={3}
              value={settings.whatsappMessageTemplate}
              onChange={(e) => setSettings({ ...settings, whatsappMessageTemplate: e.target.value })}
              placeholder="Leave empty for smart system default, or customize using placeholders below..."
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 p-3 text-white text-xs placeholder-zinc-500 focus:outline-none"
            />

            <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] text-zinc-400">
              <span className="text-zinc-500">Available variables:</span>
              <code className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">{'{member_name}'}</code>
              <code className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">{'{gym_name}'}</code>
              <code className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">{'{days}'}</code>
              <code className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">{'{renewal_date}'}</code>
              <code className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">{'{fee_amount}'}</code>
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              Live WhatsApp Preview (for Ahmed):
            </span>
            <p className="text-xs text-zinc-200 italic">
              "{previewMessage}"
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition shadow-md"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Gym Settings'}</span>
          </button>
        </div>
      </form>

      {/* 4. Local Data Backup & Multi-Device Restore */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
          <ShieldCheck className="w-4 h-4 text-zinc-300" />
          <h2 className="text-sm font-semibold text-white">Gym Data Backup & Transfer</h2>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Your gym register is stored safely in this browser's IndexedDB. To transfer your data to a laptop, phone, or another computer, download a backup file below and upload it on your other device.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Export */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-white">Download Gym Backup</h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                Exports all registered members, payment histories, and gym settings as a JSON file.
              </p>
            </div>
            <button
              onClick={handleExportGymBackup}
              className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-white text-xs font-medium hover:bg-zinc-700 border border-zinc-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {settings.gymName} Backup</span>
            </button>
          </div>

          {/* Import */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-white">Restore Gym Backup</h3>
              <p className="text-[11px] text-zinc-500 mt-1">
                Upload a backup file previously exported from G5MEKA to restore your records.
              </p>
            </div>
            <label className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-medium hover:text-white hover:bg-zinc-700 border border-zinc-700 cursor-pointer transition">
              <Upload className="w-3.5 h-3.5" />
              <span>{importing ? 'Restoring...' : 'Upload Gym Backup (JSON)'}</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportGymBackup}
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
