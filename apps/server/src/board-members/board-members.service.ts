import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

/**
 * BoardMembersService - Handles board sharing logic
 * 
 * WHAT DOES THIS DO?
 * ==================
 * - Invite users to boards by email
 * - Remove users from boards
 * - Update user roles (viewer/editor)
 * - Check if user has access to a board
 */
@Injectable()
export class BoardMembersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Invite a user to a board by their email
   * Only board owner can invite members
   */
  async inviteMember(dto: InviteMemberDto, inviterId: string) {
    // 1. Check if board exists and inviter is the owner
    const board = await this.prisma.board.findUnique({
      where: { id: dto.boardId },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.ownerId !== inviterId) {
      throw new ForbiddenException('Only board owner can invite members');
    }

    // 2. Find the user to invite by email
    const userToInvite = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!userToInvite) {
      throw new NotFoundException('User with this email not found. They need to register first.');
    }

    // 3. Can't invite yourself
    if (userToInvite.id === inviterId) {
      throw new BadRequestException('You cannot invite yourself to your own board');
    }

    // 4. Check if already a member
    const existingMember = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: dto.boardId,
          userId: userToInvite.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this board');
    }

    // 5. Create the membership
    const member = await this.prisma.boardMember.create({
      data: {
        boardId: dto.boardId,
        userId: userToInvite.id,
        role: dto.role || 'editor',
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return {
      message: 'Member invited successfully',
      member,
    };
  }

  /**
   * Get all members of a board
   * Both owner and members can see the member list
   */
  async getBoardMembers(boardId: string, userId: string) {
    // Check if user has access to this board
    const hasAccess = await this.userHasAccess(boardId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this board');
    }

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        owner: {
          select: { id: true, email: true, name: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    return {
      owner: board.owner,
      members: board.members,
    };
  }

  /**
   * Update a member's role
   * Only board owner can update roles
   */
  async updateMemberRole(memberId: string, dto: UpdateMemberDto, userId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: { id: memberId },
      include: { board: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    if (member.board.ownerId !== userId) {
      throw new ForbiddenException('Only board owner can update member roles');
    }

    const updated = await this.prisma.boardMember.update({
      where: { id: memberId },
      data: { role: dto.role },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    return {
      message: 'Member role updated',
      member: updated,
    };
  }

  /**
   * Remove a member from a board
   * Owner can remove anyone, members can remove themselves
   */
  async removeMember(memberId: string, userId: string) {
    const member = await this.prisma.boardMember.findUnique({
      where: { id: memberId },
      include: { board: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const isOwner = member.board.ownerId === userId;
    const isSelf = member.userId === userId;

    if (!isOwner && !isSelf) {
      throw new ForbiddenException('You can only remove yourself or be the board owner');
    }

    await this.prisma.boardMember.delete({
      where: { id: memberId },
    });

    return {
      message: 'Member removed from board',
    };
  }

  /**
   * Check if a user has access to a board (owner OR member)
   * This is used by other services to verify access
   */
  async userHasAccess(boardId: string, userId: string): Promise<boolean> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!board) return false;

    // User is owner OR is a member
    return board.ownerId === userId || board.members.length > 0;
  }

  /**
   * Check if user can edit (owner OR editor member)
   */
  async userCanEdit(boardId: string, userId: string): Promise<boolean> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: {
          where: { userId },
        },
      },
    });

    if (!board) return false;

    // Owner can always edit
    if (board.ownerId === userId) return true;

    // Check if member with editor role
    const membership = board.members[0];
    return membership?.role === 'editor';
  }
}
