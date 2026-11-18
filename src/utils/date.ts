export interface RenewalStatusInfo {
  status: 'overdue' | 'today' | 'urgent_1day' | 'reminder_3days' | 'upcoming_5days' | 'normal';
  daysRemaining: number;
  label: string;
  badgeClass: string;
}

/**
 * Calculates remaining days until renewal date.
 * Returns negative if overdue, 0 if due today, positive if in future.
 */
export function getDaysRemaining(renewalDateStr: string): number {
  if (!renewalDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = renewalDateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Returns detailed renewal status classification.
 */
export function getRenewalStatus(renewalDateStr: string): RenewalStatusInfo {
  const days = getDaysRemaining(renewalDateStr);

  if (days < 0) {
    const overdueDays = Math.abs(days);
    return {
      status: 'overdue',
      daysRemaining: days,
      label: `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`,
      badgeClass: 'bg-red-500/10 text-red-400 border border-red-500/20',
    };
  }

  if (days === 0) {
    return {
      status: 'today',
      daysRemaining: 0,
      label: 'Due Today',
      badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse',
    };
  }

  if (days === 1) {
    return {
      status: 'urgent_1day',
      daysRemaining: 1,
      label: 'Due Tomorrow (1 day)',
      badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    };
  }

  if (days <= 3) {
    return {
      status: 'reminder_3days',
      daysRemaining: days,
      label: `${days} days left`,
      badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    };
  }

  if (days <= 5) {
    return {
      status: 'upcoming_5days',
      daysRemaining: days,
      label: `${days} days left`,
      badgeClass: 'bg-zinc-700/50 text-zinc-300 border border-zinc-600',
    };
  }

  return {
    status: 'normal',
    daysRemaining: days,
    label: `${days} days left`,
    badgeClass: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
  };
}

/**
 * Format date string (YYYY-MM-DD) into readable representation (e.g. 10 Nov 2026)
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Returns today's date in YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Add months to a given date string (YYYY-MM-DD).
 */
export function addMonthsToDate(dateStr: string, monthsToAdd: number): string {
  if (!dateStr) return getTodayDateString();
  const [year, month, day] = dateStr.split('-').map(Number);
  const target = new Date(year, month - 1 + monthsToAdd, day);
  
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const d = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * WhatsApp click-to-chat url generator.
 */
export function createWhatsAppUrl(
  phone: string,
  message: string
): string {
  // Clean phone number (keep only digits and optional leading +)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  
  // If starts with 0 (e.g. Pakistani 03001234567), change to country code 923001234567
  if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
    cleanPhone = '92' + cleanPhone.slice(1);
  }
  
  const encodedText = encodeURIComponent(message.trim());
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Builds standard renewal WhatsApp message with custom templates.
 */
export function buildRenewalWhatsAppMessage(params: {
  template?: string;
  memberName: string;
  gymName: string;
  daysRemaining: number;
  renewalDate: string;
  monthlyFee: number;
  currencySymbol: string;
}): string {
  const {
    template,
    memberName,
    gymName,
    daysRemaining,
    renewalDate,
    monthlyFee,
    currencySymbol,
  } = params;

  if (template && template.trim().length > 0) {
    return template
      .replace(/{member_name}/g, memberName)
      .replace(/{gym_name}/g, gymName)
      .replace(/{days}/g, Math.abs(daysRemaining).toString())
      .replace(/{renewal_date}/g, formatDate(renewalDate))
      .replace(/{fee_amount}/g, `${currencySymbol} ${monthlyFee.toLocaleString()}`);
  }

  // Default professional message
  if (daysRemaining < 0) {
    return `Hello ${memberName}! Your ${gymName} gym membership was due on ${formatDate(renewalDate)} (overdue by ${Math.abs(daysRemaining)} days). Fee: ${currencySymbol} ${monthlyFee.toLocaleString()}. Please renew your monthly fee to continue your membership. Thank you!`;
  } else if (daysRemaining === 0) {
    return `Hello ${memberName}! Your ${gymName} gym membership is due today (${formatDate(renewalDate)}). Fee: ${currencySymbol} ${monthlyFee.toLocaleString()}. Please renew your monthly fee to continue your membership. Thank you!`;
  } else {
    return `Hello ${memberName}! Your ${gymName} gym membership is due for renewal in ${daysRemaining} days (${formatDate(renewalDate)}). Fee: ${currencySymbol} ${monthlyFee.toLocaleString()}. Please renew your monthly fee to continue your membership. Thank you!`;
  }
}
