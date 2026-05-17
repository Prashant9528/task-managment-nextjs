import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendInvitationDto, RespondInvitationDto } from './dto/invitation.dto';
import { NotificationGateway } from '../websockets/notification.gateway';

/**
 * InvitationsService - Handles board invitation logic
 * 
 * FLOW:
 * 1. Owner sends invitation → receiver gets real-time notification
 * 2. Receiver accepts/rejects → becomes member if accepted
 */
@Injectable()
export class InvitationsService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) {}

  /**
   * Get all users (for the user picker dropdown)
   * Excludes the current user
   */
  async getAllUsers(currentUserId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return { users };
  }

  /**
   * Send an invitation to a user
   * Only board owner can send invitations
   */
  async sendInvitation(dto: SendInvitationDto, senderId: string) {
    // 1. Check if board exists and sender is owner
    const board = await this.prisma.board.findUnique({
      where: { id: dto.boardId },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.ownerId !== senderId) {
      throw new ForbiddenException('Only board owner can send invitations');
    }

    // 2. Check if user exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    // 3. Can't invite yourself
    if (dto.userId === senderId) {
      throw new BadRequestException('You cannot invite yourself');
    }

    // 4. Check if already a member
    const existingMember = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: dto.boardId,
          userId: dto.userId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this board');
    }

    // 5. Check if there's already a pending invitation
    const existingInvitation = await this.prisma.invitation.findFirst({
      where: {
        boardId: dto.boardId,
        receiverId: dto.userId,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      throw new ConflictException('Invitation already sent to this user');
    }

    // 6. Create the invitation
    const invitation = await this.prisma.invitation.create({
      data: {
        boardId: dto.boardId,
        senderId: senderId,
        receiverId: dto.userId,
        role: dto.role || 'editor',
      },
      include: {
        board: { select: { id: true, title: true } },
        sender: { select: { id: true, email: true, name: true } },
        receiver: { select: { id: true, email: true, name: true } },
      },
    });

    // 7. Send real-time notification to receiver
    this.notificationGateway.sendInvitationNotification(dto.userId, invitation);

    return {
      message: 'Invitation sent successfully',
      invitation,
    };
  }

  /**
   * Get pending invitations for current user
   */
  async getMyInvitations(userId: string) {
    const invitations = await this.prisma.invitation.findMany({
      where: {
        receiverId: userId,
        status: 'pending',
      },
      include: {
        board: { select: { id: true, title: true } },
        sender: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { invitations };
  }

  /**
   * Respond to an invitation (accept or reject)
   */
  async respondToInvitation(
    invitationId: string,
    dto: RespondInvitationDto,
    userId: string,
  ) {
    // 1. Find the invitation
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        board: { select: { id: true, title: true } },
        sender: { select: { id: true, email: true, name: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // 2. Check if user is the receiver
    if (invitation.receiverId !== userId) {
      throw new ForbiddenException('This invitation is not for you');
    }

    // 3. Check if already responded
    if (invitation.status !== 'pending') {
      throw new BadRequestException('Invitation has already been responded to');
    }

    if (dto.action === 'accept') {
      // Accept: Create membership and update invitation
      await this.prisma.$transaction([
        this.prisma.boardMember.create({
          data: {
            boardId: invitation.boardId,
            userId: userId,
            role: invitation.role,
          },
        }),
        this.prisma.invitation.update({
          where: { id: invitationId },
          data: { status: 'accepted' },
        }),
      ]);

      // Notify sender that invitation was accepted
      this.notificationGateway.sendInvitationResponse(
        invitation.senderId,
        invitation,
        'accepted',
      );

      return {
        message: 'Invitation accepted! You now have access to the board.',
        boardId: invitation.boardId,
      };
    } else {
      // Reject: Just update status
      await this.prisma.invitation.update({
        where: { id: invitationId },
        data: { status: 'rejected' },
      });

      // Notify sender that invitation was rejected
      this.notificationGateway.sendInvitationResponse(
        invitation.senderId,
        invitation,
        'rejected',
      );

      return {
        message: 'Invitation rejected',
      };
    }
  }

  /**
   * Cancel a sent invitation (for board owner)
   */
  async cancelInvitation(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { board: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.board.ownerId !== userId) {
      throw new ForbiddenException('Only board owner can cancel invitations');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Can only cancel pending invitations');
    }

    await this.prisma.invitation.delete({
      where: { id: invitationId },
    });

    return { message: 'Invitation cancelled' };
  }

  /**
   * Get sent invitations for a board (for owner)
   */
  async getBoardInvitations(boardId: string, userId: string) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.ownerId !== userId) {
      throw new ForbiddenException('Only board owner can view invitations');
    }

    const invitations = await this.prisma.invitation.findMany({
      where: {
        boardId,
        status: 'pending',
      },
      include: {
        receiver: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { invitations };
  }
}
