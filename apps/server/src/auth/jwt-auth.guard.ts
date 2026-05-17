import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard - Protects routes from unauthenticated access
 * 
 * Usage: Add @UseGuards(JwtAuthGuard) above controller or route
 * 
 * What happens:
 * 1. Request comes in
 * 2. Guard checks for JWT token in header
 * 3. If valid token → allows request through
 * 4. If invalid/missing → returns 401 Unauthorized
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
