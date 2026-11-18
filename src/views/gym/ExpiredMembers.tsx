import React, { useState, useEffect } from 'react';
import {
  UserX,
  MessageSquare,
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import type { GymMember, GymSettings } from '../../types';
import { getGymMembers, getGymSettings } from '../../db';
import {
  getRenewalStatus,
  formatDate,
  createWhatsAppUrl,
  buildRenewalWhatsAppMessage,
} from '../../utils/date';

interface ExpiredMembersProps {
  gymId: string;
  onQuickRenewMember: (member: GymMember) => void;
}

export const ExpiredMembers: React.FC<ExpiredMembersProps> = ({
  gymId,
  onQuickRenewMember,
}) => {
  const [members, setMembers] = useState<GymMember[]>([]);
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const expiredList = members
    .map((m) => ({ member: m, info: getRenewalStatus(m.nextRenewalDate) }))
    .filter((x) => x.info.status === 'overdue')
    .sort((a, b) => a.info.daysRemaining - b.info.daysRemaining); // Most overdue first

  const filtered = expiredList.filter(({ member }) => {
    const q = searchQuery.toLowerCase();
    return (
      member.fullName.toLowerCase().includes(q) ||
      member.mobileNumber.includes(q) ||
      member.memberId.toLowerCase().includes(q)
    );
  });

  const totalOverdueFees = expiredList.reduce(
    (acc, item) => acc + item.member.monthlyFee + item.member.balanceDue,
    0
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Expired Members
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Members whose fee renewal date has passed. Follow up via WhatsApp or record fee renewal.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs">
            <span className="text-zinc-400 block text-[10px]">Total Overdue Members:</span>
            <span className="text-sm font-bold text-red-400 font-mono">
              {expiredList.length} members ({currency} {totalOverdueFees.toLocaleString()})
            </span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Search expired members by name, phone or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl bg-zinc-900 border border-zinc-800 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/60 mb-3" />
            <p className="text-sm font-medium text-zinc-300">No Expired Members</p>
            <p className="text-xs text-zinc-500 mt-1">
              All active gym members have paid up-to-date fees. No members are currently overdue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/70 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Member ID & Name</th>
                  <th className="px-5 py-3.5 font-medium">Mobile Number</th>
                  <th className="px-5 py-3.5 font-medium">Monthly Fee</th>
                  <th className="px-5 py-3.5 font-medium">Due Date</th>
                  <th className="px-5 py-3.5 font-medium">Overdue Duration</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filtered.map(({ member, info }) => {
                  const overdueDays = Math.abs(info.daysRemaining);
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
                          {member.memberId}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-zinc-300">
                        {member.mobileNumber}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-zinc-200">
                        {currency} {member.monthlyFee.toLocaleString()}
                        {member.balanceDue > 0 && (
                          <span className="text-[10px] text-red-400 block font-bold">
                            + {currency} {member.balanceDue.toLocaleString()} unpaid
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 font-mono text-zinc-400">
                        {formatDate(member.nextRenewalDate)}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                          {overdueDays} {overdueDays === 1 ? 'day' : 'days'} overdue
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition text-xs font-medium"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>WhatsApp Follow-up</span>
                          </a>

                          <button
                            onClick={() => onQuickRenewMember(member)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 transition text-xs font-semibold shadow-sm"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
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
    </div>
  );
};
