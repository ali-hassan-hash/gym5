import Dexie, { type Table } from 'dexie';
import type {
  AdminAccount,
  SystemSettings,
  GymAccount,
  GymSettings,
  GymMember,
  PaymentRecord,
} from '../types';

export class G5MekaDatabase extends Dexie {
  admin_account!: Table<AdminAccount, string>;
  system_settings!: Table<SystemSettings, string>;
  gyms!: Table<GymAccount, string>;
  members!: Table<GymMember, string>;
  payments!: Table<PaymentRecord, string>;
  gym_settings!: Table<GymSettings, string>;

  constructor() {
    super('G5MekaDB');
    this.version(1).stores({
      admin_account: 'id, username, email',
      system_settings: 'id',
      gyms: 'id, username, accountStatus, ownerMobile, ownerEmail',
      members: 'id, memberId, gymId, mobileNumber, nextRenewalDate, paymentStatus, status',
      payments: 'id, gymId, memberId, receiptNo, paymentDate',
      gym_settings: 'gymId',
    });
  }
}

export const db = new G5MekaDatabase();

// ======================== SERVER SYNC & MIGRATION ========================

export async function getServerStatus(): Promise<{
  isInitialized: boolean;
  hasAdmin: boolean;
  currency: string;
  currencySymbol: string;
}> {
  try {
    const res = await fetch('/api/auth/status');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend server status unavailable, checking local storage:', err);
  }

  // Fallback to local Dexie
  const localAdmin = await db.admin_account.toCollection().first();
  const sys = await db.system_settings.get('system');
  return {
    isInitialized: !!localAdmin,
    hasAdmin: !!localAdmin,
    currency: sys?.currency || 'PKR',
    currencySymbol: sys?.currencySymbol || 'Rs.',
  };
}

/**
 * Checks if the local device has an existing Super Admin or gym data from Turn 1,
 * and if so, safely syncs it to the server so it's recognized across all devices.
 */
export async function syncLocalToServerIfUninitialized(): Promise<boolean> {
  try {
    const status = await getServerStatus();
    const localAdmin = await db.admin_account.toCollection().first();

    // If server has no admin yet, but local device has one, migrate to server!
    if (!status.isInitialized && localAdmin) {
      console.log('Preserving existing local Super Admin and syncing to central backend...');
      const localGyms = await db.gyms.toArray();
      const localSettings = await db.gym_settings.toArray();
      const localMembers = await db.members.toArray();
      const localPayments = await db.payments.toArray();
      const localSys = await db.system_settings.get('system');

      const res = await fetch('/api/auth/migrate-from-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_account: localAdmin,
          system_settings: localSys,
          gyms: localGyms,
          gym_settings: localSettings,
          members: localMembers,
          payments: localPayments,
        }),
      });

      if (res.ok) {
        console.log('Existing local setup successfully migrated to central server database.');
        return true;
      }
    }
  } catch (err) {
    console.error('Error in local to server migration:', err);
  }
  return false;
}

// ======================== ADMIN & SYSTEM ========================

export async function getAdminAccount(): Promise<AdminAccount | undefined> {
  return await db.admin_account.toCollection().first();
}

export async function saveAdminAccount(account: AdminAccount): Promise<void> {
  await db.admin_account.put(account);
}

export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const res = await fetch('/api/system-settings');
    if (res.ok) {
      const data = await res.json();
      await db.system_settings.put(data);
      return data;
    }
  } catch {}

  const existing = await db.system_settings.get('system');
  if (existing) return existing;

  const defaultSettings: SystemSettings = {
    id: 'system',
    currency: 'PKR',
    currencySymbol: 'Rs.',
    businessName: 'G5MEKA Gym Systems',
    contactEmail: 'admin@g5meka.local',
    contactPhone: '+92 300 0000000',
    notes: 'Central G5MEKA System Configuration',
    initializedAt: new Date().toISOString(),
  };
  await db.system_settings.put(defaultSettings);
  return defaultSettings;
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  const current = await getSystemSettings();
  const updated = { ...current, ...settings };
  try {
    await fetch('/api/system-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
  } catch {}
  await db.system_settings.put(updated);
}

// ======================== GYM MANAGEMENT ========================

