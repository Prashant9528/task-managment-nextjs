/**
 * TypeScript types for our application
 * These match the data shapes from our backend
 */

export interface User {
  id: string;
  email: string;
  name: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  order: number;
  dueDate: string | null;
  columnId: string;
  assigneeId: string | null;
  assignee: User | null;
  createdAt: string;
  updatedAt: string;
}

export interface Column {
  id: string;
  title: string;
  order: number;
  boardId: string;
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

// Board member (for shared boards)
export interface BoardMember {
  id: string;
  role: 'viewer' | 'editor';
  userId: string;
  user: User;
  createdAt: string;
}

export interface Board {
  id: string;
  title: string;
  ownerId: string;
  owner?: User;           // Owner info (for shared boards display)
  columns: Column[];
  members?: BoardMember[]; // Members of the board
  isOwner?: boolean;      // Is current user the owner?
  role?: string;          // Current user's role: 'owner' | 'editor' | 'viewer'
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
}

export interface BoardsResponse {
  boards: Board[];
}

export interface BoardResponse {
  board: Board;
}

export interface TaskResponse {
  message: string;
  task: Task;
}
