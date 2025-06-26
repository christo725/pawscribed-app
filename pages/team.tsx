import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { teamAPI } from '../lib/api';
import { TeamMembers } from '../components/team/TeamMembers';
// import { TeamActivity } from '../components/team/TeamActivity';
// import { AddMemberModal } from '../components/team/AddMemberModal';
import toast from 'react-hot-toast';

interface TeamMember {
  id: number;
  email: string;
  full_name: string;
  role: string;
  veterinary_license?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
  stats: {
    notes_created: number;
    patients_seen: number;
  };
  is_current_user: boolean;
}

interface TeamStats {
  total_members: number;
  active_members: number;
  roles: {
    [key: string]: number;
  };
}

interface TeamData {
  success: boolean;
  members: TeamMember[];
  team_stats: TeamStats;
  current_user_role: string;
}

interface ActivityItem {
  type: string;
  id: string;
  timestamp: string;
  author: string;
  author_id: number;
  description: string;
  patient_name?: string;
  patient_id?: number;
}

type TabType = 'members' | 'activity' | 'settings';

export default function TeamPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load team data
  const loadTeamData = async () => {
    try {
      setLoading(true);
      
      const [membersResult, activityResult] = await Promise.all([
        teamAPI.getMembers(),
        teamAPI.getActivity(7)
      ]);
      
      if (membersResult.success) {
        setTeamData(membersResult);
      } else {
        toast.error('Failed to load team members');
      }
      
      if (activityResult.success) {
        setActivity(activityResult.activity);
      }
      
    } catch (error) {
      console.error('Failed to load team data:', error);
      toast.error('Failed to load team information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTeamData();
    }
  }, [isAuthenticated]);

  const handleAddMember = async (memberData: any) => {
    try {
      const result = await teamAPI.createMember(memberData);
      if (result.success) {
        toast.success('Team member added successfully');
        setShowAddMemberModal(false);
        loadTeamData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to add team member');
      }
    } catch (error: any) {
      console.error('Failed to add team member:', error);
      toast.error(error.response?.data?.detail || 'Failed to add team member');
    }
  };

  const handleUpdateMember = async (memberId: number, updateData: any) => {
    try {
      const result = await teamAPI.updateMember(memberId, updateData);
      if (result.success) {
        toast.success('Team member updated successfully');
        loadTeamData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to update team member');
      }
    } catch (error: any) {
      console.error('Failed to update team member:', error);
      toast.error(error.response?.data?.detail || 'Failed to update team member');
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    try {
      const result = await teamAPI.removeMember(memberId);
      if (result.success) {
        toast.success('Team member removed successfully');
        loadTeamData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to remove team member');
      }
    } catch (error: any) {
      console.error('Failed to remove team member:', error);
      toast.error(error.response?.data?.detail || 'Failed to remove team member');
    }
  };

  if (!isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!teamData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load team data</h2>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'members', label: 'Team Members', icon: '👥' },
    { id: 'activity', label: 'Recent Activity', icon: '📊' },
    { id: 'settings', label: 'Team Settings', icon: '⚙️' }
  ];

  const canManageTeam = teamData.current_user_role === 'practice_owner' || teamData.current_user_role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
              <p className="text-sm text-gray-600">
                Manage your practice team members and permissions
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {canManageTeam && (
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Team Member
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">{teamData.team_stats.total_members}</p>
              </div>
              <span className="text-2xl">👥</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-gray-900">{teamData.team_stats.active_members}</p>
              </div>
              <span className="text-2xl">✅</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Veterinarians</p>
                <p className="text-2xl font-bold text-gray-900">{teamData.team_stats.roles.veterinarian || 0}</p>
              </div>
              <span className="text-2xl">👨‍⚕️</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Technicians</p>
                <p className="text-2xl font-bold text-gray-900">{teamData.team_stats.roles.technician || 0}</p>
              </div>
              <span className="text-2xl">👩‍🔬</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'members' && (
              <TeamMembers
                members={teamData.members}
                currentUserRole={teamData.current_user_role}
                onUpdateMember={handleUpdateMember}
                onRemoveMember={handleRemoveMember}
              />
            )}
            
            {activeTab === 'activity' && (
              <div className="text-center py-12 text-gray-500">
                <p>Team Activity component coming soon...</p>
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Team Settings</h3>
                <p className="text-gray-600">Configure practice-wide settings and integrations.</p>
                <p className="text-sm text-gray-500 mt-2">Coming soon...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Member Modal - Coming Soon */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Team Member</h3>
            <p className="text-gray-600 mb-4">Team member management coming soon...</p>
            <button
              onClick={() => setShowAddMemberModal(false)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}