/**
 * useSocket Hook - Manages WebSocket connection for real-time updates
 * 
 * WHAT IS A WEBSOCKET HOOK?
 * =========================
 * A hook is a reusable piece of logic in React. This hook:
 * 1. Creates a socket connection when you enter a board page
 * 2. Joins a "room" for that specific board
 * 3. Listens for real-time events (task created, moved, deleted, etc.)
 * 4. Disconnects when you leave the page
 * 
 * WHY REAL-TIME UPDATES?
 * ======================
 * Without WebSockets:
 * - User A creates a task → User B doesn't see it until refresh
 * 
 * With WebSockets:
 * - User A creates a task → Server broadcasts to everyone in board room
 * - User B sees the task appear instantly!
 */

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store';
import { API_URL } from '@/lib/api';

// Types for the events we'll receive
interface Task {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  columnId: string;
  assignee?: { id: string; email: string; name: string | null } | null;
}

interface Column {
  id: string;
  title: string;
  order: number;
  boardId: string;
  tasks?: Task[];
}

// Event handlers that the board page will provide
interface SocketEventHandlers {
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskMoved?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onColumnCreated?: (column: Column) => void;
  onColumnUpdated?: (column: Column) => void;
  onColumnDeleted?: (columnId: string) => void;
}

/**
 * Custom hook for WebSocket connection to a board
 * 
 * @param boardId - The ID of the board to join
 * @param handlers - Event handlers for real-time updates
 */
export function useSocket(boardId: string | null, handlers: SocketEventHandlers) {
  // useRef keeps the socket instance across re-renders
  // (like a persistent variable that doesn't cause re-renders when changed)
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuthStore();

  // Connect to WebSocket and join board room
  useEffect(() => {
    // Don't connect if no boardId or no token
    if (!boardId || !token) return;

    // Create socket connection to our NestJS server
    const socket = io(API_URL, {
      // Send auth token with the connection
      auth: {
        token: token,
      },
      // Use WebSocket transport (not long-polling)
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // When connected, join the board room
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected!');
      socket.emit('board:join', boardId);  // Server expects 'board:join'
    });

    // Listen for real-time events from the server
    // These are emitted by the BoardGateway when CRUD operations happen

    socket.on('task:created', (task: Task) => {
      console.log('📦 Task created:', task);
      handlers.onTaskCreated?.(task);
    });

    socket.on('task:updated', (task: Task) => {
      console.log('✏️ Task updated:', task);
      handlers.onTaskUpdated?.(task);
    });

    socket.on('task:moved', (task: Task) => {
      console.log('➡️ Task moved:', task);
      handlers.onTaskMoved?.(task);
    });

    socket.on('task:deleted', (taskId: string) => {
      console.log('🗑️ Task deleted:', taskId);
      handlers.onTaskDeleted?.(taskId);
    });

    socket.on('column:created', (column: Column) => {
      console.log('📋 Column created:', column);
      handlers.onColumnCreated?.(column);
    });

    socket.on('column:updated', (column: Column) => {
      console.log('✏️ Column updated:', column);
      handlers.onColumnUpdated?.(column);
    });

    socket.on('column:deleted', (columnId: string) => {
      console.log('🗑️ Column deleted:', columnId);
      handlers.onColumnDeleted?.(columnId);
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
    });

    socket.on('error', (error: Error) => {
      console.error('🔌 WebSocket error:', error);
    });

    // Cleanup function - runs when component unmounts or boardId changes
    return () => {
      console.log('🔌 Leaving board room and disconnecting');
      socket.emit('board:leave', boardId);  // Server expects 'board:leave'
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId, token]); // Note: handlers not in deps to avoid reconnecting on every render

  // Return the socket instance (in case we need to emit events)
  return socketRef.current;
}
