import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

/**
 * BoardsService - Handles all board-related database operations
 * 
 * NOW WITH SHARING SUPPORT!
 * Users can see boards they own AND boards shared with them.
 */
@Injectable()
export class BoardsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new board with default columns
   * Also creates 3 default columns: To Do, In Progress, Done
   */
  async create(dto: CreateBoardDto, userId: string) {
    const board = await this.prisma.board.create({
      data: {
        title: dto.title,
        ownerId: userId,
        // Create default columns when board is created
        columns: {
          create: [
            { title: 'To Do', order: 0 },
            { title: 'In Progress', order: 1 },
            { title: 'Done', order: 2 },
          ],
        },
      },
      include: {
        columns: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return {
      message: 'Board created successfully',
      board,
    };
  }

  /**
   * Get all boards the user has access to
   * This includes: boards they OWN + boards SHARED with them
   */
  async findAll(userId: string) {
    // Get boards user owns
    const ownedBoards = await this.prisma.board.findMany({
      where: { ownerId: userId },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: {
          select: { columns: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get boards shared with user
    const sharedMemberships = await this.prisma.boardMember.findMany({
      where: { userId },
      include: {
        board: {
          include: {
            owner: {
              select: { id: true, email: true, name: true },
            },
            columns: {
              orderBy: { order: 'asc' },
              include: {
                tasks: {
                  orderBy: { order: 'asc' },
                },
              },
            },
            _count: {
              select: { columns: true },
            },
          },
        },
      },
    });

    // Mark owned boards vs shared boards
    const ownedWithFlag = ownedBoards.map((b) => ({ ...b, isOwner: true, role: 'owner' }));
    const sharedWithFlag = sharedMemberships.map((m) => ({
      ...m.board,
      isOwner: false,
      role: m.role,
    }));

    return {
      boards: [...ownedWithFlag, ...sharedWithFlag],
    };
  }

  /**
   * Get a single board by ID
   * User must be owner OR member to access
   */
  async findOne(id: string, userId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
        members: {
          where: { userId },
          select: { role: true },
        },
        columns: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' },
              include: {
                assignee: {
                  select: { id: true, email: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if user is owner OR member
    const isOwner = board.ownerId === userId;
    const isMember = board.members.length > 0;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have access to this board');
    }

    // Add role info to response
    const role = isOwner ? 'owner' : board.members[0]?.role || 'viewer';

    return {
      board: {
        ...board,
        isOwner,
        role,
      },
    };
  }

  /**
   * Update a board's title
   * ONLY OWNER can update the board
   */
  async update(id: string, dto: UpdateBoardDto, userId: string) {
    const { board } = await this.findOne(id, userId);

    // Only owner can update
    if (!board.isOwner) {
      throw new ForbiddenException('Only the board owner can update the board');
    }

    const updated = await this.prisma.board.update({
      where: { id },
      data: { title: dto.title },
    });

    return {
      message: 'Board updated successfully',
      board: updated,
    };
  }

  /**
   * Delete a board and all its columns/tasks (cascade)
   * ONLY OWNER can delete the board
   */
  async remove(id: string, userId: string) {
    const { board } = await this.findOne(id, userId);

    // Only owner can delete
    if (!board.isOwner) {
      throw new ForbiddenException('Only the board owner can delete the board');
    }

    await this.prisma.board.delete({
      where: { id },
    });

    return {
      message: 'Board deleted successfully',
    };
  }
}
