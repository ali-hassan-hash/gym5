/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InitialSetup } from './views/auth/InitialSetup';
import { UnifiedLogin } from './views/auth/UnifiedLogin';
import { SuperAdminLayout, type SuperAdminTab } from './views/superadmin/SuperAdminLayout';
import { SuperAdminDashboard } from './views/superadmin/SuperAdminDashboard';
import { GymsManagement } from './views/superadmin/GymsManagement';
import { PricingSales } from './views/superadmin/PricingSales';
import { SuperAdminSettings } from './views/superadmin/SuperAdminSettings';

import { GymLayout, type GymTab } from './views/gym/GymLayout';
import { GymDashboard } from './views/gym/GymDashboard';
import { MembersList } from './views/gym/MembersList';
import { AddMember } from './views/gym/AddMember';
import { FeeManagement } from './views/gym/FeeManagement';
import { UpcomingRenewals } from './views/gym/UpcomingRenewals';
import { ExpiredMembers } from './views/gym/ExpiredMembers';
import { GymSettingsView } from './views/gym/GymSettingsView';
import { G5MekaLogo } from './components/G5MekaLogo';
import { getGymMembers } from './db';
import { getRenewalStatus } from './utils/date';
import type { GymMember } from './types';

function MainRouter() {
  const { role, isInitialized, isLoading, currentGym } = useAuth();

  // Super Admin Navigation
  const [superAdminTab, setSuperAdminTab] = useState<SuperAdminTab>('dashboard');
  const [openAddGymModal, setOpenAddGymModal] = useState(false);

  // Gym Owner Navigation
  const [gymTab, setGymTab] = useState<GymTab>('dashboard');
  const [selectedMemberForProfile, setSelectedMemberForProfile] = useState<string | undefined>(undefined);
  const [renewalsDueCount, setRenewalsDueCount] = useState<number>(0);

  // Update renewals count for badge
  useEffect(() => {
    if (role === 'gym_owner' && currentGym) {
      getGymMembers(currentGym.id).then((mems) => {
        const due = mems.filter((m) => {
          const info = getRenewalStatus(m.nextRenewalDate);
          return info.daysRemaining <= 5 && info.daysRemaining >= 0;
        }).length;
        setRenewalsDueCount(due);
      });
    }
  }, [role, currentGym, gymTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-100">
        <G5MekaLogo size="lg" showTagline={true} className="animate-pulse mb-4" />
        <p className="text-xs text-zinc-500 font-mono">Connecting to G5MEKA central system...</p>
      </div>
    );
  }

  // 1. Initial Setup for Super Admin ONLY if the system has NEVER been initialized
  if (!isInitialized) {
    return <InitialSetup />;
  }

  // 2. Unauthenticated: Show Unified Dual-Option Login (Gym Owner & Super Admin)
  if (role === 'guest') {
    return <UnifiedLogin />;
  }

  // 3. Super Admin Panel
  if (role === 'superadmin') {
    return (
      <SuperAdminLayout
        currentTab={superAdminTab}
        onSelectTab={(tab) => {
          setSuperAdminTab(tab);
          setOpenAddGymModal(false);
        }}
      >
        {superAdminTab === 'dashboard' && (
          <SuperAdminDashboard
            onNavigateTab={(tab) => setSuperAdminTab(tab)}
            onOpenAddGym={() => {
              setSuperAdminTab('gyms');
              setOpenAddGymModal(true);
            }}
          />
        )}
        {superAdminTab === 'gyms' && (
          <GymsManagement initialOpenAdd={openAddGymModal} />
        )}
        {superAdminTab === 'pricing' && <PricingSales />}
        {superAdminTab === 'settings' && <SuperAdminSettings />}
      </SuperAdminLayout>
    );
  }

  // 4. Gym Owner Management Dashboard
  if (role === 'gym_owner' && currentGym) {
    return (
      <GymLayout
        currentTab={gymTab}
        onSelectTab={(tab) => {
          setGymTab(tab);
          setSelectedMemberForProfile(undefined);
        }}
        renewalsDueCount={renewalsDueCount}
      >
        {gymTab === 'dashboard' && (
          <GymDashboard
            gymId={currentGym.id}
            onNavigate={(tab) => setGymTab(tab)}
            onSelectMember={(m: GymMember) => {
              setSelectedMemberForProfile(m.id);
              setGymTab('members');
            }}
          />
        )}

        {gymTab === 'members' && (
          <MembersList
            gymId={currentGym.id}
            onNavigateAddMember={() => setGymTab('add_member')}
            selectedMemberId={selectedMemberForProfile}
          />
        )}

        {gymTab === 'add_member' && (
          <AddMember
            gymId={currentGym.id}
            onSuccess={() => setGymTab('members')}
            onCancel={() => setGymTab('members')}
          />
        )}

        {gymTab === 'fees' && <FeeManagement gymId={currentGym.id} />}

        {gymTab === 'renewals' && (
          <UpcomingRenewals
            gymId={currentGym.id}
            onQuickRenewMember={(member) => {
              setSelectedMemberForProfile(member.id);
              setGymTab('members');
            }}
          />
        )}

        {gymTab === 'expired' && (
          <ExpiredMembers
            gymId={currentGym.id}
            onQuickRenewMember={(member) => {
              setSelectedMemberForProfile(member.id);
              setGymTab('members');
            }}
          />
        )}

        {gymTab === 'settings' && <GymSettingsView gymId={currentGym.id} />}
      </GymLayout>
    );
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <MainRouter />
    </AuthProvider>
  );
}
