import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../websockets/board.gateway';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';

/**
 * TasksService - Handles all task-related database operations
 * 
 * NOW WITH SHARING SUPPORT!
 * Board members with "editor" role can create/update/delete tasks.
 */
@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private boardGateway: BoardGateway,  // Inject WebSocket gateway
  ) {}

  /**
   * Helper: Check if user can edit a board (owner or editor member)
   */
  private async checkBoardEditAccess(boardId: string, userId: string): Promise<void> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const isOwner = board.ownerId === userId;
    const isEditor = board.members.some((m) => m.role === 'editor');

    if (!isOwner && !isEditor) {
      throw new ForbiddenException('You do not have permission to edit this board');
    }
  }

  /**
   * Create a new task in a column
   */
  async create(dto: CreateTaskDto, userId: string) {
    // Check if column exists
    const column = await this.prisma.column.findUnique({
      where: { id: dto.columnId },
      include: { board: true },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    // Check edit access (owner or editor member)
    await this.checkBoardEditAccess(column.boardId, userId);

    // Get the highest order in this column
    const maxOrder = await this.prisma.task.aggregate({
      where: { columnId: dto.columnId },
      _max: { order: true },
    });

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        columnId: dto.columnId,
        order: (maxOrder._max.order ?? -1) + 1,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId,
      },
      include: {
        assignee: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    // Emit WebSocket event
    this.boardGateway.emitTaskCreated(column.boardId, task);

    return {
      message: 'Task created successfully',
      task,
    };
  }

  /**
   * Get a single task by ID
   */
  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        column: {
          include: {
            board: {
              include: {
                members: {
                  where: { userId },
                },
              },
            },
          },
        },
        assignee: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check access: owner or member
    const board = task.column.board;
    const isOwner = board.ownerId === userId;
    const isMember = board.members.length > 0;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this task');
    }

    return { task };
  }

  /**
   * Update a task
   */
  async update(id: string, dto: UpdateTaskDto, userId: string) {
    // Check read access first
    const { task: existingTask } = await this.findOne(id, userId);

    // Check edit access (owner or editor member)
    await this.checkBoardEditAccess(existingTask.column.board.id, userId);

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assigneeId: dto.assigneeId,
      },
      include: {
        assignee: {
          select: { id: true, email: true, name: true },
        },
        column: {
          select: { boardId: true },
        },
      },
    });

    // Emit WebSocket event
    this.boardGateway.emitTaskUpdated(task.column.boardId, task);

    return {
      message: 'Task updated successfully',
      task,
    };
  }

  /**
   * Move a task to a different column/position
   * This is used for drag-and-drop functionality
   */
  async move(id: string, dto: MoveTaskDto, userId: string) {
    // Check access to current task
    const currentTask = await this.findOne(id, userId);

    // Check access to target column
    const targetColumn = await this.prisma.column.findUnique({
      where: { id: dto.columnId },
      include: { board: true },
    });

    if (!targetColumn) {
      throw new NotFoundException('Target column not found');
    }

    // Check edit access (owner OR editor member can move tasks)
    await this.checkBoardEditAccess(targetColumn.boardId, userId);

    // Update orders of tasks in target column
    // Shift tasks down to make room
    await this.prisma.task.updateMany({
      where: {
        columnId: dto.columnId,
        order: { gte: dto.order },
      },
      data: {
        order: { increment: 1 },
      },
    });

    // Move the task
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        columnId: dto.columnId,
        order: dto.order,
      },
      include: {
        assignee: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    // Emit WebSocket event
    this.boardGateway.emitTaskMoved(targetColumn.boardId, task);

    return {
      message: 'Task moved successfully',
      task,
    };
  }

  /**
   * Delete a task
   */
  async remove(id: string, userId: string) {
    // Check read access and get board ID
    const { task: existingTask } = await this.findOne(id, userId);
    const boardId = existingTask.column.board.id;

    // Check edit access (owner or editor member)
    await this.checkBoardEditAccess(boardId, userId);

    await this.prisma.task.delete({
      where: { id },
    });

    // Emit WebSocket event
    this.boardGateway.emitTaskDeleted(boardId, id);

    return {
      message: 'Task deleted successfully',
    };
  }
}