export async function getAllGyms(): Promise<GymAccount[]> {
  try {
    const res = await fetch('/api/gyms');
    if (res.ok) {
      const gyms: GymAccount[] = await res.json();
      await db.gyms.clear();
      await db.gyms.bulkPut(gyms);
      return gyms;
    }
  } catch {}
  return await db.gyms.toArray();
}

export async function getGymById(id: string): Promise<GymAccount | undefined> {
  try {
    const gyms = await getAllGyms();
    const found = gyms.find((g) => g.id === id);
    if (found) return found;
  } catch {}
  return await db.gyms.get(id);
}

export async function getGymByUsername(username: string): Promise<GymAccount | undefined> {
  const clean = username.trim().toLowerCase();
  try {
    const gyms = await getAllGyms();
    const found = gyms.find(
      (g) =>
        g.username?.toLowerCase() === clean ||
        g.ownerEmail?.toLowerCase() === clean ||
        g.id?.toLowerCase() === clean
    );
    if (found) return found;
  } catch {}
  return await db.gyms.where('username').equalsIgnoreCase(clean).first();
}

export async function saveGym(gym: GymAccount): Promise<void> {
  try {
    await fetch('/api/gyms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gym),
    });
  } catch {}
  await db.gyms.put(gym);
}

export async function updateGym(gym: GymAccount): Promise<void> {
  gym.updatedAt = new Date().toISOString();
  await saveGym(gym);
}

export async function deleteGym(gymId: string): Promise<void> {
  try {
    await fetch(`/api/gyms/${gymId}`, { method: 'DELETE' });
  } catch {}
  await db.transaction('rw', [db.gyms, db.members, db.payments, db.gym_settings], async () => {
    await db.gyms.delete(gymId);
    await db.members.where('gymId').equals(gymId).delete();
    await db.payments.where('gymId').equals(gymId).delete();
    await db.gym_settings.delete(gymId);
  });
}

// ======================== GYM SETTINGS ========================

export async function getGymSettings(gymId: string): Promise<GymSettings> {
  try {
    const res = await fetch(`/api/gym-data/${gymId}`);
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        await db.gym_settings.put(data.settings);
        return data.settings;
      }
    }
  } catch {}

  const existing = await db.gym_settings.get(gymId);
  if (existing) return existing;

  const gym = await getGymById(gymId);
  const sys = await getSystemSettings();
  const newSettings: GymSettings = {
    gymId,
    gymName: gym?.gymName || 'G5MEKA Gym',
    ownerName: gym?.ownerName || 'Owner',
    phone: gym?.ownerMobile || '',
    whatsapp: gym?.ownerMobile || '',
    address: gym?.gymAddress || '',
    currency: sys.currency,
    currencySymbol: sys.currencySymbol,
    defaultMonthlyFee: 2000,
    defaultDurationMonths: 1,
    whatsappMessageTemplate: '',
    updatedAt: new Date().toISOString(),
  };
  await db.gym_settings.put(newSettings);
  return newSettings;
}

export async function saveGymSettings(settings: GymSettings): Promise<void> {
  settings.updatedAt = new Date().toISOString();
  try {
    await fetch('/api/gym-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  } catch {}

  await db.gym_settings.put(settings);

  // Keep gym account name in sync
  const gym = await getGymById(settings.gymId);
  if (gym) {
    gym.gymName = settings.gymName;
    gym.ownerName = settings.ownerName;
    gym.ownerMobile = settings.phone;
    gym.gymAddress = settings.address;
    await db.gyms.put(gym);
  }
}

// ======================== MEMBER MANAGEMENT ========================

export async function getGymMembers(gymId: string): Promise<GymMember[]> {
  try {
    const res = await fetch(`/api/gym-data/${gymId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.members)) {
        await db.members.where('gymId').equals(gymId).delete();
        await db.members.bulkPut(data.members);
        return data.members;
      }
    }
  } catch {}
  return await db.members.where('gymId').equals(gymId).toArray();
}

export async function getMemberById(id: string, gymId: string): Promise<GymMember | undefined> {
  const member = await db.members.get(id);
  if (member && member.gymId === gymId) {
    return member;
  }
  return undefined;
}

export async function saveGymMember(member: GymMember): Promise<void> {
  try {
    await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member),
    });
  } catch {}
  await db.members.put(member);
}

export async function deleteGymMember(id: string, gymId: string): Promise<void> {
  try {
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
  } catch {}
  const member = await db.members.get(id);
  if (member && member.gymId === gymId) {
    await db.transaction('rw', [db.members, db.payments], async () => {
      await db.members.delete(id);
      await db.payments.where({ gymId, memberId: id }).delete();
    });
  }
}

// ======================== PAYMENT MANAGEMENT ========================

export async function getGymPayments(gymId: string): Promise<PaymentRecord[]> {
  try {
    const res = await fetch(`/api/gym-data/${gymId}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.payments)) {
        await db.payments.where('gymId').equals(gymId).delete();
        await db.payments.bulkPut(data.payments);
        return data.payments.sort(
          (a: PaymentRecord, b: PaymentRecord) =>
            new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );
      }
    }
  } catch {}
  return await db.payments.where('gymId').equals(gymId).reverse().sortBy('paymentDate');
}

