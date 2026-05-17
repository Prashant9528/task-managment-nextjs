import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { WebsocketsModule } from '../websockets/websockets.module';

/**
 * TasksModule - Manages task-related functionality
 */
@Module({
  imports: [WebsocketsModule],  // Import to use BoardGateway
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
