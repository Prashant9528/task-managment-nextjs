'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { BoardsResponse, Board } from '@/types';
import { NotificationBell } from '@/components/NotificationBell';

/**
 * Dashboard Page - Shows all user's boards
 */
export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore();

  // Modal state for creating new board
  const [showModal, setShowModal] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  // Redirect to login if not authenticated (AFTER hydration)
  useEffect(() => {
    // Wait for store to hydrate from localStorage before checking auth
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // Fetch all boards
  const { data, isLoading, error } = useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const response = await api.get<BoardsResponse>('/boards');
      return response.data.boards;
    },
    enabled: _hasHydrated && isAuthenticated, // Only fetch after hydration and if logged in
  });

  // Create board mutation
  const createBoardMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await api.post('/boards', { title });
      return response.data;
    },
    onSuccess: () => {
      // Refetch boards after creating
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      setShowModal(false);
      setNewBoardTitle('');
    },
  });

  // Delete board mutation
  const deleteBoardMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/boards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  // Handle create board
  const handleCreateBoard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBoardTitle.trim()) {
      createBoardMutation.mutate(newBoardTitle);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Show loading while hydrating or redirecting
  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">📋 Task Manager</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">
              Hello, {user?.name || user?.email}!
            </span>
            {/* Notification Bell - shows pending invitations */}
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-semibold text-gray-900">My Boards</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            + New Board
          </button>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading boards...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            Failed to load boards. Please try again.
          </div>
        )}

        {/* Empty state */}
        {data && data.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">You don&apos;t have any boards yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first board →
            </button>
          </div>
        )}

        {/* Boards grid - Owned boards */}
        {data && data.filter((b: Board) => b.isOwner !== false).length > 0 && (
          <>
            <h3 className="text-lg font-medium text-gray-700 mb-4">📁 Owned by me</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {data
                .filter((board: Board) => board.isOwner !== false)
                .map((board: Board) => (
                  <div
                    key={board.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                  >
                    <Link href={`/board/${board.id}`} className="block p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {board.title}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {board.columns?.length || 0} columns
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Created {new Date(board.createdAt).toLocaleDateString()}
                      </p>
                    </Link>
                    <div className="px-6 pb-4 flex justify-end">
                      <button
                        onClick={() => {
                          if (confirm('Delete this board? This cannot be undone.')) {
                            deleteBoardMutation.mutate(board.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}

        {/* Shared boards */}
        {data && data.filter((b: Board) => b.isOwner === false).length > 0 && (
          <>
            <h3 className="text-lg font-medium text-gray-700 mb-4">🤝 Shared with me</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {data
                .filter((board: Board) => board.isOwner === false)
                .map((board: Board) => (
                  <div
                    key={board.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-purple-500"
                  >
                    <Link href={`/board/${board.id}`} className="block p-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {board.title}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          board.role === 'editor' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {board.role}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {board.columns?.length || 0} columns
                      </p>
                      <p className="text-xs text-purple-600 mt-2">
                        Owner: {board.owner?.name || board.owner?.email}
                      </p>
                    </Link>
                  </div>
                ))}
            </div>
          </>
        )}
      </main>

      {/* Create Board Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Board</h3>
            <form onSubmit={handleCreateBoard}>
              <input
                type="text"
                value={newBoardTitle}
                onChange={(e) => setNewBoardTitle(e.target.value)}
                placeholder="Board title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setNewBoardTitle('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newBoardTitle.trim() || createBoardMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createBoardMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
