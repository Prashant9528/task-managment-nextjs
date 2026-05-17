import { Module } from '@nestjs/common';
import { BoardMembersController } from './board-members.controller';
import { BoardMembersService } from './board-members.service';

/**
 * BoardMembersModule - Manages board sharing functionality
 * 
 * This module handles:
 * - Inviting users to boards
 * - Managing member roles (viewer/editor)
 * - Removing members from boards
 */
@Module({
  controllers: [BoardMembersController],
  providers: [BoardMembersService],
  exports: [BoardMembersService], // Export so other modules can check access
})
export class BoardMembersModule {}
