'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useNotifications, Invitation, Notification } from '@/hooks/useNotifications';

/**
 * NotificationBell - Shows notifications dropdown with invitations
 * 
 * Features:
 * - Badge with unread count
 * - Real-time notifications via WebSocket
 * - Accept/Reject buttons for invitations
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { notifications, unreadCount, markAllRead, removeNotification } = useNotifications();

  // Fetch pending invitations from API (initial load)
  const { data: invitationsData } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: async () => {
      const response = await api.get<{ invitations: Invitation[] }>('/invitations/my');
      return response.data.invitations;
    },
  });

  // Respond to invitation mutation
  const respondMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'accept' | 'reject' }) => {
      const response = await api.patch(`/invitations/${id}/respond`, { action });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  // Handle accept/reject
  const handleRespond = (invitation: Invitation, action: 'accept' | 'reject') => {
    respondMutation.mutate({ id: invitation.id, action });
    // Remove from notifications if it's there
    const notif = notifications.find(n => n.invitation?.id === invitation.id);
    if (notif) {
      removeNotification(notif.id);
    }
  };

  // Combine API invitations with real-time notifications
  const pendingInvitations = invitationsData || [];
  const hasNotifications = pendingInvitations.length > 0 || notifications.length > 0;

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) markAllRead();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Badge */}
        {(unreadCount > 0 || pendingInvitations.length > 0) && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
            {unreadCount || pendingInvitations.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-3 border-b">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {!hasNotifications && (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications
              </div>
            )}

            {/* Pending Invitations from API */}
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="p-3 border-b hover:bg-gray-50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                    📧
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">
                        {invitation.sender.name || invitation.sender.email}
                      </span>{' '}
                      invited you to{' '}
                      <span className="font-medium">{invitation.board.title}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Role: {invitation.role}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleRespond(invitation, 'accept')}
                        disabled={respondMutation.isPending}
                        className="px-3 py-1 text-xs font-medium text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(invitation, 'reject')}
                        disabled={respondMutation.isPending}
                        className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Real-time notifications (responses, etc.) */}
            {notifications
              .filter(n => n.type === 'invitation_response')
              .map((notif) => (
                <div key={notif.id} className="p-3 border-b hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                      notif.status === 'accepted' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {notif.status === 'accepted' ? '✓' : '✕'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(notif.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <button
                      onClick={() => removeNotification(notif.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
          </div>

          <div className="p-2 border-t">
            <button
              onClick={() => setIsOpen(false)}
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
