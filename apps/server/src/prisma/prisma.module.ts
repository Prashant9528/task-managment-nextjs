import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule - Makes PrismaService available throughout the app
 * 
 * @Global() - This module is available everywhere without importing
 * @Module() - Defines a NestJS module
 */
@Global()
@Module({
  providers: [PrismaService],  // Register the service
  exports: [PrismaService],    // Allow other modules to use it
})
export class PrismaModule {}
