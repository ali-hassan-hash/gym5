import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Copy,
  Check,
  X,
  Eye,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react';
import type { GymAccount, AccountStatus, LicenseType, SystemSettings } from '../../types';
import {
  getAllGyms,
  saveGym,
  updateGym,
  deleteGym,
  getSystemSettings,
} from '../../db';
import {
  hashPassword,
  generateStrongPassword,
  generateUniqueId,
} from '../../utils/crypto';
import { formatDate, getTodayDateString, addMonthsToDate } from '../../utils/date';

interface GymsManagementProps {
  initialOpenAdd?: boolean;
}

export const GymsManagement: React.FC<GymsManagementProps> = ({ initialOpenAdd = false }) => {
  const [gyms, setGyms] = useState<GymAccount[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(initialOpenAdd);
  const [editingGym, setEditingGym] = useState<GymAccount | null>(null);
  const [credentialsModal, setCredentialsModal] = useState<{
    gymName: string;
    username: string;
    password: string;
    gymId: string;
  } | null>(null);
  const [passwordResetModal, setPasswordResetModal] = useState<GymAccount | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [deleteConfirmGym, setDeleteConfirmGym] = useState<GymAccount | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    gymName: '',
    ownerName: '',
    ownerEmail: '',
    ownerMobile: '',
    gymAddress: '',
    username: '',
    password: '',
    licenseStartDate: getTodayDateString(),
    licenseExpiryDate: addMonthsToDate(getTodayDateString(), 12),
    accountStatus: 'active' as AccountStatus,
    internalNotes: '',
    // Pricing
    oneTimePrice: 25000,
    setupCharges: 5000,
    discount: 0,
    negotiatedPrice: 30000,
    paymentReceived: 30000,
    remainingPayment: 0,
    purchaseDate: getTodayDateString(),
    licenseType: 'Annual' as LicenseType,
  });

  const loadGyms = async () => {
    const list = await getAllGyms();
    const sys = await getSystemSettings();
    setGyms(list);
    setSettings(sys);
  };

  useEffect(() => {
    loadGyms();
  }, []);

  const currency = settings?.currencySymbol || 'Rs.';

  const handleOpenAdd = () => {
    const defaultPass = generateStrongPassword(10);
    setFormData({
      gymName: '',
      ownerName: '',
      ownerEmail: '',
      ownerMobile: '',
      gymAddress: '',
      username: '',
      password: defaultPass,
      licenseStartDate: getTodayDateString(),
      licenseExpiryDate: addMonthsToDate(getTodayDateString(), 12),
      accountStatus: 'active',
      internalNotes: '',
      oneTimePrice: 25000,
      setupCharges: 5000,
      discount: 0,
      negotiatedPrice: 30000,
      paymentReceived: 30000,
      remainingPayment: 0,
      purchaseDate: getTodayDateString(),
      licenseType: 'Annual',
    });
    setEditingGym(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (gym: GymAccount) => {
    setEditingGym(gym);
    setFormData({
      gymName: gym.gymName,
      ownerName: gym.ownerName,
      ownerEmail: gym.ownerEmail,
      ownerMobile: gym.ownerMobile,
      gymAddress: gym.gymAddress,
      username: gym.username,
      password: '', // blank on edit unless changing
      licenseStartDate: gym.licenseStartDate,
      licenseExpiryDate: gym.licenseExpiryDate,
      accountStatus: gym.accountStatus,
      internalNotes: gym.internalNotes || '',
      oneTimePrice: gym.pricing?.oneTimePrice || 0,
      setupCharges: gym.pricing?.setupCharges || 0,
      discount: gym.pricing?.discount || 0,
      negotiatedPrice: gym.pricing?.negotiatedPrice || 0,
      paymentReceived: gym.pricing?.paymentReceived || 0,
      remainingPayment: gym.pricing?.remainingPayment || 0,
      purchaseDate: gym.pricing?.purchaseDate || gym.licenseStartDate,
      licenseType: gym.pricing?.licenseType || 'Annual',
    });
    setIsAddModalOpen(true);
  };

  // Auto-calculate negotiated price and remaining payment
  const handlePriceChange = (
    field: 'oneTimePrice' | 'setupCharges' | 'discount' | 'paymentReceived',
    val: number
  ) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: val };
      const computedNegotiated = Math.max(0, updated.oneTimePrice + updated.setupCharges - updated.discount);
      updated.negotiatedPrice = computedNegotiated;
      updated.remainingPayment = Math.max(0, computedNegotiated - updated.paymentReceived);
      return updated;
    });
  };

  const handleSaveGym = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingGym) {
      // Update existing gym
      const updated: GymAccount = {
        ...editingGym,
        gymName: formData.gymName.trim(),
        ownerName: formData.ownerName.trim(),
        ownerEmail: formData.ownerEmail.trim(),
        ownerMobile: formData.ownerMobile.trim(),
        gymAddress: formData.gymAddress.trim(),
        username: formData.username.trim().toLowerCase(),
        licenseStartDate: formData.licenseStartDate,
        licenseExpiryDate: formData.licenseExpiryDate,
        accountStatus: formData.accountStatus,
        internalNotes: formData.internalNotes.trim(),
        pricing: {
          oneTimePrice: Number(formData.oneTimePrice),
          setupCharges: Number(formData.setupCharges),
          discount: Number(formData.discount),
          negotiatedPrice: Number(formData.negotiatedPrice),
          paymentReceived: Number(formData.paymentReceived),
          remainingPayment: Number(formData.remainingPayment),
          purchaseDate: formData.purchaseDate,
          licenseType: formData.licenseType,
        },
      };

      if (formData.password && formData.password.trim().length > 0) {
        updated.passwordHash = await hashPassword(formData.password.trim());
        updated.temporaryPassword = formData.password.trim();
      }

      await updateGym(updated);
      setIsAddModalOpen(false);
      setEditingGym(null);
      await loadGyms();
    } else {
      // Create new gym
      const gymId = generateUniqueId('GYM');
      const pass = formData.password.trim() || generateStrongPassword(10);
      const passHash = await hashPassword(pass);

      const newGym: GymAccount = {
        id: gymId,
        gymName: formData.gymName.trim(),
        ownerName: formData.ownerName.trim(),
        ownerEmail: formData.ownerEmail.trim(),
        ownerMobile: formData.ownerMobile.trim(),
        gymAddress: formData.gymAddress.trim(),
        username: formData.username.trim().toLowerCase(),
        passwordHash: passHash,
        temporaryPassword: pass,
        licenseStartDate: formData.licenseStartDate,
        licenseExpiryDate: formData.licenseExpiryDate,
        accountStatus: formData.accountStatus,
        internalNotes: formData.internalNotes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pricing: {
          oneTimePrice: Number(formData.oneTimePrice),
          setupCharges: Number(formData.setupCharges),
          discount: Number(formData.discount),
          negotiatedPrice: Number(formData.negotiatedPrice),
          paymentReceived: Number(formData.paymentReceived),
          remainingPayment: Number(formData.remainingPayment),
          purchaseDate: formData.purchaseDate,
          licenseType: formData.licenseType,
        },
      };

      await saveGym(newGym);
      setIsAddModalOpen(false);
      await loadGyms();

      // Show credentials popup
      setCredentialsModal({
        gymName: newGym.gymName,
        username: newGym.username,
        password: pass,
        gymId: newGym.id,
      });
    }
  };

  const handleStatusChange = async (gym: GymAccount, newStatus: AccountStatus) => {
    const updated = { ...gym, accountStatus: newStatus };
    await updateGym(updated);
    await loadGyms();
  };

  const handleDeleteGym = async () => {
    if (deleteConfirmGym) {
      await deleteGym(deleteConfirmGym.id);
      setDeleteConfirmGym(null);
      await loadGyms();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetModal || !newPasswordValue.trim()) return;

    const hash = await hashPassword(newPasswordValue.trim());
    const updated = {
      ...passwordResetModal,
      passwordHash: hash,
      temporaryPassword: newPasswordValue.trim(),
    };
    await updateGym(updated);
    await loadGyms();
    setPasswordResetModal(null);
    setNewPasswordValue('');
    alert(`Password reset successfully for ${updated.gymName}.`);
  };

  const filteredGyms = gyms.filter((g) => {
    const matchesSearch =
      g.gymName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.ownerMobile.includes(searchQuery) ||
      g.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.accountStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Gyms & Licensing Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Register new gyms, issue owner credentials, manage licenses, and control access permissions.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Gym</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by gym name, owner, phone or Gym ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl shrink-0">
          {(['all', 'active', 'inactive', 'suspended'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${
                statusFilter === st
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Gyms Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-sm">
        {filteredGyms.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Building2 className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No Gyms Found</p>
            <p className="text-xs text-zinc-500 mt-1">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Click "Register New Gym" to add your first gym.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Gym ID & Name</th>
                  <th className="px-5 py-3.5 font-medium">Owner Credentials</th>
                  <th className="px-5 py-3.5 font-medium">Contact</th>
                  <th className="px-5 py-3.5 font-medium">License Period</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredGyms.map((gym) => (
                  <tr key={gym.id} className="hover:bg-zinc-850/50 transition">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white text-sm">{gym.gymName}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>{gym.id}</span>
                        <span>&bull;</span>
                        <span>{gym.pricing?.licenseType || 'Annual'}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 truncate max-w-xs">{gym.gymAddress}</div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-zinc-200">{gym.ownerName}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        User: <span className="text-zinc-300">{gym.username}</span>
                      </div>
                      <button
                        onClick={() => {
                          setCredentialsModal({
                            gymName: gym.gymName,
                            username: gym.username,
                            password: gym.temporaryPassword || 'Saved Hash (Reset if forgotten)',
                            gymId: gym.id,
                          });
                        }}
                        className="mt-1 text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition"
                      >
                        <KeyRound className="w-3 h-3" />
                        <span>View Credentials</span>
                      </button>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-zinc-300">{gym.ownerMobile}</div>
                      <div className="text-[11px] text-zinc-500">{gym.ownerEmail}</div>
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px]">
                      <div className="text-zinc-300">
                        {formatDate(gym.licenseStartDate)} &rarr; {formatDate(gym.licenseExpiryDate)}
                      </div>
                      <div className="text-zinc-500 mt-0.5">
                        Registered: {formatDate(gym.createdAt?.split('T')[0] || '')}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        {gym.accountStatus === 'active' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active
                          </span>
                        )}
                        {gym.accountStatus === 'inactive' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Inactive
                          </span>
                        )}
                        {gym.accountStatus === 'suspended' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                            Suspended
                          </span>
                        )}

                        {/* Quick status switch dropdown/buttons */}
                        <div className="flex items-center gap-1 mt-1">
                          {gym.accountStatus !== 'active' && (
                            <button
                              onClick={() => handleStatusChange(gym, 'active')}
                              title="Activate Gym"
                              className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-emerald-400 hover:bg-zinc-700"
                            >
                              Activate
                            </button>
                          )}
                          {gym.accountStatus !== 'suspended' && (
                            <button
                              onClick={() => handleStatusChange(gym, 'suspended')}
                              title="Suspend Gym"
                              className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-red-400 hover:bg-zinc-700"
                            >
                              Suspend
                            </button>
                          )}
                          {gym.accountStatus !== 'inactive' && (
                            <button
                              onClick={() => handleStatusChange(gym, 'inactive')}
                              title="Deactivate Gym"
                              className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 hover:bg-zinc-700"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setPasswordResetModal(gym);
                            setNewPasswordValue(generateStrongPassword(10));
                          }}
                          title="Reset Password"
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(gym)}
                          title="Edit Gym Details"
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmGym(gym)}
                          title="Delete Gym"
                          className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT GYM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold text-white">
                  {editingGym ? `Edit Gym — ${editingGym.gymName}` : 'Register New Gym Client'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveGym} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
              {/* Gym Basic Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  1. Gym Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Gym Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.gymName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData((prev) => ({
                          ...prev,
                          gymName: val,
                          // Auto generate username if creating new
                          username: !editingGym && !prev.username ? val.toLowerCase().replace(/[^a-z0-9]/g, '') : prev.username,
                        }));
                      }}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      placeholder="e.g. Iron Forge Fitness"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Gym Physical Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.gymAddress}
                      onChange={(e) => setFormData({ ...formData, gymAddress: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      placeholder="e.g. 42 Main Boulevard, Block B"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Information */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  2. Owner Information & Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Owner Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      placeholder="e.g. Malik Usman"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Mobile / WhatsApp *</label>
                    <input
                      type="text"
                      required
                      value={formData.ownerMobile}
                      onChange={(e) => setFormData({ ...formData, ownerMobile: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      placeholder="e.g. 03001234567"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Owner Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                      placeholder="e.g. owner@gym.com"
                    />
                  </div>
                </div>
              </div>

              {/* Owner Login Credentials */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  3. Owner Login Account
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Assigned Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                      placeholder="e.g. ironforge"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-zinc-300 font-medium">
                        {editingGym ? 'New Password (leave blank to keep current)' : 'Temporary Password *'}
                      </label>
                      {!editingGym && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, password: generateStrongPassword(10) })}
                          className="text-[10px] text-zinc-400 hover:text-white underline"
                        >
                          Generate
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required={!editingGym}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                      placeholder={editingGym ? 'Keep current password' : 'Strong password'}
                    />
                  </div>
                </div>
              </div>

              {/* License & Status */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  4. License & Permissions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">License Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.licenseStartDate}
                      onChange={(e) => setFormData({ ...formData, licenseStartDate: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">License Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={formData.licenseExpiryDate}
                      onChange={(e) => setFormData({ ...formData, licenseExpiryDate: e.target.value })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Account Status</label>
                    <select
                      value={formData.accountStatus}
                      onChange={(e) => setFormData({ ...formData, accountStatus: e.target.value as AccountStatus })}
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white focus:outline-none"
                    >
                      <option value="active">Active (Access Allowed)</option>
                      <option value="inactive">Inactive (License Expired)</option>
                      <option value="suspended">Suspended (Access Denied)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing & Commercial Terms */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  5. Commercial Terms & Pricing ({currency})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <div>
                    <label className="block text-zinc-400 mb-1">One-Time Price</label>
                    <input
                      type="number"
                      value={formData.oneTimePrice}
                      onChange={(e) => handlePriceChange('oneTimePrice', Number(e.target.value))}
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Setup Charges</label>
                    <input
                      type="number"
                      value={formData.setupCharges}
                      onChange={(e) => handlePriceChange('setupCharges', Number(e.target.value))}
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Discount</label>
                    <input
                      type="number"
                      value={formData.discount}
                      onChange={(e) => handlePriceChange('discount', Number(e.target.value))}
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-emerald-400 font-semibold mb-1">Final Price</label>
                    <input
                      type="number"
                      value={formData.negotiatedPrice}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setFormData((prev) => ({
                          ...prev,
                          negotiatedPrice: val,
                          remainingPayment: Math.max(0, val - prev.paymentReceived),
                        }));
                      }}
                      className="w-full rounded-lg bg-zinc-900 border border-emerald-500/50 px-3 py-1.5 text-xs text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Payment Received</label>
                    <input
                      type="number"
                      value={formData.paymentReceived}
                      onChange={(e) => handlePriceChange('paymentReceived', Number(e.target.value))}
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-amber-400 font-semibold mb-1">Remaining Dues</label>
                    <div className="px-3 py-2 text-xs font-mono font-bold text-amber-400 bg-zinc-900 rounded-lg border border-zinc-800">
                      {currency} {formData.remainingPayment.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">License Model</label>
                    <select
                      value={formData.licenseType}
                      onChange={(e) => setFormData({ ...formData, licenseType: e.target.value as LicenseType })}
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-white"
                    >
                      <option value="Lifetime">Lifetime</option>
                      <option value="Annual">Annual</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-400 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Internal Notes */}
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Internal Notes (Admin Only)</label>
                <textarea
                  rows={2}
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                  placeholder="e.g. Referred by Lahore fitness association. Paid 50% via bank transfer."
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition shadow-md"
                >
                  {editingGym ? 'Save Gym Updates' : 'Register Gym & Create Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREDENTIALS DISPLAY MODAL (Shown after gym creation or when requested) */}
      {credentialsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6 text-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Owner Credentials</h3>
              </div>
              <button
                onClick={() => setCredentialsModal(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Provide these credentials to the gym owner of <strong>{credentialsModal.gymName}</strong>.
            </p>

            <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-500">Gym ID:</span>
                <span className="text-white font-bold">{credentialsModal.gymId}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/80 pb-2">
                <span className="text-zinc-500">Username:</span>
                <span className="text-white font-bold">{credentialsModal.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Password:</span>
                <span className="text-amber-300 font-bold">{credentialsModal.password}</span>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  const text = `G5MEKA Gym Portal Credentials\nGym: ${credentialsModal.gymName}\nGym ID: ${credentialsModal.gymId}\nUsername: ${credentialsModal.username}\nPassword: ${credentialsModal.password}\nLogin URL: ${window.location.origin}`;
                  navigator.clipboard.writeText(text);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Credentials'}</span>
              </button>
              <button
                onClick={() => setCredentialsModal(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {passwordResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6 text-zinc-100">
            <h3 className="text-base font-bold text-white mb-2">
              Reset Password for {passwordResetModal.gymName}
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Enter a new password for user <strong>{passwordResetModal.username}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewPasswordValue(generateStrongPassword(10))}
                  className="px-3 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:text-white"
                >
                  Generate
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200"
                >
                  Update Password
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPasswordResetModal(null)}
                className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 pt-2"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmGym && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-red-900/40 shadow-2xl p-6 text-zinc-100">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Delete Gym Permanently?</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Are you sure you want to permanently delete <strong>{deleteConfirmGym.gymName}</strong> (ID: {deleteConfirmGym.id})?
              This will remove all member records, fee logs, and credentials for this gym from local storage. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmGym(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGym}
                className="px-4 py-2 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-500 transition shadow-md"
              >
                Yes, Delete Gym
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
