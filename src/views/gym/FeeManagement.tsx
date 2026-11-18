import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Search,
  Printer,
  Calendar,
  CheckCircle2,
  DollarSign,
  Receipt,
  X,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { GymMember, PaymentRecord, GymSettings, PaymentMethod } from '../../types';
import {
  getGymMembers,
  getGymPayments,
  getGymSettings,
  recordGymPayment,
} from '../../db';
import {
  formatDate,
  getTodayDateString,
  addMonthsToDate,
  getRenewalStatus,
} from '../../utils/date';
import { generateReceiptNumber } from '../../utils/crypto';
import { ReceiptModal } from '../../components/ReceiptModal';

interface FeeManagementProps {
  gymId: string;
}

export const FeeManagement: React.FC<FeeManagementProps> = ({ gymId }) => {
  const [members, setMembers] = useState<GymMember[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  // Modal
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentRecord | null>(null);

  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    const mems = await getGymMembers(gymId);
    const pays = await getGymPayments(gymId);
    const stg = await getGymSettings(gymId);
    setMembers(mems);
    setPayments(pays);
    setSettings(stg);
  };

  useEffect(() => {
    loadData();
  }, [gymId]);

  const currency = settings?.currencySymbol || 'Rs.';

  const handleOpenRecord = (memberId?: string) => {
    if (memberId) {
      setSelectedMemberId(memberId);
      const m = members.find((x) => x.id === memberId);
      if (m) {
        setAmountPaid(m.monthlyFee);
      }
    } else if (members.length > 0) {
      setSelectedMemberId(members[0].id);
      setAmountPaid(members[0].monthlyFee);
    }
    setDurationMonths(1);
    setPaymentDate(getTodayDateString());
    setPaymentMethod('Cash');
    setNotes('');
    setIsRecordModalOpen(true);
  };

  const handleMemberSelectChange = (id: string) => {
    setSelectedMemberId(id);
    const m = members.find((x) => x.id === id);
    if (m) {
      setAmountPaid(m.monthlyFee * durationMonths);
    }
  };

  const handleDurationChange = (months: number) => {
    setDurationMonths(months);
    const m = members.find((x) => x.id === selectedMemberId);
    if (m) {
      setAmountPaid(m.monthlyFee * months);
    }
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) {
      alert('Please select a member.');
      return;
    }

    const currentExpiry = member.nextRenewalDate;
    const daysRem = getRenewalStatus(currentExpiry).daysRemaining;
    const baseDate = daysRem < 0 ? paymentDate : currentExpiry;
    const newRenewalDate = addMonthsToDate(baseDate, durationMonths);

    const totalFeeForPeriod = member.monthlyFee * durationMonths;
    const paid = Number(amountPaid);
    const remainingBalance = Math.max(0, totalFeeForPeriod - paid);

    const newPayment: PaymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      receiptNo: generateReceiptNumber(),
      gymId,
      memberId: member.id,
      memberName: member.fullName,
      amount: paid,
      paymentDate,
      method: paymentMethod,
      monthCovered: `${formatDate(baseDate)} - ${formatDate(newRenewalDate)}`,
      nextRenewalDateCalculated: newRenewalDate,
      previousBalance: totalFeeForPeriod,
      remainingBalance,
      notes: notes.trim() || `Fee payment (${durationMonths} month${durationMonths > 1 ? 's' : ''})`,
      createdAt: new Date().toISOString(),
    };

    const updatedMember: GymMember = {
      ...member,
      nextRenewalDate: newRenewalDate,
      paymentStatus: remainingBalance === 0 ? 'Paid' : 'Pending',
      balanceDue: remainingBalance,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    await recordGymPayment(newPayment, updatedMember);
    setIsRecordModalOpen(false);
    setSelectedReceipt(newPayment);
    await loadData();
  };

  // Metrics
  const totalReceived = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const totalTransactions = payments.length;
  const cashPayments = payments
    .filter((p) => p.method === 'Cash')
    .reduce((acc, p) => acc + p.amount, 0);
  const digitalPayments = totalReceived - cashPayments;

  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.memberName.toLowerCase().includes(q) ||
      p.receiptNo.toLowerCase().includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q));

    const matchesMethod = methodFilter === 'all' || p.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Fee & Payment Management
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Record member fee payments, track partial dues, view payment ledger, and print receipts.
          </p>
        </div>

        <button
          onClick={() => handleOpenRecord()}
          disabled={members.length === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition shadow-md disabled:opacity-50 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record Fee Payment</span>
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Total Collected</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {currency} {totalReceived.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-500">All recorded payments</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Cash Received</span>
            <Receipt className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {currency} {cashPayments.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-500">Over-the-counter</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Online / Bank / Wallet</span>
            <CreditCard className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {currency} {digitalPayments.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-500">Transfer & EasyPaisa</span>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-xs">Total Receipts</span>
            <CheckCircle2 className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalTransactions}</div>
          <span className="text-[10px] text-zinc-500">Issued payment receipts</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by member name, receipt number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl shrink-0 overflow-x-auto">
          {['all', 'Cash', 'Bank Transfer', 'EasyPaisa/JazzCash', 'Other'].map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition ${
                methodFilter === method
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-sm">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <CreditCard className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No Payment Records</p>
            <p className="text-xs text-zinc-500 mt-1">
              {searchQuery ? 'No transactions matched your search query.' : 'Recorded member fee transactions will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Receipt No</th>
                  <th className="px-5 py-3.5 font-medium">Member Name</th>
                  <th className="px-5 py-3.5 font-medium">Payment Date</th>
                  <th className="px-5 py-3.5 font-medium">Period Covered</th>
                  <th className="px-5 py-3.5 font-medium">Method</th>
                  <th className="px-5 py-3.5 font-medium">Amount Received</th>
                  <th className="px-5 py-3.5 font-medium">Balance</th>
                  <th className="px-5 py-3.5 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-850/50 transition">
                    <td className="px-5 py-3.5 font-mono text-zinc-400 font-semibold">
                      {p.receiptNo}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-white">
                      {p.memberName}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300 font-mono">
                      {formatDate(p.paymentDate)}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-400 font-mono text-[11px]">
                      {p.monthCovered}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-300">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[11px] text-zinc-300 border border-zinc-700">
                        {p.method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-400">
                      + {currency} {p.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {p.remainingBalance > 0 ? (
                        <span className="text-red-400 font-bold">
                          {currency} {p.remainingBalance.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-zinc-500 font-normal">None (Paid)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelectedReceipt(p)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition text-[11px] font-medium"
                      >
                        <Printer className="w-3 h-3" />
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD FEE PAYMENT MODAL */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-700 shadow-2xl p-6 text-zinc-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Record Fee Payment</h3>
              </div>
              <button
                onClick={() => setIsRecordModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Select Gym Member *
                </label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => handleMemberSelectChange(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.memberId}) — Fee: {currency} {m.monthlyFee.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Duration (Months)</label>
                  <select
                    value={durationMonths}
                    onChange={(e) => handleDurationChange(Number(e.target.value))}
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
                  <label className="block text-zinc-300 font-medium mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">
                    Amount Received ({currency}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(Number(e.target.value))}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
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
                <label className="block text-zinc-300 font-medium mb-1">Receipt Note / Memo (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Received by reception"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white placeholder-zinc-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition shadow-md"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Record & Generate Receipt</span>
                </button>
              </div>
            </form>
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
