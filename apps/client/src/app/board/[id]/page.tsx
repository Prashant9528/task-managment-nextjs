'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Board, BoardResponse, Task, Column } from '@/types';
import { BoardColumn } from '@/components/board/BoardColumn';
import { TaskCard } from '@/components/board/TaskCard';
import { BoardMembers } from '@/components/board/BoardMembers';
import { useSocket } from '@/hooks/useSocket';

/**
 * Board Page - The main Kanban board with drag-and-drop
 * 
 * NOW WITH REAL-TIME UPDATES AND SHARING!
 * When another user adds/moves/deletes tasks, you'll see it instantly.
 */
export default function BoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;
  const queryClient = useQueryClient();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  // Local state for optimistic updates
  const [localBoard, setLocalBoard] = useState<Board | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  // ============================================
  // WEBSOCKET HANDLERS FOR REAL-TIME UPDATES
  // ============================================
  
  /**
   * When a task is created by another user, add it to local state
   */
  const handleTaskCreated = useCallback((task: Task) => {
    setLocalBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === task.columnId
            ? { ...col, tasks: [...col.tasks, task] }
            : col
        ),
      };
    });
  }, []);

  /**
   * When a task is updated by another user, update it in local state
   */
  const handleTaskUpdated = useCallback((updatedTask: Task) => {
    setLocalBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((t) =>
            t.id === updatedTask.id ? { ...t, ...updatedTask } : t
          ),
        })),
      };
    });
  }, []);

  /**
   * When a task is moved by another user, move it in local state
   */
  const handleTaskMoved = useCallback((movedTask: Task) => {
    setLocalBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) => {
          // Remove task from old column
          const filteredTasks = col.tasks.filter((t) => t.id !== movedTask.id);
          // Add to new column
          if (col.id === movedTask.columnId) {
            return { ...col, tasks: [...filteredTasks, movedTask] };
          }
          return { ...col, tasks: filteredTasks };
        }),
      };
    });
  }, []);

  /**
   * When a task is deleted by another user, remove it from local state
   */
  const handleTaskDeleted = useCallback((taskId: string) => {
    setLocalBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t.id !== taskId),
        })),
      };
    });
  }, []);

  /**
   * When a column is created by another user, add it to local state
   */
  const handleColumnCreated = useCallback((column: Column) => {
    setLocalBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: [...prev.columns, { ...column, tasks: column.tasks || [] }],
      };
    });
  }, []);

  /**
   * When a column is updated by another user, update it in local state
   */
  const handleColumnUpdated = useCallback((updatedColumn: Column) => {
    setLocalBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.map((col) =>
          col.id === updatedColumn.id ? { ...col, ...updatedColumn } : col
        ),
      };
    });
  }, []);

  /**
   * When a column is deleted by another user, remove it from local state
   */
  const handleColumnDeleted = useCallback((columnId: string) => {
    setLocalBoard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        columns: prev.columns.filter((col) => col.id !== columnId),
      };
    });
  }, []);

  // Connect to WebSocket for real-time updates
  useSocket(_hasHydrated && isAuthenticated ? boardId : null, {
    onTaskCreated: handleTaskCreated,
    onTaskUpdated: handleTaskUpdated,
    onTaskMoved: handleTaskMoved,
    onTaskDeleted: handleTaskDeleted,
    onColumnCreated: handleColumnCreated,
    onColumnUpdated: handleColumnUpdated,
    onColumnDeleted: handleColumnDeleted,
  });

  // Redirect if not authenticated (AFTER hydration)
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // Fetch board data
  const { data, isLoading, error } = useQuery({
    queryKey: ['board', boardId],
    queryFn: async () => {
      const response = await api.get<BoardResponse>(`/boards/${boardId}`);
      return response.data.board;
    },
    enabled: _hasHydrated && isAuthenticated && !!boardId,
  });

  // Update local board when data changes
  useEffect(() => {
    if (data) {
      setLocalBoard(data);
    }
  }, [data]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; columnId: string }) => {
      const response = await api.post('/tasks', data);
      return response.data;
    },
    onSuccess: () => {
      // Note: We don't invalidate queries anymore because WebSocket will update local state!
      // But we still close the modal
      setShowTaskModal(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setSelectedColumnId(null);
    },
  });

  // Move task mutation
  const moveTaskMutation = useMutation({
    mutationFn: async (data: { taskId: string; columnId: string; order: number }) => {
      const response = await api.patch(`/tasks/${data.taskId}/move`, {
        columnId: data.columnId,
        order: data.order,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  // Create column mutation
  const createColumnMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await api.post('/columns', { title, boardId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  // Delete column mutation
  const deleteColumnMutation = useMutation({
    mutationFn: async (columnId: string) => {
      await api.delete(`/columns/${columnId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  // Rename column mutation
  const renameColumnMutation = useMutation({
    mutationFn: async ({ columnId, title }: { columnId: string; title: string }) => {
      const response = await api.patch(`/columns/${columnId}`, { title });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activating
      },
    })
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = findTaskById(taskId);
    setActiveTask(task || null);
  };

  // Handle drag over (for visual feedback)
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localBoard) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find source and destination columns
    const activeColumn = findColumnByTaskId(activeId);
    const overColumn = findColumnById(overId) || findColumnByTaskId(overId);

    if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

    // Optimistically update local state
    setLocalBoard((prev) => {
      if (!prev) return prev;

      const task = activeColumn.tasks.find((t) => t.id === activeId);
      if (!task) return prev;

      return {
        ...prev,
        columns: prev.columns.map((col) => {
          if (col.id === activeColumn.id) {
            return {
              ...col,
              tasks: col.tasks.filter((t) => t.id !== activeId),
            };
          }
          if (col.id === overColumn.id) {
            return {
              ...col,
              tasks: [...col.tasks, { ...task, columnId: overColumn.id }],
            };
          }
          return col;
        }),
      };
    });
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !localBoard) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the column where the task was dropped
    const overColumn = findColumnById(overId) || findColumnByTaskId(overId);
    if (!overColumn) return;

    // Find the task's new position
    const overIndex = overColumn.tasks.findIndex((t) => t.id === overId);
    const newOrder = overIndex >= 0 ? overIndex : overColumn.tasks.length;

    // Send to backend
    moveTaskMutation.mutate({
      taskId: activeId,
      columnId: overColumn.id,
      order: newOrder,
    });
  };

  // Helper functions
  const findTaskById = (id: string): Task | undefined => {
    if (!localBoard) return undefined;
    for (const column of localBoard.columns) {
      const task = column.tasks.find((t) => t.id === id);
      if (task) return task;
    }
    return undefined;
  };

  const findColumnById = (id: string): Column | undefined => {
    return localBoard?.columns.find((col) => col.id === id);
  };

  const findColumnByTaskId = (taskId: string): Column | undefined => {
    return localBoard?.columns.find((col) =>
      col.tasks.some((t) => t.id === taskId)
    );
  };

  // Handle add task
  const handleAddTask = (columnId: string) => {
    setSelectedColumnId(columnId);
    setShowTaskModal(true);
  };

  // Handle create task submit
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() && selectedColumnId) {
      createTaskMutation.mutate({
        title: newTaskTitle,
        description: newTaskDescription || undefined,
        columnId: selectedColumnId,
      });
    }
  };

  // Show loading while hydrating
  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !localBoard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load board</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </Link>
            <h1 className="text-xl font-bold text-gray-900">{localBoard.title}</h1>
            {/* Role badge for shared boards */}
            {localBoard.role && localBoard.role !== 'owner' && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                localBoard.role === 'editor'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {localBoard.role}
              </span>
            )}
          </div>
          {/* Members button */}
          <BoardMembers boardId={boardId} isOwner={localBoard.isOwner !== false} />
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 overflow-x-auto p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6">
            {localBoard.columns
              .sort((a, b) => a.order - b.order)
              .map((column) => (
                <BoardColumn
                  key={column.id}
                  column={column}
                  onAddTask={handleAddTask}
                  onDeleteTask={(taskId) => deleteTaskMutation.mutate(taskId)}
                  onDeleteColumn={(columnId) => deleteColumnMutation.mutate(columnId)}
                  onRenameColumn={(columnId, title) => renameColumnMutation.mutate({ columnId, title })}
                  canDelete={localBoard.columns.length > 1}
                />
              ))}

            {/* Add Column Button */}
            <div className="min-w-[300px]">
              <button
                onClick={() => {
                  const title = prompt('Enter column title:');
                  if (title && title.trim()) {
                    createColumnMutation.mutate(title.trim());
                  }
                }}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                + Add Column
              </button>
            </div>
          </div>

          {/* Drag overlay - shows the dragged task */}
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-3">
                <TaskCard task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Create Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add New Task</h3>
            <form onSubmit={handleCreateTask}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Task title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="Add a description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setNewTaskTitle('');
                    setNewTaskDescription('');
                    setSelectedColumnId(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim() || createTaskMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {createTaskMutation.isPending ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
