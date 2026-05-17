import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

/**
 * AuthModule - Authentication feature module
 * 
 * Imports:
 * - PassportModule: Authentication framework
 * - JwtModule: JWT token handling
 * 
 * Controllers: Handle HTTP requests
 * Providers: Services and strategies
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' }, // Token expires in 7 days
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService], // Other modules can use AuthService
})
export class AuthModule {}
