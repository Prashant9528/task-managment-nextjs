import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * BoardGateway - WebSocket gateway for real-time board updates
 * 
 * How it works:
 * 1. Client connects and joins a "room" for their board
 * 2. When someone makes changes, server broadcasts to everyone in that room
 * 3. All connected clients see the update instantly
 * 
 * @WebSocketGateway - Tells NestJS this handles WebSocket connections
 * cors: { origin: '*' } - Allow connections from any origin (for development)
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;  // '!' tells TypeScript this will be initialized by the decorator

  // Track connected clients (optional, for debugging)
  private connectedClients: Map<string, string> = new Map();

  /**
   * Called when a client connects
   */
  handleConnection(client: Socket) {
    console.log(`🔌 Client connected: ${client.id}`);
  }

  /**
   * Called when a client disconnects
   */
  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  /**
   * Client joins a board "room"
   * This way they only receive updates for boards they're viewing
   */
  @SubscribeMessage('board:join')
  handleJoinBoard(
    @MessageBody() boardId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(boardId);
    this.connectedClients.set(client.id, boardId);
    console.log(`👤 Client ${client.id} joined board: ${boardId}`);
    return { event: 'board:joined', data: boardId };
  }

  /**
   * Client leaves a board "room"
   */
  @SubscribeMessage('board:leave')
  handleLeaveBoard(
    @MessageBody() boardId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(boardId);
    this.connectedClients.delete(client.id);
    console.log(`👤 Client ${client.id} left board: ${boardId}`);
    return { event: 'board:left', data: boardId };
  }

  /**
   * Emit task created event to all clients in a board room
   */
  emitTaskCreated(boardId: string, task: any) {
    this.server.to(boardId).emit('task:created', task);
  }

  /**
   * Emit task updated event
   */
  emitTaskUpdated(boardId: string, task: any) {
    this.server.to(boardId).emit('task:updated', task);
  }

  /**
   * Emit task moved event
   */
  emitTaskMoved(boardId: string, task: any) {
    this.server.to(boardId).emit('task:moved', task);
  }

  /**
   * Emit task deleted event
   */
  emitTaskDeleted(boardId: string, taskId: string) {
    this.server.to(boardId).emit('task:deleted', { taskId });
  }

  /**
   * Emit column created event
   */
  emitColumnCreated(boardId: string, column: any) {
    this.server.to(boardId).emit('column:created', column);
  }

  /**
   * Emit column updated event
   */
  emitColumnUpdated(boardId: string, column: any) {
    this.server.to(boardId).emit('column:updated', column);
  }

  /**
   * Emit column deleted event
   */
  emitColumnDeleted(boardId: string, columnId: string) {
    this.server.to(boardId).emit('column:deleted', { columnId });
  }

  /**
   * Emit board updated event (e.g., title change)
   */
  emitBoardUpdated(boardId: string, board: any) {
    this.server.to(boardId).emit('board:updated', board);
  }
}
