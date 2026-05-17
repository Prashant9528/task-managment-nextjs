/**
 * useNotifications Hook - Real-time notifications for invitations
 * 
 * HOW IT WORKS:
 * =============
 * 1. Connects to the /notifications WebSocket namespace
 * 2. Joins user's personal room (user:{userId})
 * 3. Listens for invitation events
 * 4. Updates local state and shows notifications
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store';
import { API_URL } from '@/lib/api';

export interface Invitation {
  id: string;
  role: string;
  status: string;
  createdAt: string;
  board: {
    id: string;
    title: string;
  };
  sender: {
    id: string;
    email: string;
    name: string | null;
  };
}

export interface Notification {
  id: string;
  type: 'invitation' | 'invitation_response' | 'general';
  message: string;
  invitation?: Invitation;
  status?: 'accepted' | 'rejected';
  createdAt: Date;
  read: boolean;
}

export function useNotifications() {
  const socketRef = useRef<Socket | null>(null);
  const { token, user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Add a notification
  const addNotification = useCallback((notif: Omit<Notification, 'id' | 'createdAt' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: Math.random().toString(36).substring(7),
      createdAt: new Date(),
      read: false,
    };
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  // Mark all as read
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Remove a notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notif = prev.find(n => n.id === id);
      if (notif && !notif.read) {
        setUnreadCount(c => Math.max(0, c - 1));
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  // Connect to WebSocket
  useEffect(() => {
    if (!token || !user) return;

    const socket = io(`${API_URL}/notifications`, {
      auth: {
        token,
        userId: user.id,
      },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔔 Connected to notifications');
    });

    // Listen for new invitations
    socket.on('invitation:received', (data) => {
      console.log('📨 Received invitation:', data);
      addNotification({
        type: 'invitation',
        message: data.message,
        invitation: data.invitation,
      });
    });

    // Listen for invitation responses
    socket.on('invitation:response', (data) => {
      console.log('📨 Invitation response:', data);
      addNotification({
        type: 'invitation_response',
        message: data.message,
        invitation: data.invitation,
        status: data.status,
      });
    });

    socket.on('disconnect', () => {
      console.log('🔔 Disconnected from notifications');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user, addNotification]);

  return {
    notifications,
    unreadCount,
    markAllRead,
    removeNotification,
    addNotification,
  };
}
