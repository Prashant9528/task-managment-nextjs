import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * NotificationGateway - Real-time notifications for invitations
 * 
 * HOW IT WORKS:
 * =============
 * 1. When a user logs in, they connect to this WebSocket
 * 2. Each user joins a personal "room" based on their userId
 * 3. When someone sends them an invitation, we emit to their room
 * 4. Their browser receives the notification in real-time!
 */
@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // Track which socket belongs to which user
  private userSockets: Map<string, Set<string>> = new Map();

  /**
   * When client connects, extract userId and join their personal room
   */
  handleConnection(client: Socket) {
    // Get userId from auth token (sent during connection)
    const userId = client.handshake.auth?.userId;
    
    if (userId) {
      // Add socket to user's set
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);
      
      // Join personal room
      client.join(`user:${userId}`);
      console.log(`🔔 User ${userId} connected for notifications (socket: ${client.id})`);
    }
  }

  /**
   * When client disconnects, remove from tracking
   */
  handleDisconnect(client: Socket) {
    const userId = client.handshake.auth?.userId;
    
    if (userId && this.userSockets.has(userId)) {
      this.userSockets.get(userId)!.delete(client.id);
      if (this.userSockets.get(userId)!.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    console.log(`🔔 Client disconnected: ${client.id}`);
  }

  /**
   * Send invitation notification to a user
   */
  sendInvitationNotification(userId: string, invitation: any) {
    console.log(`📨 Sending invitation notification to user ${userId}`);
    this.server.to(`user:${userId}`).emit('invitation:received', {
      type: 'invitation',
      invitation,
      message: `${invitation.sender.name || invitation.sender.email} invited you to "${invitation.board.title}"`,
    });
  }

  /**
   * Notify sender about invitation response
   */
  sendInvitationResponse(senderId: string, invitation: any, status: 'accepted' | 'rejected') {
    console.log(`📨 Sending invitation response to user ${senderId}`);
    this.server.to(`user:${senderId}`).emit('invitation:response', {
      type: 'invitation_response',
      invitation,
      status,
      message: status === 'accepted'
        ? `Your invitation was accepted!`
        : `Your invitation was rejected`,
    });
  }

  /**
   * Send a generic notification to a user
   */
  sendNotification(userId: string, notification: { type: string; message: string; data?: any }) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }
}
