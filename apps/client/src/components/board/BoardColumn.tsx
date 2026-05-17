import { Column, Task } from '@/types';
import { TaskCard } from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

/**
 * BoardColumn Component - A column containing tasks
 */
interface BoardColumnProps {
  column: Column;
  onAddTask: (columnId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onRenameColumn?: (columnId: string, newTitle: string) => void;
  canDelete?: boolean; // Don't allow deleting if only 1 column
}

export function BoardColumn({
  column,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDeleteColumn,
  onRenameColumn,
  canDelete = true,
}: BoardColumnProps) {
  // useDroppable makes this column a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  // Get task IDs for SortableContext
  const taskIds = column.tasks.map((task) => task.id);

  // Handle rename
  const handleRename = () => {
    const newTitle = prompt('Enter new column title:', column.title);
    if (newTitle && newTitle.trim() && newTitle !== column.title) {
      onRenameColumn?.(column.id, newTitle.trim());
    }
  };

  return (
    <div
      className={`bg-gray-100 rounded-lg p-4 min-w-[300px] max-w-[300px] flex flex-col max-h-[calc(100vh-200px)] ${
        isOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
      }`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-4">
        <h3 
          className="font-semibold text-gray-700 cursor-pointer hover:text-blue-600"
          onClick={handleRename}
          title="Click to rename"
        >
          {column.title}
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({column.tasks.length})
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAddTask(column.id)}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            title="Add task"
          >
            +
          </button>
          {canDelete && onDeleteColumn && (
            <button
              onClick={() => {
                if (confirm(`Delete "${column.title}" column and all its tasks?`)) {
                  onDeleteColumn(column.id);
                }
              }}
              className="text-gray-400 hover:text-red-600 text-sm"
              title="Delete column"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tasks list - scrollable */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto space-y-3 min-h-[100px]"
      >
        <SortableContext
          items={taskIds}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {column.tasks.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No tasks yet
          </div>
        )}
      </div>
    </div>
  );
}
