import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Eye,
  Edit2,
  Trash2,
  MessageSquare,
  CreditCard,
  X,
  Phone,
  Calendar,
  DollarSign,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import type { GymMember, PaymentRecord, GymSettings } from '../../types';
import {
  getGymMembers,
  getGymSettings,
  getMemberPayments,
  saveGymMember,
  deleteGymMember,
  recordGymPayment,
} from '../../db';
import {
  getRenewalStatus,
  formatDate,
  createWhatsAppUrl,
  buildRenewalWhatsAppMessage,
  addMonthsToDate,
  getTodayDateString,
} from '../../utils/date';
import { generateReceiptNumber } from '../../utils/crypto';
import { ReceiptModal } from '../../components/ReceiptModal';

interface MembersListProps {
  gymId: string;
  onNavigateAddMember: () => void;
  selectedMemberId?: string;
}

export const MembersList: React.FC<MembersListProps> = ({
  gymId,
  onNavigateAddMember,
  selectedMemberId,
}) => {
  const [members, setMembers] = useState<GymMember[]>([]);
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'pending'>('all');
  const [sortField, setSortField] = useState<'joiningDate' | 'renewalDate' | 'name'>('renewalDate');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals
  const [viewingMember, setViewingMember] = useState<GymMember | null>(null);
  const [editingMember, setEditingMember] = useState<GymMember | null>(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<GymMember | null>(null);
  const [quickPayMember, setQuickPayMember] = useState<GymMember | null>(null);
  const [memberPayments, setMemberPayments] = useState<PaymentRecord[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  // Quick payment form
  const [quickPayAmount, setQuickPayAmount] = useState<number>(0);
  const [quickPayMonths, setQuickPayMonths] = useState<number>(1);
  const [quickPayMethod, setQuickPayMethod] = useState<'Cash' | 'Bank Transfer' | 'EasyPaisa/JazzCash' | 'Other'>('Cash');
  const [quickPayNotes, setQuickPayNotes] = useState('');

  const loadData = async () => {
    const mems = await getGymMembers(gymId);
    const stg = await getGymSettings(gymId);
    setMembers(mems);
    setSettings(stg);

    if (selectedMemberId) {
      const found = mems.find((m) => m.id === selectedMemberId || m.memberId === selectedMemberId);
      if (found) {
        handleOpenView(found);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [gymId]);

  const currency = settings?.currencySymbol || 'Rs.';

  const handleOpenView = async (member: GymMember) => {
    setViewingMember(member);
    const payments = await getMemberPayments(gymId, member.id);
    setMemberPayments(payments);
  };

  const handleOpenQuickPay = (member: GymMember) => {
    setQuickPayMember(member);
    setQuickPayAmount(member.monthlyFee);
    setQuickPayMonths(1);
    setQuickPayMethod('Cash');
    setQuickPayNotes('');
  };

  const handleSaveQuickPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayMember) return;

    const currentExpiry = quickPayMember.nextRenewalDate;
    // Calculate new renewal date: if overdue, calculate from today or from previous expiry?
    // In local gyms: if renewing, advance by X months from current expiry date or today if far overdue
    const daysRem = getRenewalStatus(currentExpiry).daysRemaining;
    const baseDate = daysRem < 0 ? getTodayDateString() : currentExpiry;
    const newRenewalDate = addMonthsToDate(baseDate, quickPayMonths);

    const fullExpected = quickPayMember.monthlyFee * quickPayMonths;
    const remainingBal = Math.max(0, fullExpected - quickPayAmount);

    const paymentRecord: PaymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      receiptNo: generateReceiptNumber(),
      gymId,
      memberId: quickPayMember.id,
      memberName: quickPayMember.fullName,
      amount: Number(quickPayAmount),
      paymentDate: getTodayDateString(),
      method: quickPayMethod,
      monthCovered: `${formatDate(baseDate)} - ${formatDate(newRenewalDate)}`,
      nextRenewalDateCalculated: newRenewalDate,
      previousBalance: fullExpected,
      remainingBalance: remainingBal,
      notes: quickPayNotes.trim() || `Fee renewal for ${quickPayMonths} month(s)`,
      createdAt: new Date().toISOString(),
    };

    const updatedMember: GymMember = {
      ...quickPayMember,
      nextRenewalDate: newRenewalDate,
      paymentStatus: remainingBal === 0 ? 'Paid' : 'Pending',
      balanceDue: remainingBal,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    await recordGymPayment(paymentRecord, updatedMember);
    setQuickPayMember(null);
    setSelectedReceipt(paymentRecord);
    await loadData();
    if (viewingMember && viewingMember.id === quickPayMember.id) {
      handleOpenView(updatedMember);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    await saveGymMember({
      ...editingMember,
      updatedAt: new Date().toISOString(),
    });
    setEditingMember(null);
    await loadData();
  };

  const handleDeleteMember = async () => {
    if (deleteConfirmMember) {
      await deleteGymMember(deleteConfirmMember.id, gymId);
      setDeleteConfirmMember(null);
      if (viewingMember?.id === deleteConfirmMember.id) {
        setViewingMember(null);
      }
      await loadData();
    }
  };

  // Filter & Search Logic
  const filteredMembers = members
    .filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        m.fullName.toLowerCase().includes(q) ||
        m.mobileNumber.includes(q) ||
        m.memberId.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      const statusInfo = getRenewalStatus(m.nextRenewalDate);
      if (statusFilter === 'active') return statusInfo.status !== 'overdue';
      if (statusFilter === 'expired') return statusInfo.status === 'overdue';
      if (statusFilter === 'pending') return m.balanceDue > 0 || statusInfo.status === 'overdue';

      return true;
    })
    .sort((a, b) => {
      let result = 0;
      if (sortField === 'joiningDate') {
        result = a.joiningDate.localeCompare(b.joiningDate);
      } else if (sortField === 'renewalDate') {
        result = a.nextRenewalDate.localeCompare(b.nextRenewalDate);
      } else if (sortField === 'name') {
        result = a.fullName.localeCompare(b.fullName);
      }
      return sortAsc ? result : -result;
    });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Gym Members
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Complete member register with fee statuses, renewal deadlines, and quick WhatsApp alerts.
          </p>
        </div>

        <button
          onClick={onNavigateAddMember}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Member</span>
        </button>
      </div>

      {/* Filter, Search & Sort Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by member name, mobile number or Member ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl shrink-0 overflow-x-auto">
          {(
            [
              { id: 'all', label: `All (${members.length})` },
              { id: 'active', label: 'Active' },
              { id: 'expired', label: 'Expired' },
              { id: 'pending', label: 'Pending Fee' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setStatusFilter(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                statusFilter === item.id
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl shrink-0">
          <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="bg-transparent text-xs text-zinc-300 focus:outline-none"
          >
            <option value="renewalDate">Sort: Renewal Date</option>
            <option value="joiningDate">Sort: Joining Date</option>
            <option value="name">Sort: Full Name</option>
          </select>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="text-[11px] font-mono text-zinc-400 hover:text-white px-1"
          >
            {sortAsc ? 'ASC' : 'DESC'}
          </button>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-sm">
        {filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Users className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No Members Found</p>
            <p className="text-xs text-zinc-500 mt-1">
              {searchQuery ? 'Try adjusting your search criteria.' : 'Click "Add New Member" to register your first gym member.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Member ID</th>
                  <th className="px-5 py-3.5 font-medium">Member Name</th>
                  <th className="px-5 py-3.5 font-medium">Mobile Number</th>
                  <th className="px-5 py-3.5 font-medium">Monthly Fee</th>
                  <th className="px-5 py-3.5 font-medium">Joining Date</th>
                  <th className="px-5 py-3.5 font-medium">Next Renewal</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredMembers.map((member) => {
                  const statusInfo = getRenewalStatus(member.nextRenewalDate);
                  const whatsappMessage = buildRenewalWhatsAppMessage({
                    template: settings?.whatsappMessageTemplate,
                    memberName: member.fullName,
                    gymName: settings?.gymName || 'G5MEKA Gym',
                    daysRemaining: statusInfo.daysRemaining,
                    renewalDate: member.nextRenewalDate,
                    monthlyFee: member.monthlyFee,
                    currencySymbol: currency,
                  });
                  const whatsappUrl = createWhatsAppUrl(
                    member.whatsappNumber || member.mobileNumber,
                    whatsappMessage
                  );

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-zinc-850/50 transition group"
                    >
                      <td className="px-5 py-3.5 font-mono text-zinc-400 font-medium">
                        {member.memberId}
                      </td>

                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => handleOpenView(member)}
                          className="font-semibold text-white hover:underline text-left"
                        >
                          {member.fullName}
                        </button>
                        {member.gender && (
                          <span className="text-[10px] text-zinc-500 block">
                            {member.gender} {member.age ? `• ${member.age} yrs` : ''}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <span>{member.mobileNumber}</span>
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chat on WhatsApp"
                            className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-zinc-200">
                        <div>{currency} {member.monthlyFee.toLocaleString()}</div>
                        {member.balanceDue > 0 && (
                          <span className="text-[10px] text-red-400 font-bold block">
                            Due: {currency} {member.balanceDue.toLocaleString()}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-zinc-400">
                        {formatDate(member.joiningDate)}
                      </td>

                      <td className="px-5 py-3.5 font-mono">
                        <div className="text-zinc-200 font-medium">
                          {formatDate(member.nextRenewalDate)}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Pay Fee Button */}
                          <button
                            onClick={() => handleOpenQuickPay(member)}
                            title="Record Payment / Renew"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition text-xs font-medium"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Renew</span>
                          </button>

                          <button
                            onClick={() => handleOpenView(member)}
                            title="View Profile & Payments"
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setEditingMember(member)}
                            title="Edit Member"
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirmMember(member)}
                            title="Delete Member"
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-950/20 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* VIEW MEMBER PROFILE MODAL */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white text-sm">
                  {viewingMember.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{viewingMember.fullName}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                    <span>{viewingMember.memberId}</span>
                    <span>&bull;</span>
                    <span>Joined {formatDate(viewingMember.joiningDate)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingMember(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
              {/* Member overview cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Monthly Fee</span>
                  <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                    {currency} {viewingMember.monthlyFee.toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Next Renewal</span>
                  <span className="text-sm font-bold text-amber-300 font-mono mt-0.5 block">
                    {formatDate(viewingMember.nextRenewalDate)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Renewal Status</span>
                  <span className="text-xs font-semibold text-zinc-200 mt-1 block">
                    {getRenewalStatus(viewingMember.nextRenewalDate).label}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Balance Due</span>
                  <span
                    className={`text-sm font-bold font-mono mt-0.5 block ${
                      viewingMember.balanceDue > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {currency} {viewingMember.balanceDue.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <span className="text-zinc-500 block">Mobile:</span>
                    <span className="text-zinc-200 font-mono">{viewingMember.mobileNumber}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">WhatsApp:</span>
                    <span className="text-zinc-200 font-mono">{viewingMember.whatsappNumber || viewingMember.mobileNumber}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block">Address:</span>
                    <span className="text-zinc-200">{viewingMember.homeAddress || 'Not specified'}</span>
                  </div>
                </div>
                {viewingMember.notes && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <span className="text-zinc-500 block">Notes:</span>
                    <span className="text-zinc-300 italic">{viewingMember.notes}</span>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Payment History ({memberPayments.length})
                  </h4>
                  <button
                    onClick={() => {
                      setViewingMember(null);
                      handleOpenQuickPay(viewingMember);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Record New Payment</span>
                  </button>
                </div>

                {memberPayments.length === 0 ? (
                  <div className="p-6 text-center text-zinc-500 bg-zinc-950 rounded-xl border border-zinc-800">
                    No payment history recorded for this member.
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="px-4 py-2 font-medium">Receipt No</th>
                          <th className="px-4 py-2 font-medium">Payment Date</th>
                          <th className="px-4 py-2 font-medium">Amount</th>
                          <th className="px-4 py-2 font-medium">Method</th>
                          <th className="px-4 py-2 font-medium text-right">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {memberPayments.map((p) => (
                          <tr key={p.id} className="hover:bg-zinc-850">
                            <td className="px-4 py-2.5 font-mono text-zinc-400">{p.receiptNo}</td>
                            <td className="px-4 py-2.5 text-zinc-300">{formatDate(p.paymentDate)}</td>
                            <td className="px-4 py-2.5 font-mono font-bold text-emerald-400">
                              {currency} {p.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-zinc-400">{p.method}</td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                onClick={() => setSelectedReceipt(p)}
                                className="text-zinc-400 hover:text-white underline text-[11px]"
                              >
                                View / Print
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK RENEW / PAY MODAL */}
      {quickPayMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6 text-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Record Fee Payment</h3>
              </div>
              <button
                onClick={() => setQuickPayMember(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4">
              Renew membership for <strong>{quickPayMember.fullName}</strong> ({quickPayMember.memberId}).
            </p>

            <form onSubmit={handleSaveQuickPayment} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Duration (Months)</label>
                  <select
                    value={quickPayMonths}
                    onChange={(e) => {
                      const m = Number(e.target.value);
                      setQuickPayMonths(m);
                      setQuickPayAmount(quickPayMember.monthlyFee * m);
                    }}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
                  >
                    <option value={1}>1 Month</option>
                    <option value={2}>2 Months</option>
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months (1 Year)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Payment Method</label>
                  <select
                    value={quickPayMethod}
                    onChange={(e) => setQuickPayMethod(e.target.value as any)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="EasyPaisa/JazzCash">EasyPaisa / JazzCash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Amount Received ({currency}) *
                </label>
                <input
                  type="number"
                  required
                  value={quickPayAmount}
                  onChange={(e) => setQuickPayAmount(Number(e.target.value))}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-sm text-white font-mono"
                />
                <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
                  <span>Standard rate: {currency} {(quickPayMember.monthlyFee * quickPayMonths).toLocaleString()}</span>
                  {quickPayAmount < quickPayMember.monthlyFee * quickPayMonths && (
                    <span className="text-red-400 font-medium">
                      Partial (Balance: {currency} {((quickPayMember.monthlyFee * quickPayMonths) - quickPayAmount).toLocaleString()})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Notes / Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash at front desk"
                  value={quickPayNotes}
                  onChange={(e) => setQuickPayNotes(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white placeholder-zinc-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setQuickPayMember(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition shadow-md"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Confirm Payment & Print Receipt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6 text-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Edit Member Details</h3>
              <button
                onClick={() => setEditingMember(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editingMember.fullName}
                  onChange={(e) => setEditingMember({ ...editingMember, fullName: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={editingMember.mobileNumber}
                    onChange={(e) => setEditingMember({ ...editingMember, mobileNumber: e.target.value })}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">WhatsApp Number</label>
                  <input
                    type="text"
                    value={editingMember.whatsappNumber}
                    onChange={(e) => setEditingMember({ ...editingMember, whatsappNumber: e.target.value })}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Monthly Fee ({currency}) *</label>
                  <input
                    type="number"
                    required
                    value={editingMember.monthlyFee}
                    onChange={(e) => setEditingMember({ ...editingMember, monthlyFee: Number(e.target.value) })}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Next Renewal Date *</label>
                  <input
                    type="date"
                    required
                    value={editingMember.nextRenewalDate}
                    onChange={(e) => setEditingMember({ ...editingMember, nextRenewalDate: e.target.value })}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Home Address</label>
                <input
                  type="text"
                  value={editingMember.homeAddress || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, homeAddress: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Notes</label>
                <input
                  type="text"
                  value={editingMember.notes || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, notes: e.target.value })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-red-900/40 shadow-2xl p-6 text-zinc-100">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-white">Delete Member Record?</h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Are you sure you want to permanently delete member <strong>{deleteConfirmMember.fullName}</strong> ({deleteConfirmMember.memberId})?
              All associated payment logs for this member will also be deleted from local storage.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmMember(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMember}
                className="px-4 py-2 rounded-xl bg-red-600 text-xs font-semibold text-white hover:bg-red-500 transition shadow-md"
              >
                Yes, Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE RECEIPT MODAL */}
      {selectedReceipt && (
        <ReceiptModal
          payment={selectedReceipt}
          settings={settings}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
};
