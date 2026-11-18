import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Phone,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import type { GymMember, GymSettings, PaymentMethod } from '../../types';
import {
  getGymMembers,
  saveGymMember,
  getGymSettings,
  recordGymPayment,
} from '../../db';
import { generateUniqueId, generateReceiptNumber } from '../../utils/crypto';
import {
  getTodayDateString,
  addMonthsToDate,
  formatDate,
} from '../../utils/date';

interface AddMemberProps {
  gymId: string;
  onSuccess: (member: GymMember) => void;
  onCancel: () => void;
}

export const AddMember: React.FC<AddMemberProps> = ({
  gymId,
  onSuccess,
  onCancel,
}) => {
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [existingMembers, setExistingMembers] = useState<GymMember[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [memberId, setMemberId] = useState(() => generateUniqueId('M'));
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [syncWhatsapp, setSyncWhatsapp] = useState(true);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [age, setAge] = useState<string>('');
  const [homeAddress, setHomeAddress] = useState('');
  const [monthlyFee, setMonthlyFee] = useState<number>(2000);
  const [joiningDate, setJoiningDate] = useState(getTodayDateString());
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [nextRenewalDate, setNextRenewalDate] = useState(() =>
    addMonthsToDate(getTodayDateString(), 1)
  );
  const [initialPaymentStatus, setInitialPaymentStatus] = useState<
    'Paid' | 'Pending' | 'Partial'
  >('Paid');
  const [amountPaidNow, setAmountPaidNow] = useState<number>(2000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    getGymSettings(gymId).then((stg) => {
      setSettings(stg);
      if (stg.defaultMonthlyFee) {
        setMonthlyFee(stg.defaultMonthlyFee);
        setAmountPaidNow(stg.defaultMonthlyFee);
      }
      if (stg.defaultDurationMonths) {
        setDurationMonths(stg.defaultDurationMonths);
        setNextRenewalDate(addMonthsToDate(getTodayDateString(), stg.defaultDurationMonths));
      }
    });
    getGymMembers(gymId).then(setExistingMembers);
  }, [gymId]);

  const currency = settings?.currencySymbol || 'Rs.';

  // Automatically update next renewal date when joining date or duration changes
  const handleDurationChange = (months: number) => {
    setDurationMonths(months);
    setNextRenewalDate(addMonthsToDate(joiningDate, months));
    // Also update monthly fee multiple or keep per-month? Standard: monthly fee * duration
    const totalExpected = monthlyFee * months;
    if (initialPaymentStatus === 'Paid') {
      setAmountPaidNow(totalExpected);
    }
  };

  const handleJoiningDateChange = (date: string) => {
    setJoiningDate(date);
    setNextRenewalDate(addMonthsToDate(date, durationMonths));
  };

  const handlePaymentStatusChange = (status: 'Paid' | 'Pending' | 'Partial') => {
    setInitialPaymentStatus(status);
    const totalExpected = monthlyFee * durationMonths;
    if (status === 'Paid') {
      setAmountPaidNow(totalExpected);
    } else if (status === 'Pending') {
      setAmountPaidNow(0);
    } else {
      // Partial: default to half
      setAmountPaidNow(Math.round(totalExpected / 2));
    }
  };

  // Check for duplicate phone number
  const handleMobileChange = (val: string) => {
    setMobileNumber(val);
    if (syncWhatsapp) {
      setWhatsappNumber(val);
    }
    const clean = val.replace(/[^0-9]/g, '');
    if (clean.length >= 7) {
      const match = existingMembers.find(
        (m) => m.mobileNumber.replace(/[^0-9]/g, '') === clean
      );
      if (match) {
        setDuplicateWarning(
          `Notice: Mobile number is already used by existing member "${match.fullName}" (${match.memberId}).`
        );
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !mobileNumber.trim()) {
      alert('Please fill in Member Name and Mobile Number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const totalCost = monthlyFee * durationMonths;
      const paid = initialPaymentStatus === 'Pending' ? 0 : Number(amountPaidNow);
      const balanceDue = Math.max(0, totalCost - paid);

      const computedPaymentStatus =
        balanceDue === 0 ? 'Paid' : paid > 0 ? 'Pending' : 'Pending';

      const newMember: GymMember = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        memberId: memberId.trim().toUpperCase(),
        gymId,
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        whatsappNumber: (syncWhatsapp ? mobileNumber : whatsappNumber).trim(),
        gender,
        age: age ? Number(age) : undefined,
        homeAddress: homeAddress.trim(),
        monthlyFee: Number(monthlyFee),
        joiningDate,
        durationMonths,
        nextRenewalDate,
        status: 'active',
        paymentStatus: computedPaymentStatus,
        balanceDue,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveGymMember(newMember);

      // If initial payment was made, record it in payment history
      if (paid > 0) {
        const paymentRecord = {
          id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          receiptNo: generateReceiptNumber(),
          gymId,
          memberId: newMember.id,
          memberName: newMember.fullName,
          amount: paid,
          paymentDate: joiningDate,
          method: paymentMethod,
          monthCovered: `${formatDate(joiningDate)} - ${formatDate(nextRenewalDate)}`,
          nextRenewalDateCalculated: nextRenewalDate,
          previousBalance: totalCost,
          remainingBalance: balanceDue,
          notes: `Initial membership enrollment fee (${durationMonths} month${durationMonths > 1 ? 's' : ''})`,
          createdAt: new Date().toISOString(),
        };

        await recordGymPayment(paymentRecord, newMember);
      }

      onSuccess(newMember);
    } catch (err) {
      console.error(err);
      alert('Failed to register member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Add New Member
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Enroll member into {settings?.gymName || 'Gym'}, set renewal duration, and record initial fee.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 transition"
        >
          Cancel
        </button>
      </div>

      {duplicateWarning && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{duplicateWarning}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Member Identification */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            1. Member Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Member ID (Auto-Generated) *
              </label>
              <input
                type="text"
                required
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-zinc-300 font-medium mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Ahmed Raza"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Mobile Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 03001234567"
                  value={mobileNumber}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 pl-10 pr-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-300 font-medium">WhatsApp Number</label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-400">
                  <input
                    type="checkbox"
                    checked={syncWhatsapp}
                    onChange={(e) => {
                      setSyncWhatsapp(e.target.checked);
                      if (e.target.checked) setWhatsappNumber(mobileNumber);
                    }}
                    className="rounded bg-zinc-950 border-zinc-700 text-white"
                  />
                  <span>Same as mobile</span>
                </label>
              </div>
              <div className="relative">
                <MessageSquare className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-500" />
                <input
                  type="text"
                  disabled={syncWhatsapp}
                  placeholder="e.g. 03001234567"
                  value={syncWhatsapp ? mobileNumber : whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-700 pl-10 pr-3.5 py-2.5 text-white text-sm focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Age (Optional)</label>
              <input
                type="number"
                placeholder="e.g. 24"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Home Address (Optional)</label>
              <input
                type="text"
                placeholder="e.g. House 14, Street 2"
                value={homeAddress}
                onChange={(e) => setHomeAddress(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Membership Plan & Renewal Dates */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            2. Membership Plan & Renewal Timeline
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Monthly Fee ({currency}) *
              </label>
              <input
                type="number"
                required
                value={monthlyFee}
                onChange={(e) => {
                  const fee = Number(e.target.value);
                  setMonthlyFee(fee);
                  if (initialPaymentStatus === 'Paid') {
                    setAmountPaidNow(fee * durationMonths);
                  }
                }}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Joining / Start Date *
              </label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={(e) => handleJoiningDateChange(e.target.value)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Duration (Months)
              </label>
              <select
                value={durationMonths}
                onChange={(e) => handleDurationChange(Number(e.target.value))}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white focus:outline-none"
              >
                <option value={1}>1 Month</option>
                <option value={2}>2 Months</option>
                <option value={3}>3 Months (Quarterly)</option>
                <option value={6}>6 Months (Half-Year)</option>
                <option value={12}>12 Months (1 Year)</option>
              </select>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] text-zinc-400 block">Calculated Next Renewal Date</span>
              <span className="text-sm font-bold text-amber-300 font-mono">
                {formatDate(nextRenewalDate)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500">Custom Date Override:</span>
              <input
                type="date"
                value={nextRenewalDate}
                onChange={(e) => setNextRenewalDate(e.target.value)}
                className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Fee Payment on Joining */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            3. Initial Fee Collection
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Payment Status *
              </label>
              <select
                value={initialPaymentStatus}
                onChange={(e) => handlePaymentStatusChange(e.target.value as any)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
              >
                <option value="Paid">Paid in Full</option>
                <option value="Partial">Partial Payment</option>
                <option value="Pending">Pending / Unpaid</option>
              </select>
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">
                Amount Paid Now ({currency})
              </label>
              <input
                type="number"
                disabled={initialPaymentStatus === 'Pending'}
                value={amountPaidNow}
                onChange={(e) => setAmountPaidNow(Number(e.target.value))}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white font-mono disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-medium mb-1">Payment Method</label>
              <select
                disabled={initialPaymentStatus === 'Pending'}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3 py-2 text-white disabled:opacity-40"
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="EasyPaisa/JazzCash">EasyPaisa / JazzCash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {initialPaymentStatus === 'Partial' && (
            <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex justify-between text-xs">
              <span className="text-zinc-400">Remaining Balance Due:</span>
              <span className="font-mono font-bold text-red-400">
                {currency} {Math.max(0, monthlyFee * durationMonths - amountPaidNow).toLocaleString()}
              </span>
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Prefers evening workouts, locker 12 assigned"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-white placeholder-zinc-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl bg-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 transition shadow-md disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            <span>{isSubmitting ? 'Registering...' : 'Register Member & Save'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
