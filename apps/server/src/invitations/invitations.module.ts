import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { WebsocketsModule } from '../websockets/websockets.module';

/**
 * InvitationsModule - Handles board invitation functionality
 * 
 * Features:
 * - Send invitations to users
 * - Real-time notifications via WebSocket
 * - Accept/reject invitations
 */
@Module({
  imports: [WebsocketsModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
