import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  BellRing,
  DollarSign,
  Plus,
  ArrowRight,
  MessageSquare,
  Printer,
  Calendar,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import type { GymMember, PaymentRecord, GymSettings } from '../../types';
import { getGymMembers, getGymPayments, getGymSettings } from '../../db';
import {
  getRenewalStatus,
  formatDate,
  getTodayDateString,
  createWhatsAppUrl,
  buildRenewalWhatsAppMessage,
} from '../../utils/date';
import { ReceiptModal } from '../../components/ReceiptModal';

interface GymDashboardProps {
  gymId: string;
  onNavigate: (tab: 'members' | 'add_member' | 'fees' | 'renewals' | 'expired' | 'settings') => void;
  onSelectMember?: (member: GymMember) => void;
}

export const GymDashboard: React.FC<GymDashboardProps> = ({
  gymId,
  onNavigate,
  onSelectMember,
}) => {
  const [members, setMembers] = useState<GymMember[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const mems = await getGymMembers(gymId);
      const pays = await getGymPayments(gymId);
      const stg = await getGymSettings(gymId);
      setMembers(mems);
      setPayments(pays);
      setSettings(stg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [gymId]);

  const currency = settings?.currencySymbol || 'Rs.';

  // Real-time calculations
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => {
    const statusInfo = getRenewalStatus(m.nextRenewalDate);
    return statusInfo.status !== 'overdue';
  }).length;
  const expiredMembers = members.filter((m) => {
    const statusInfo = getRenewalStatus(m.nextRenewalDate);
    return statusInfo.status === 'overdue';
  }).length;

  const todayRenewals = members.filter((m) => {
    const statusInfo = getRenewalStatus(m.nextRenewalDate);
    return statusInfo.status === 'today';
  }).length;

  const upcomingRenewals = members.filter((m) => {
    const statusInfo = getRenewalStatus(m.nextRenewalDate);
    return statusInfo.status === 'upcoming_5days' || statusInfo.status === 'reminder_3days' || statusInfo.status === 'urgent_1day';
  }).length;

  const totalFeesCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

  // Lists
  const recentMembers = [...members]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const urgentRenewalsList = members
    .map((m) => ({ member: m, info: getRenewalStatus(m.nextRenewalDate) }))
    .filter((item) => item.info.daysRemaining <= 5 && item.info.daysRemaining >= 0)
    .sort((a, b) => a.info.daysRemaining - b.info.daysRemaining)
    .slice(0, 5);

  const recentPaymentsList = payments.slice(0, 5);

  if (loading) {
    return <div className="text-zinc-400 text-xs py-8">Loading dashboard metrics...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-850 border border-zinc-800 p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
            <span>Welcome back</span>
            <span>&bull;</span>
            <span className="font-mono text-zinc-300">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {settings?.gymName || 'Gym Management'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Replaces paper registers with instant fee tracking, member records, and WhatsApp renewals.
          </p>
        </div>

        <button
          onClick={() => onNavigate('add_member')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Quick Add Member</span>
        </button>
      </div>

      {/* 6 Key Statistic Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Members */}
        <div
          onClick={() => onNavigate('members')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Total Members</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalMembers}</div>
          <span className="text-[10px] text-zinc-500">All registered</span>
        </div>

        {/* 2. Active Members */}
        <div
          onClick={() => onNavigate('members')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Active</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{activeMembers}</div>
          <span className="text-[10px] text-emerald-500/80">Valid renewals</span>
        </div>

        {/* 3. Expired Members */}
        <div
          onClick={() => onNavigate('expired')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Expired</span>
            <UserX className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{expiredMembers}</div>
          <span className="text-[10px] text-red-500/80">Overdue fees</span>
        </div>

        {/* 4. Today's Renewals */}
        <div
          onClick={() => onNavigate('renewals')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Due Today</span>
            <BellRing className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono">{todayRenewals}</div>
          <span className="text-[10px] text-amber-500/80">Renewal today</span>
        </div>

        {/* 5. Upcoming Renewals */}
        <div
          onClick={() => onNavigate('renewals')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Next 5 Days</span>
            <Calendar className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono">{upcomingRenewals}</div>
          <span className="text-[10px] text-zinc-500">Approaching due</span>
        </div>

        {/* 6. Fees Collected */}
        <div
          onClick={() => onNavigate('fees')}
          className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-zinc-400 mb-1">
            <span className="text-[11px] font-medium">Fees Collected</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono truncate">
            {currency} {totalFeesCollected.toLocaleString()}
          </div>
          <span className="text-[10px] text-zinc-500">Total received</span>
        </div>
      </div>

      {/* Two Column Section: Upcoming Fee Renewals & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Upcoming Fee Renewals with WhatsApp button */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-white">Upcoming Fee Renewals (1-5 Days)</h3>
              </div>
              <button
                onClick={() => onNavigate('renewals')}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {urgentRenewalsList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No fee renewals approaching in the next 5 days.
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentRenewalsList.map(({ member, info }) => {
                  const whatsappMessage = buildRenewalWhatsAppMessage({
                    template: settings?.whatsappMessageTemplate,
                    memberName: member.fullName,
                    gymName: settings?.gymName || 'G5MEKA Gym',
                    daysRemaining: info.daysRemaining,
                    renewalDate: member.nextRenewalDate,
                    monthlyFee: member.monthlyFee,
                    currencySymbol: currency,
                  });
                  const whatsappUrl = createWhatsAppUrl(
                    member.whatsappNumber || member.mobileNumber,
                    whatsappMessage
                  );

                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs truncate">
                            {member.fullName}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {member.memberId}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span>Due: {formatDate(member.nextRenewalDate)}</span>
                          <span>&bull;</span>
                          <span className="text-emerald-400 font-mono font-medium">
                            {currency} {member.monthlyFee.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${info.badgeClass}`}>
                          {info.label}
                        </span>

                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open WhatsApp Reminder"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition text-xs font-medium"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Recent Payments */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Recent Payments Received</h3>
              </div>
              <button
                onClick={() => onNavigate('fees')}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
              >
                <span>Fee Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentPaymentsList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No payment transactions recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentPaymentsList.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs">
                          {payment.memberName}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-mono">
                          {payment.receiptNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                        <span>{formatDate(payment.paymentDate)}</span>
                        <span>&bull;</span>
                        <span className="text-zinc-500">{payment.method}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400 text-xs block">
                          + {currency} {payment.amount.toLocaleString()}
                        </span>
                        {payment.remainingBalance > 0 && (
                          <span className="text-[10px] text-red-400 font-mono">
                            Bal: {currency} {payment.remainingBalance.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedReceiptPayment(payment)}
                        title="Print / View Receipt"
                        className="p-1.5 rounded-lg bg-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-800 transition border border-zinc-800"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Recently Added Members Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-white">Recently Registered Members</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Quick overview of recent enrollments</p>
          </div>
          <button
            onClick={() => onNavigate('members')}
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
          >
            <span>All Members ({members.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentMembers.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs">
            No members registered yet. Click "Quick Add Member" above to record your first gym member.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Member ID</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium">Mobile</th>
                  <th className="px-5 py-3 font-medium">Monthly Fee</th>
                  <th className="px-5 py-3 font-medium">Next Renewal</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {recentMembers.map((member) => {
                  const statusInfo = getRenewalStatus(member.nextRenewalDate);
                  return (
                    <tr
                      key={member.id}
                      onClick={() => onSelectMember && onSelectMember(member)}
                      className="hover:bg-zinc-850/50 cursor-pointer transition"
                    >
                      <td className="px-5 py-3.5 font-mono text-zinc-400">{member.memberId}</td>
                      <td className="px-5 py-3.5 font-semibold text-white">{member.fullName}</td>
                      <td className="px-5 py-3.5 text-zinc-300">{member.mobileNumber}</td>
                      <td className="px-5 py-3.5 font-mono text-zinc-200">
                        {currency} {member.monthlyFee.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-zinc-400">
                        {formatDate(member.nextRenewalDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceiptPayment && (
        <ReceiptModal
          payment={selectedReceiptPayment}
          settings={settings}
          onClose={() => setSelectedReceiptPayment(null)}
        />
      )}
    </div>
  );
};
