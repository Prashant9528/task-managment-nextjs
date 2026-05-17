import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - Handles database connection
 * 
 * @Injectable() - Tells NestJS this can be injected into other classes
 * OnModuleInit - Connect to database when app starts
 * OnModuleDestroy - Disconnect when app stops
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  
  // Called automatically when NestJS starts
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  // Called automatically when NestJS stops
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('❌ Database disconnected');
  }
}
