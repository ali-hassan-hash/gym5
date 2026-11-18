import React, { useState, useEffect } from 'react';
import { DollarSign, Save, Check, Building2, TrendingUp, CreditCard, RefreshCw } from 'lucide-react';
import type { GymAccount, LicenseType, SystemSettings } from '../../types';
import { getAllGyms, updateGym, getSystemSettings, updateSystemSettings } from '../../db';
import { formatDate } from '../../utils/date';

export const PricingSales: React.FC = () => {
  const [gyms, setGyms] = useState<GymAccount[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [editingGymId, setEditingGymId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Editable pricing row buffer
  const [editBuffer, setEditBuffer] = useState<{
    oneTimePrice: number;
    setupCharges: number;
    discount: number;
    negotiatedPrice: number;
    paymentReceived: number;
    remainingPayment: number;
    licenseType: LicenseType;
    purchaseDate: string;
    notes: string;
  }>({
    oneTimePrice: 0,
    setupCharges: 0,
    discount: 0,
    negotiatedPrice: 0,
    paymentReceived: 0,
    remainingPayment: 0,
    licenseType: 'Annual',
    purchaseDate: '',
    notes: '',
  });

  const loadData = async () => {
    const list = await getAllGyms();
    const sys = await getSystemSettings();
    setGyms(list);
    setSettings(sys);
  };

  useEffect(() => {
    loadData();
  }, []);

  const currency = settings?.currencySymbol || 'Rs.';

  const handleStartEdit = (gym: GymAccount) => {
    setEditingGymId(gym.id);
    setEditBuffer({
      oneTimePrice: gym.pricing?.oneTimePrice || 0,
      setupCharges: gym.pricing?.setupCharges || 0,
      discount: gym.pricing?.discount || 0,
      negotiatedPrice: gym.pricing?.negotiatedPrice || 0,
      paymentReceived: gym.pricing?.paymentReceived || 0,
      remainingPayment: gym.pricing?.remainingPayment || 0,
      licenseType: gym.pricing?.licenseType || 'Annual',
      purchaseDate: gym.pricing?.purchaseDate || gym.licenseStartDate,
      notes: gym.pricing?.notes || '',
    });
  };

  const handlePriceFieldChange = (
    field: 'oneTimePrice' | 'setupCharges' | 'discount' | 'paymentReceived',
    val: number
  ) => {
    setEditBuffer((prev) => {
      const updated = { ...prev, [field]: val };
      const autoNegotiated = Math.max(0, updated.oneTimePrice + updated.setupCharges - updated.discount);
      updated.negotiatedPrice = autoNegotiated;
      updated.remainingPayment = Math.max(0, autoNegotiated - updated.paymentReceived);
      return updated;
    });
  };

  const handleSavePrice = async (gym: GymAccount) => {
    const updated: GymAccount = {
      ...gym,
      pricing: {
        oneTimePrice: Number(editBuffer.oneTimePrice),
        setupCharges: Number(editBuffer.setupCharges),
        discount: Number(editBuffer.discount),
        negotiatedPrice: Number(editBuffer.negotiatedPrice),
        paymentReceived: Number(editBuffer.paymentReceived),
        remainingPayment: Number(editBuffer.remainingPayment),
        licenseType: editBuffer.licenseType,
        purchaseDate: editBuffer.purchaseDate,
        notes: editBuffer.notes,
      },
    };

    await updateGym(updated);
    setEditingGymId(null);
    setSaveSuccess(gym.id);
    setTimeout(() => setSaveSuccess(null), 2500);
    await loadData();
  };

  // Calculations
  const totalBilled = gyms.reduce((acc, g) => acc + (g.pricing?.negotiatedPrice || 0), 0);
  const totalCollected = gyms.reduce((acc, g) => acc + (g.pricing?.paymentReceived || 0), 0);
  const totalPending = gyms.reduce((acc, g) => acc + (g.pricing?.remainingPayment || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Pricing & Sales Management
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure software license prices, setup fees, discounts, and payment receivables per gym.
        </p>
      </div>

      {/* Aggregate Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Total Negotiated Contracts</span>
            <DollarSign className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {currency} {totalBilled.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-500">Gross contract volume</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Total Cash Received</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {currency} {totalCollected.toLocaleString()}
          </div>
          <span className="text-[10px] text-emerald-500/80">Collected revenue</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Total Outstanding Dues</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {currency} {totalPending.toLocaleString()}
          </div>
          <span className="text-[10px] text-amber-500/80">Awaiting client payment</span>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-white">Client Commercial Terms</h3>
            <p className="text-xs text-zinc-400">Click any row's edit button to modify negotiated pricing.</p>
          </div>
          <div className="text-xs text-zinc-400 font-mono bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
            Active Currency: <span className="text-white font-bold">{settings?.currency} ({currency})</span>
          </div>
        </div>

        {gyms.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Building2 className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No Gym Accounts Found</p>
            <p className="text-xs text-zinc-500 mt-1">
              Add gyms in the Gyms & Licenses section to configure their commercial pricing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Gym Client</th>
                  <th className="px-4 py-3.5 font-medium">Model</th>
                  <th className="px-4 py-3.5 font-medium">Base + Setup</th>
                  <th className="px-4 py-3.5 font-medium">Discount</th>
                  <th className="px-4 py-3.5 font-medium">Final Price</th>
                  <th className="px-4 py-3.5 font-medium">Paid</th>
                  <th className="px-4 py-3.5 font-medium">Remaining</th>
                  <th className="px-4 py-3.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {gyms.map((gym) => {
                  const isEditing = editingGymId === gym.id;
                  const p = gym.pricing || {
                    oneTimePrice: 0,
                    setupCharges: 0,
                    discount: 0,
                    negotiatedPrice: 0,
                    paymentReceived: 0,
                    remainingPayment: 0,
                    licenseType: 'Annual',
                    purchaseDate: gym.licenseStartDate,
                  };

                  if (isEditing) {
                    return (
                      <tr key={gym.id} className="bg-zinc-850/80">
                        <td className="px-5 py-3">
                          <span className="font-bold text-white block">{gym.gymName}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">{gym.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editBuffer.licenseType}
                            onChange={(e) => setEditBuffer({ ...editBuffer, licenseType: e.target.value as LicenseType })}
                            className="rounded bg-zinc-950 border border-zinc-700 px-2 py-1 text-xs text-white"
                          >
                            <option value="Lifetime">Lifetime</option>
                            <option value="Annual">Annual</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Custom">Custom</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 items-center">
                            <input
                              type="number"
                              title="One-Time Base Price"
                              value={editBuffer.oneTimePrice}
                              onChange={(e) => handlePriceFieldChange('oneTimePrice', Number(e.target.value))}
                              className="w-16 rounded bg-zinc-950 border border-zinc-700 px-1.5 py-1 text-xs text-white"
                            />
                            <span>+</span>
                            <input
                              type="number"
                              title="Setup Charges"
                              value={editBuffer.setupCharges}
                              onChange={(e) => handlePriceFieldChange('setupCharges', Number(e.target.value))}
                              className="w-16 rounded bg-zinc-950 border border-zinc-700 px-1.5 py-1 text-xs text-white"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editBuffer.discount}
                            onChange={(e) => handlePriceFieldChange('discount', Number(e.target.value))}
                            className="w-16 rounded bg-zinc-950 border border-zinc-700 px-1.5 py-1 text-xs text-white"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-emerald-400">
                            {currency} {editBuffer.negotiatedPrice.toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editBuffer.paymentReceived}
                            onChange={(e) => handlePriceFieldChange('paymentReceived', Number(e.target.value))}
                            className="w-20 rounded bg-zinc-950 border border-zinc-700 px-1.5 py-1 text-xs text-white font-mono"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-400">
                          {currency} {editBuffer.remainingPayment.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSavePrice(gym)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200"
                            >
                              <Save className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                            <button
                              onClick={() => setEditingGymId(null)}
                              className="px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={gym.id} className="hover:bg-zinc-850/40 transition">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{gym.gymName}</div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          {gym.id} &bull; Owner: {gym.ownerName}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 text-[11px]">
                          {p.licenseType || 'Annual'}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono text-zinc-300">
                        {currency} {((p.oneTimePrice || 0) + (p.setupCharges || 0)).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 font-mono text-zinc-400">
                        {p.discount ? `- ${currency} ${p.discount.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-white">
                        {currency} {(p.negotiatedPrice || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 font-mono font-semibold text-emerald-400">
                        {currency} {(p.paymentReceived || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4 font-mono font-semibold text-amber-400">
                        {(p.remainingPayment || 0) > 0
                          ? `${currency} ${(p.remainingPayment || 0).toLocaleString()}`
                          : <span className="text-zinc-500 font-normal">Fully Paid</span>}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {saveSuccess === gym.id ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                            <Check className="w-3.5 h-3.5" />
                            <span>Saved</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStartEdit(gym)}
                            className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition text-xs font-medium"
                          >
                            Edit Pricing
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
