import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AdminAccount, GymAccount, GymSettings, Role } from '../types';
import {
  getServerStatus,
  syncLocalToServerIfUninitialized,
  getAdminAccount,
  saveAdminAccount,
  getGymByUsername,
  getGymSettings,
  getGymById,
  getAllGyms,
} from '../db';
import { hashPassword, generateStrongPassword } from '../utils/crypto';

interface AuthContextType {
  role: Role;
  admin: AdminAccount | null;
  currentGym: GymAccount | null;
  gymSettings: GymSettings | null;
  isInitialized: boolean;
  isLoading: boolean;
  setupAdmin: (username: string, password?: string, email?: string) => Promise<{ username: string; password: string }>;
  loginSuperAdmin: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginGymOwner: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateAdminPassword: (newPassword: string) => Promise<boolean>;
  refreshGymData: () => Promise<void>;
  updateCurrentGymSettings: (settings: GymSettings) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'g5meka_session';

interface StoredSession {
  role: Role;
  id: string; // admin ID or gym ID
  username?: string;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<Role>('guest');
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [currentGym, setCurrentGym] = useState<GymAccount | null>(null);
  const [gymSettings, setGymSettings] = useState<GymSettings | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkInitialization = async () => {
    try {
      // 1. If this device has an existing setup in IndexedDB that the server doesn't know about yet, migrate it
      await syncLocalToServerIfUninitialized();

      // 2. Query central server status
      const status = await getServerStatus();
      setIsInitialized(status.isInitialized);

      // 3. Resume session if available
      const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const session: StoredSession = JSON.parse(savedSession);
        if (session.role === 'superadmin') {
          // If server is initialized and session is superadmin, restore
          const localAdmin = await getAdminAccount();
          setAdmin(
            localAdmin || {
              id: session.id,
              username: session.username || 'admin',
              email: 'admin@g5meka.local',
              passwordHash: '',
              createdAt: '',
              updatedAt: '',
            }
          );
          setRole('superadmin');
        } else if (session.role === 'gym_owner') {
          const gym = await getGymById(session.id);
          if (gym && gym.accountStatus === 'active') {
            setCurrentGym(gym);
            const settings = await getGymSettings(gym.id);
            setGymSettings(settings);
            setRole('gym_owner');
          } else {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            setRole('guest');
          }
        }
      }
    } catch (err) {
      console.error('Error checking initialization:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkInitialization();
  }, []);

  const setupAdmin = async (
    username: string,
    providedPassword?: string,
    email = 'admin@g5meka.local'
  ): Promise<{ username: string; password: string }> => {
    const finalPassword = providedPassword || generateStrongPassword(14);
    const passwordHash = await hashPassword(finalPassword);

    // Call server to persist centrally
    try {
      const res = await fetch('/api/auth/setup-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          passwordHash,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to setup admin on server.');
      }
    } catch (err) {
      console.error('Error communicating with setup-admin API:', err);
    }

    const newAdmin: AdminAccount = {
      id: 'admin_root',
      username: username.trim(),
      email: email.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveAdminAccount(newAdmin);
    setAdmin(newAdmin);
    setIsInitialized(true);
    setRole('superadmin');

    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ role: 'superadmin', id: newAdmin.id, username: newAdmin.username })
    );

    return {
      username: newAdmin.username,
      password: finalPassword,
    };
  };

  const loginSuperAdmin = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const passwordHash = await hashPassword(password);

    try {
      const res = await fetch('/api/auth/login-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          passwordHash,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Invalid Super Admin credentials.' };
      }

      const adminUser: AdminAccount = {
        id: data.admin.id,
        username: data.admin.username,
        email: data.admin.email,
        passwordHash,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveAdminAccount(adminUser);
      setAdmin(adminUser);
      setRole('superadmin');
      setCurrentGym(null);
      setGymSettings(null);

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ role: 'superadmin', id: adminUser.id, username: adminUser.username })
      );

      return { success: true };
    } catch (err) {
      // Fallback: check local Dexie if server error
      const storedAdmin = await getAdminAccount();
      if (storedAdmin) {
        const input = username.trim().toLowerCase();
        const matches =
          storedAdmin.username.toLowerCase() === input ||
          storedAdmin.email.toLowerCase() === input;
        if (matches && storedAdmin.passwordHash === passwordHash) {
          setAdmin(storedAdmin);
          setRole('superadmin');
          localStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({ role: 'superadmin', id: storedAdmin.id, username: storedAdmin.username })
          );
          return { success: true };
        }
      }
      return { success: false, error: 'Authentication failed. Please verify credentials.' };
    }
  };

  const loginGymOwner = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const passwordHash = await hashPassword(password);

    try {
      const res = await fetch('/api/auth/login-gym', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          passwordHash,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Authentication failed.' };
      }

      setCurrentGym(data.gym);
      setGymSettings(data.gymSettings);
      setRole('gym_owner');
      setAdmin(null);

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ role: 'gym_owner', id: data.gym.id })
      );

      return { success: true };
    } catch (err) {
      // Fallback to local
      const gym = await getGymByUsername(username);
      if (!gym) {
        return {
          success: false,
          error: 'Gym account not found. Only registered gym owners can log in.',
        };
      }

      if (gym.accountStatus === 'suspended') {
        return {
          success: false,
          error: 'Account Suspended: This gym has been suspended by the platform administrator.',
        };
      }

      if (gym.accountStatus === 'inactive') {
        return {
          success: false,
          error: 'Account Inactive: This gym license is currently inactive or expired.',
        };
      }

      if (gym.passwordHash !== passwordHash) {
        return { success: false, error: 'Invalid username or password.' };
      }

      setCurrentGym(gym);
      const settings = await getGymSettings(gym.id);
      setGymSettings(settings);
      setRole('gym_owner');
      setAdmin(null);

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ role: 'gym_owner', id: gym.id })
      );

      return { success: true };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setRole('guest');
    setAdmin(null);
    setCurrentGym(null);
    setGymSettings(null);
  };

  const updateAdminPassword = async (newPassword: string): Promise<boolean> => {
    if (!admin) return false;
    const newHash = await hashPassword(newPassword);

    try {
      await fetch('/api/auth/change-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPasswordHash: newHash }),
      });
    } catch {}

    const updated: AdminAccount = {
      ...admin,
      passwordHash: newHash,
      updatedAt: new Date().toISOString(),
    };
    await saveAdminAccount(updated);
    setAdmin(updated);
    return true;
  };

  const refreshGymData = async () => {
    if (currentGym) {
      const updatedGym = await getGymById(currentGym.id);
      if (updatedGym) {
        setCurrentGym(updatedGym);
      }
      const updatedSettings = await getGymSettings(currentGym.id);
      setGymSettings(updatedSettings);
    }
  };

  const updateCurrentGymSettings = async (settings: GymSettings) => {
    await fetch('/api/gym-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setGymSettings(settings);
    if (currentGym) {
      const refreshedGym = await getGymById(currentGym.id);
      if (refreshedGym) setCurrentGym(refreshedGym);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        admin,
        currentGym,
        gymSettings,
        isInitialized,
        isLoading,
        setupAdmin,
        loginSuperAdmin,
        loginGymOwner,
        logout,
        updateAdminPassword,
        refreshGymData,
        updateCurrentGymSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
