import React, { useState } from 'react';

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

interface TeamMembersProps {
  members: TeamMember[];
  currentUserRole: string;
  onUpdateMember: (memberId: number, updateData: any) => void;
  onRemoveMember: (memberId: number) => void;
}

export const TeamMembers: React.FC<TeamMembersProps> = ({
  members,
  currentUserRole,
  onUpdateMember,
  onRemoveMember
}) => {
  const [editingMember, setEditingMember] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const canManageTeam = currentUserRole === 'practice_owner' || currentUserRole === 'admin';

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'practice_owner': return '👑';
      case 'admin': return '🛡️';
      case 'veterinarian': return '👨‍⚕️';
      case 'technician': return '👩‍🔬';
      case 'trial': return '🔄';
      default: return '👤';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'practice_owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'veterinarian': return 'bg-green-100 text-green-800';
      case 'technician': return 'bg-orange-100 text-orange-800';
      case 'trial': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatLastLogin = (dateString?: string) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    
    return date.toLocaleDateString();
  };

  const startEditing = (member: TeamMember) => {
    setEditingMember(member.id);
    setEditData({
      full_name: member.full_name,
      role: member.role,
      veterinary_license: member.veterinary_license || '',
      is_active: member.is_active
    });
  };

  const saveEdit = () => {
    if (editingMember) {
      onUpdateMember(editingMember, editData);
      setEditingMember(null);
      setEditData({});
    }
  };

  const cancelEdit = () => {
    setEditingMember(null);
    setEditData({});
  };

  const handleRemove = (member: TeamMember) => {
    if (member.is_current_user) {
      alert('You cannot remove yourself from the team.');
      return;
    }

    if (window.confirm(`Are you sure you want to remove ${member.full_name} from the team?`)) {
      onRemoveMember(member.id);
    }
  };

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No team members found.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className={`border rounded-lg p-4 ${
                member.is_current_user ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                      {getRoleIcon(member.role)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingMember === member.id ? (
                      // Edit mode
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editData.full_name}
                          onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Full Name"
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <select
                            value={editData.role}
                            onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                            disabled={currentUserRole !== 'practice_owner'}
                          >
                            <option value="veterinarian">Veterinarian</option>
                            <option value="technician">Technician</option>
                            <option value="admin">Admin</option>
                            {currentUserRole === 'practice_owner' && (
                              <option value="practice_owner">Practice Owner</option>
                            )}
                          </select>
                          
                          <input
                            type="text"
                            value={editData.veterinary_license}
                            onChange={(e) => setEditData({ ...editData, veterinary_license: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="Veterinary License"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`active-${member.id}`}
                            checked={editData.is_active}
                            onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor={`active-${member.id}`} className="text-sm text-gray-700">
                            Active
                          </label>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Display mode
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {member.full_name}
                            {member.is_current_user && (
                              <span className="ml-2 text-sm text-blue-600">(You)</span>
                            )}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                            {member.role.replace('_', ' ').toUpperCase()}
                          </span>
                          {!member.is_active && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              INACTIVE
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mb-1">{member.email}</p>
                        {member.veterinary_license && (
                          <p className="text-sm text-gray-600 mb-1">
                            License: {member.veterinary_license}
                          </p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                          <span>Joined {formatDate(member.created_at)}</span>
                          <span>Last login: {formatLastLogin(member.last_login)}</span>
                        </div>

                        <div className="flex items-center space-x-4 text-xs text-gray-600 mt-2">
                          <span>{member.stats.notes_created} notes created</span>
                          <span>{member.stats.patients_seen} patients seen</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {canManageTeam && editingMember !== member.id && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEditing(member)}
                      className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100"
                      title="Edit member"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    
                    {!member.is_current_user && (
                      <button
                        onClick={() => handleRemove(member)}
                        className="p-2 text-gray-500 hover:text-red-600 rounded-lg hover:bg-gray-100"
                        title="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};