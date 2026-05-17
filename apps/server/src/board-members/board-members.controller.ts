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
import { BoardMembersService } from './board-members.service';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

/**
 * BoardMembersController - API endpoints for board sharing
 * 
 * ENDPOINTS:
 * ==========
 * POST   /board-members/invite     - Invite a user to your board
 * GET    /board-members/board/:id  - Get all members of a board
 * PATCH  /board-members/:id        - Update member's role
 * DELETE /board-members/:id        - Remove member from board
 */
@ApiTags('Board Members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('board-members')
export class BoardMembersController {
  constructor(private readonly boardMembersService: BoardMembersService) {}

  /**
   * Invite a user to a board by email
   */
  @Post('invite')
  @ApiOperation({ summary: 'Invite a user to a board' })
  @ApiResponse({ status: 201, description: 'Member invited successfully' })
  @ApiResponse({ status: 404, description: 'Board or user not found' })
  @ApiResponse({ status: 403, description: 'Only owner can invite' })
  @ApiResponse({ status: 409, description: 'User already a member' })
  async inviteMember(@Body() dto: InviteMemberDto, @Request() req: any) {
    return this.boardMembersService.inviteMember(dto, req.user.id);
  }

  /**
   * Get all members of a board
   */
  @Get('board/:boardId')
  @ApiOperation({ summary: 'Get all members of a board' })
  @ApiResponse({ status: 200, description: 'Returns owner and members list' })
  async getBoardMembers(@Param('boardId') boardId: string, @Request() req: any) {
    return this.boardMembersService.getBoardMembers(boardId, req.user.id);
  }

  /**
   * Update a member's role (viewer/editor)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update member role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 403, description: 'Only owner can update roles' })
  async updateMemberRole(
    @Param('id') id: string,
    @Body() dto: UpdateMemberDto,
    @Request() req: any,
  ) {
    return this.boardMembersService.updateMemberRole(id, dto, req.user.id);
  }

  /**
   * Remove a member from a board
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Remove member from board' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 403, description: 'Cannot remove this member' })
  async removeMember(@Param('id') id: string, @Request() req: any) {
    return this.boardMembersService.removeMember(id, req.user.id);
  }
}
