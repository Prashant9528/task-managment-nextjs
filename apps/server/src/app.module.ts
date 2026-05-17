import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BoardsModule } from './boards/boards.module';
import { TasksModule } from './tasks/tasks.module';
import { ColumnsModule } from './columns/columns.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { BoardMembersModule } from './board-members/board-members.module';
import { InvitationsModule } from './invitations/invitations.module';

@Module({
  imports: [
    PrismaModule,         // Database connection - available globally
    AuthModule,           // Authentication (register, login, JWT)
    BoardsModule,         // Kanban boards CRUD
    TasksModule,          // Tasks CRUD + move (drag-and-drop)
    ColumnsModule,        // Columns CRUD
    WebsocketsModule,     // Real-time updates
    BoardMembersModule,   // Board sharing & members
    InvitationsModule,    // Board invitations with notifications
  ],
  controllers: [],
})
export class AppModule {}
