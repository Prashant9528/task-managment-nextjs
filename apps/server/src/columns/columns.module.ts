import { Module } from '@nestjs/common';
import { ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';
import { WebsocketsModule } from '../websockets/websockets.module';

/**
 * ColumnsModule - Manages column-related functionality
 */
@Module({
  imports: [WebsocketsModule],  // Import to use BoardGateway
  controllers: [ColumnsController],
  providers: [ColumnsService],
  exports: [ColumnsService],
})
export class ColumnsModule {}