export async function getMemberPayments(gymId: string, memberId: string): Promise<PaymentRecord[]> {
  const payments = await getGymPayments(gymId);
  return payments.filter((p) => p.memberId === memberId);
}

export async function recordGymPayment(
  payment: PaymentRecord,
  updatedMember: GymMember
): Promise<void> {
  try {
    await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment, updatedMember }),
    });
  } catch {}

  await db.transaction('rw', [db.payments, db.members], async () => {
    await db.payments.put(payment);
    await db.members.put(updatedMember);
  });
}

// ======================== BACKUP & RESTORE ========================

export async function exportEntireDatabase(): Promise<string> {
  try {
    const res = await fetch('/api/backup/export');
    if (res.ok) {
      const data = await res.json();
      return JSON.stringify(data, null, 2);
    }
  } catch {}

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    system_settings: await db.system_settings.toArray(),
    admin_account: await db.admin_account.toArray(),
    gyms: await db.gyms.toArray(),
    gym_settings: await db.gym_settings.toArray(),
    members: await db.members.toArray(),
    payments: await db.payments.toArray(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importEntireDatabase(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.gyms || !data.members) {
      throw new Error('Invalid backup file structure.');
    }

    try {
      await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {}

    await db.transaction(
      'rw',
      [
        db.system_settings,
        db.admin_account,
        db.gyms,
        db.gym_settings,
        db.members,
        db.payments,
      ],
      async () => {
        if (data.system_settings) {
          await db.system_settings.clear();
          await db.system_settings.bulkPut(
            Array.isArray(data.system_settings) ? data.system_settings : [data.system_settings]
          );
        }
        if (data.admin_account) {
          await db.admin_account.clear();
          await db.admin_account.bulkPut(
            Array.isArray(data.admin_account) ? data.admin_account : [data.admin_account]
          );
        }
        if (data.gyms) {
          await db.gyms.clear();
          await db.gyms.bulkPut(data.gyms);
        }
        if (data.gym_settings) {
          await db.gym_settings.clear();
          await db.gym_settings.bulkPut(data.gym_settings);
        }
        if (data.members) {
          await db.members.clear();
          await db.members.bulkPut(data.members);
        }
        if (data.payments) {
          await db.payments.clear();
          await db.payments.bulkPut(data.payments);
        }
      }
    );
    return true;
  } catch (err) {
    console.error('Failed to import database:', err);
    throw err;
  }
}

export async function exportGymData(gymId: string): Promise<string> {
  const gym = await getGymById(gymId);
  const settings = await getGymSettings(gymId);
  const members = await getGymMembers(gymId);
  const payments = await getGymPayments(gymId);

  const data = {
    version: 1,
    gymId,
    exportedAt: new Date().toISOString(),
    gym,
    settings,
    members,
    payments,
  };
  return JSON.stringify(data, null, 2);
}

export async function importGymData(gymId: string, jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    if (!data.members || !Array.isArray(data.members)) {
      throw new Error('Invalid gym backup file.');
    }

    // Save each member and payment to server & local
    for (const m of data.members) {
      await saveGymMember({ ...m, gymId });
    }
    for (const p of data.payments || []) {
      await recordGymPayment({ ...p, gymId }, data.members.find((m: any) => m.id === p.memberId));
    }
    if (data.settings) {
      await saveGymSettings({ ...data.settings, gymId });
    }

    return true;
  } catch (err) {
    console.error('Failed to import gym data:', err);
    throw err;
  }
}
