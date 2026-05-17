import { Task } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * TaskCard Component - A draggable task card
 * 
 * Uses @dnd-kit/sortable for drag functionality
 */
interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskCard({ task, onEdit, onDelete }: TaskCardProps) {
  // useSortable hook provides drag-and-drop functionality
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  // Apply transform styles when dragging
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''
      }`}
    >
      {/* Task title */}
      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>

      {/* Task description */}
      {task.description && (
        <p className="text-gray-500 text-xs mt-1 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Task metadata */}
      <div className="flex items-center justify-between mt-2">
        {/* Due date */}
        {task.dueDate && (
          <span className="text-xs text-gray-400">
            📅 {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}

        {/* Assignee */}
        {task.assignee && (
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
            {task.assignee.name || task.assignee.email}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Delete this task?')) {
                onDelete(task.id);
              }
            }}
            className="text-xs text-red-600 hover:text-red-700"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
