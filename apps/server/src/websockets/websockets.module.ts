import { Module, Global } from '@nestjs/common';
import { BoardGateway } from './board.gateway';
import { NotificationGateway } from './notification.gateway';

/**
 * WebsocketsModule - Real-time communication
 * 
 * Includes:
 * - BoardGateway: Real-time board updates (tasks, columns)
 * - NotificationGateway: Real-time notifications (invitations)
 * 
 * @Global() - Makes gateways available everywhere
 */
@Global()
@Module({
  providers: [BoardGateway, NotificationGateway],
  exports: [BoardGateway, NotificationGateway],
})
export class WebsocketsModule {}
