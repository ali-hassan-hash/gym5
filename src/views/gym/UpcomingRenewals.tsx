import React, { useState, useEffect } from 'react';
import {
  BellRing,
  Calendar,
  MessageSquare,
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import type { GymMember, GymSettings } from '../../types';
import { getGymMembers, getGymSettings } from '../../db';
import {
  getRenewalStatus,
  formatDate,
  createWhatsAppUrl,
  buildRenewalWhatsAppMessage,
} from '../../utils/date';

interface UpcomingRenewalsProps {
  gymId: string;
  onQuickRenewMember: (member: GymMember) => void;
}

export const UpcomingRenewals: React.FC<UpcomingRenewalsProps> = ({
  gymId,
  onQuickRenewMember,
}) => {
  const [members, setMembers] = useState<GymMember[]>([]);
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<
    'all' | 'today' | 'tomorrow' | '3days' | '5days' | 'overdue'
  >('all');

  const loadData = async () => {
    const mems = await getGymMembers(gymId);
    const stg = await getGymSettings(gymId);
    setMembers(mems);
    setSettings(stg);
  };

  useEffect(() => {
    loadData();
  }, [gymId]);

  const currency = settings?.currencySymbol || 'Rs.';

  // Categorize members
  const memberStatusList = members.map((m) => ({
    member: m,
    info: getRenewalStatus(m.nextRenewalDate),
  }));

  const overdueCount = memberStatusList.filter((x) => x.info.status === 'overdue').length;
  const todayCount = memberStatusList.filter((x) => x.info.status === 'today').length;
  const tomorrowCount = memberStatusList.filter((x) => x.info.status === 'urgent_1day').length;
  const threeDaysCount = memberStatusList.filter((x) => x.info.status === 'reminder_3days').length;
  const fiveDaysCount = memberStatusList.filter((x) => x.info.status === 'upcoming_5days').length;

  const filteredList = memberStatusList.filter(({ member, info }) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      member.fullName.toLowerCase().includes(q) ||
      member.mobileNumber.includes(q) ||
      member.memberId.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (activeTab === 'today') return info.status === 'today';
    if (activeTab === 'tomorrow') return info.status === 'urgent_1day';
    if (activeTab === '3days') return info.status === 'reminder_3days';
    if (activeTab === '5days') return info.status === 'upcoming_5days';
    if (activeTab === 'overdue') return info.status === 'overdue';

    // 'all': Show anything with renewal within 15 days or overdue
    return info.daysRemaining <= 15;
  }).sort((a, b) => a.info.daysRemaining - b.info.daysRemaining);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Automatic Fee Renewal Reminders
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Monitor upcoming membership renewal deadlines and send 1-click WhatsApp reminders.
        </p>
      </div>

      {/* Reminder Dashboard Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Overdue */}
        <button
          onClick={() => setActiveTab('overdue')}
          className={`p-4 rounded-2xl border text-left transition ${
            activeTab === 'overdue'
              ? 'bg-red-500/15 border-red-500/50'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <span className="text-[11px] font-medium text-red-400 block">Overdue Renewals</span>
          <div className="text-2xl font-bold text-red-400 font-mono mt-1">{overdueCount}</div>
          <span className="text-[10px] text-zinc-500">Past renewal date</span>
        </button>

        {/* Due Today */}
        <button
          onClick={() => setActiveTab('today')}
          className={`p-4 rounded-2xl border text-left transition ${
            activeTab === 'today'
              ? 'bg-amber-500/20 border-amber-500/50'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <span className="text-[11px] font-medium text-amber-300 block">Due Today</span>
          <div className="text-2xl font-bold text-amber-300 font-mono mt-1">{todayCount}</div>
          <span className="text-[10px] text-zinc-500">Renewal is today</span>
        </button>

        {/* Tomorrow (1 Day) */}
        <button
          onClick={() => setActiveTab('tomorrow')}
          className={`p-4 rounded-2xl border text-left transition ${
            activeTab === 'tomorrow'
              ? 'bg-amber-500/15 border-amber-500/40'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <span className="text-[11px] font-medium text-amber-400 block">Due Tomorrow</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">{tomorrowCount}</div>
          <span className="text-[10px] text-zinc-500">1 day remaining</span>
        </button>

        {/* Next 3 Days */}
        <button
          onClick={() => setActiveTab('3days')}
          className={`p-4 rounded-2xl border text-left transition ${
            activeTab === '3days'
              ? 'bg-zinc-800 border-zinc-600'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <span className="text-[11px] font-medium text-zinc-300 block">Within 3 Days</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">{threeDaysCount}</div>
          <span className="text-[10px] text-zinc-500">2 to 3 days left</span>
        </button>

        {/* Next 5 Days */}
        <button
          onClick={() => setActiveTab('5days')}
          className={`p-4 rounded-2xl border text-left transition col-span-2 sm:col-span-1 ${
            activeTab === '5days'
              ? 'bg-zinc-800 border-zinc-600'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <span className="text-[11px] font-medium text-zinc-300 block">Within 5 Days</span>
          <div className="text-2xl font-bold text-white font-mono mt-1">{fiveDaysCount}</div>
          <span className="text-[10px] text-zinc-500">4 to 5 days left</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by member name, mobile or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
          />
        </div>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
            activeTab === 'all'
              ? 'bg-zinc-800 text-white font-semibold border border-zinc-700'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          Show All Renewals
        </button>
      </div>

      {/* Reminders List Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-sm">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No Members in This Renewal Category</p>
            <p className="text-xs text-zinc-500 mt-1">
              All member renewal dates are either up to date or outside this reminder window.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Member</th>
                  <th className="px-5 py-3.5 font-medium">Monthly Fee</th>
                  <th className="px-5 py-3.5 font-medium">Renewal Date</th>
                  <th className="px-5 py-3.5 font-medium">Remaining Days</th>
                  <th className="px-5 py-3.5 font-medium">Reminder Status</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredList.map(({ member, info }) => {
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
                    <tr key={member.id} className="hover:bg-zinc-850/50 transition">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">{member.fullName}</div>
                        <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                          {member.memberId} &bull; {member.mobileNumber}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-mono text-zinc-200">
                        {currency} {member.monthlyFee.toLocaleString()}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-zinc-300">
                        {formatDate(member.nextRenewalDate)}
                      </td>

                      <td className="px-5 py-3.5 font-mono font-bold">
                        {info.daysRemaining < 0 ? (
                          <span className="text-red-400">
                            {Math.abs(info.daysRemaining)} days ago
                          </span>
                        ) : info.daysRemaining === 0 ? (
                          <span className="text-amber-300 font-bold">Today</span>
                        ) : (
                          <span className="text-zinc-200">{info.daysRemaining} days</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${info.badgeClass}`}>
                          {info.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* 1-Click WhatsApp Button */}
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open WhatsApp with Pre-filled Reminder"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition text-xs font-medium"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Send WhatsApp</span>
                          </a>

                          {/* Quick Renew Fee Button */}
                          <button
                            onClick={() => onQuickRenewMember(member)}
                            title="Record Payment"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition text-xs font-medium"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Renew Fee</span>
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

      {/* WhatsApp Message Template Preview Banner */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5">
        <h3 className="text-xs font-semibold text-white mb-1">
          WhatsApp Reminder Template Note
        </h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          G5MEKA uses official WhatsApp click-to-chat links (`https://wa.me/...`) to open your web or mobile WhatsApp with a pre-filled, personalized message for each member. You can customize the reminder wording in Gym Settings.
        </p>
      </div>
    </div>
  );
};
