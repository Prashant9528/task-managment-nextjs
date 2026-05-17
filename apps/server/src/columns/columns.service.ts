import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../websockets/board.gateway';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';

/**
 * ColumnsService - Handles all column-related database operations
 * 
 * NOW WITH SHARING SUPPORT!
 * Board members with "editor" role can create/update/delete columns.
 */
@Injectable()
export class ColumnsService {
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
   * Create a new column in a board
   */
  async create(dto: CreateColumnDto, userId: string) {
    // Check edit access (owner or editor member)
    await this.checkBoardEditAccess(dto.boardId, userId);

    // Get the highest order in this board
    const maxOrder = await this.prisma.column.aggregate({
      where: { boardId: dto.boardId },
      _max: { order: true },
    });

    const column = await this.prisma.column.create({
      data: {
        title: dto.title,
        boardId: dto.boardId,
        order: (maxOrder._max.order ?? -1) + 1,
      },
      include: {
        tasks: true,
      },
    });

    // Emit WebSocket event
    this.boardGateway.emitColumnCreated(dto.boardId, column);

    return {
      message: 'Column created successfully',
      column,
    };
  }

  /**
   * Get a single column by ID
   */
  async findOne(id: string, userId: string) {
    const column = await this.prisma.column.findUnique({
      where: { id },
      include: {
        board: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
        tasks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!column) {
      throw new NotFoundException('Column not found');
    }

    // Check access: owner or member
    const isOwner = column.board.ownerId === userId;
    const isMember = column.board.members.length > 0;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this column');
    }

    return { column };
  }

  /**
   * Update a column's title
   */
  async update(id: string, dto: UpdateColumnDto, userId: string) {
    // Check access (findOne already checks membership)
    const { column: existingColumn } = await this.findOne(id, userId);

    // Additionally check edit permission
    await this.checkBoardEditAccess(existingColumn.boardId, userId);

    const column = await this.prisma.column.update({
      where: { id },
      data: {
        title: dto.title,
      },
    });

    // Emit WebSocket event
    this.boardGateway.emitColumnUpdated(existingColumn.boardId, column);

    return {
      message: 'Column updated successfully',
      column,
    };
  }

  /**
   * Delete a column and all its tasks
   */
  async remove(id: string, userId: string) {
    // Check access (findOne checks membership)
    const { column } = await this.findOne(id, userId);
    const boardId = column.boardId;

    // Additionally check edit permission
    await this.checkBoardEditAccess(boardId, userId);

    // Check if this is the last column
    const columnCount = await this.prisma.column.count({
      where: { boardId },
    });

    if (columnCount <= 1) {
      throw new BadRequestException('Cannot delete the last column. A board must have at least one column.');
    }

    await this.prisma.column.delete({
      where: { id },
    });

    // Emit WebSocket event
    this.boardGateway.emitColumnDeleted(boardId, id);

    return {
      message: 'Column deleted successfully',
    };
  }
}
