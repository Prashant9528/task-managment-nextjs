'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { BoardMember, User } from '@/types';

interface BoardMembersProps {
  boardId: string;
  isOwner: boolean;
}

interface MembersResponse {
  owner: User;
  members: BoardMember[];
}

interface UsersResponse {
  users: User[];
}

interface PendingInvitation {
  id: string;
  role: string;
  receiver: User;
}

/**
 * BoardMembers Component - Shows members and allows inviting
 * 
 * NEW FEATURES:
 * - User dropdown to select who to invite
 * - Role selection (editor/viewer)
 * - Shows pending invitations
 * - Sends real-time notification to invited user
 */
export function BoardMembers({ boardId, isOwner }: BoardMembersProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Fetch members
  const { data: membersData } = useQuery({
    queryKey: ['board-members', boardId],
    queryFn: async () => {
      const response = await api.get<MembersResponse>(`/board-members/board/${boardId}`);
      return response.data;
    },
  });

  // Fetch all users (for invite dropdown)
  const { data: usersData } = useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const response = await api.get<UsersResponse>('/invitations/users');
      return response.data.users;
    },
    enabled: isOwner, // Only fetch if owner
  });

  // Fetch pending invitations for this board
  const { data: pendingData } = useQuery({
    queryKey: ['board-invitations', boardId],
    queryFn: async () => {
      const response = await api.get<{ invitations: PendingInvitation[] }>(`/invitations/board/${boardId}`);
      return response.data.invitations;
    },
    enabled: isOwner,
  });

  // Send invitation mutation
  const inviteMutation = useMutation({
    mutationFn: async (data: { userId: string; boardId: string; role: string }) => {
      const response = await api.post('/invitations', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-invitations', boardId] });
      setSelectedUserId('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to send invitation');
    },
  });

  // Cancel invitation mutation
  const cancelMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      await api.delete(`/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-invitations', boardId] });
    },
  });

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await api.delete(`/board-members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board-members', boardId] });
    },
  });

  // Filter out users who are already members or have pending invitations
  const availableUsers = usersData?.filter((user) => {
    const isMember = membersData?.members?.some((m) => m.user.id === user.id);
    const hasPending = pendingData?.some((p) => p.receiver.id === user.id);
    const isOwner = membersData?.owner?.id === user.id;
    return !isMember && !hasPending && !isOwner;
  }) || [];

  // Handle send invite
  const handleSendInvite = () => {
    if (selectedUserId) {
      setError('');
      inviteMutation.mutate({
        userId: selectedUserId,
        boardId,
        role: inviteRole,
      });
    }
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setShowModal(!showModal)}
        className="flex items-center gap-2 bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 text-sm"
      >
        <span>👥</span>
        <span>Members ({(membersData?.members?.length || 0) + 1})</span>
      </button>

      {/* Members modal */}
      {showModal && (
        <div className="absolute right-0 top-10 w-96 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Board Members</h3>
          </div>

          {/* Owner */}
          <div className="p-4 border-b">
            <p className="text-xs text-gray-500 mb-2">👑 Owner</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                {membersData?.owner?.name?.[0] || membersData?.owner?.email?.[0] || '?'}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {membersData?.owner?.name || membersData?.owner?.email || 'Unknown'}
                </p>
                {membersData?.owner?.name && (
                  <p className="text-xs text-gray-500">{membersData?.owner?.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Members list */}
          <div className="p-4 border-b max-h-40 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-2">
              👥 Members ({membersData?.members?.length || 0})
            </p>
            {membersData?.members?.length === 0 && (
              <p className="text-sm text-gray-400">No members yet</p>
            )}
            {membersData?.members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                    {member.user?.name?.[0] || member.user?.email?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.user?.name || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    member.role === 'editor' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.role}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => {
                        if (confirm('Remove this member?')) {
                          removeMutation.mutate(member.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pending invitations - only for owner */}
          {isOwner && pendingData && pendingData.length > 0 && (
            <div className="p-4 border-b max-h-32 overflow-y-auto bg-yellow-50">
              <p className="text-xs text-yellow-700 mb-2">
                ⏳ Pending Invitations ({pendingData.length})
              </p>
              {pendingData.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{invitation.receiver.name || invitation.receiver.email}</span>
                    <span className="text-xs text-gray-500">({invitation.role})</span>
                  </div>
                  <button
                    onClick={() => cancelMutation.mutate(invitation.id)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Invite form - only for owners */}
          {isOwner && (
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-2">📨 Send Invitation</p>
              
              {/* User dropdown */}
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm mb-2"
              >
                <option value="">Select a user...</option>
                {availableUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email} ({user.email})
                  </option>
                ))}
              </select>

              {availableUsers.length === 0 && (
                <p className="text-xs text-gray-400 mb-2">No users available to invite</p>
              )}

              {/* Role selection */}
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="role"
                    value="editor"
                    checked={inviteRole === 'editor'}
                    onChange={() => setInviteRole('editor')}
                  />
                  <span className="text-green-600">Editor</span>
                  <span className="text-xs text-gray-400">(can edit)</span>
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="role"
                    value="viewer"
                    checked={inviteRole === 'viewer'}
                    onChange={() => setInviteRole('viewer')}
                  />
                  <span className="text-gray-600">Viewer</span>
                  <span className="text-xs text-gray-400">(read only)</span>
                </label>
              </div>

              {error && (
                <p className="text-red-500 text-xs mb-2">{error}</p>
              )}

              <button
                onClick={handleSendInvite}
                disabled={!selectedUserId || inviteMutation.isPending}
                className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          )}

          {/* Close button */}
          <div className="p-2 border-t">
            <button
              onClick={() => setShowModal(false)}
              className="w-full text-center text-gray-500 hover:text-gray-700 text-sm py-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
