import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InvitationsService } from './invitations.service';
import { SendInvitationDto, RespondInvitationDto } from './dto/invitation.dto';

/**
 * InvitationsController - API endpoints for board invitations
 * 
 * ENDPOINTS:
 * ==========
 * GET    /invitations/users         - Get all users (for invite picker)
 * GET    /invitations/my            - Get my pending invitations
 * GET    /invitations/board/:id     - Get pending invitations for a board
 * POST   /invitations               - Send an invitation
 * PATCH  /invitations/:id/respond   - Accept or reject invitation
 * DELETE /invitations/:id           - Cancel a sent invitation
 */
@ApiTags('Invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * Get all users (for the invite dropdown)
   */
  @Get('users')
  @ApiOperation({ summary: 'Get all users for invite picker' })
  async getAllUsers(@Request() req: any) {
    return this.invitationsService.getAllUsers(req.user.id);
  }

  /**
   * Get my pending invitations
   */
  @Get('my')
  @ApiOperation({ summary: 'Get my pending invitations' })
  async getMyInvitations(@Request() req: any) {
    return this.invitationsService.getMyInvitations(req.user.id);
  }

  /**
   * Get pending invitations for a board (owner only)
   */
  @Get('board/:boardId')
  @ApiOperation({ summary: 'Get pending invitations for a board' })
  async getBoardInvitations(
    @Param('boardId') boardId: string,
    @Request() req: any,
  ) {
    return this.invitationsService.getBoardInvitations(boardId, req.user.id);
  }

  /**
   * Send an invitation
   */
  @Post()
  @ApiOperation({ summary: 'Send a board invitation' })
  @ApiResponse({ status: 201, description: 'Invitation sent' })
  async sendInvitation(@Body() dto: SendInvitationDto, @Request() req: any) {
    return this.invitationsService.sendInvitation(dto, req.user.id);
  }

  /**
   * Respond to an invitation (accept/reject)
   */
  @Patch(':id/respond')
  @ApiOperation({ summary: 'Accept or reject an invitation' })
  async respondToInvitation(
    @Param('id') id: string,
    @Body() dto: RespondInvitationDto,
    @Request() req: any,
  ) {
    return this.invitationsService.respondToInvitation(id, dto, req.user.id);
  }

  /**
   * Cancel a sent invitation
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a sent invitation' })
  async cancelInvitation(@Param('id') id: string, @Request() req: any) {
    return this.invitationsService.cancelInvitation(id, req.user.id);
  }
}
