import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

/**
 * JwtStrategy - Validates JWT tokens
 * 
 * When a request comes in with a token:
 * 1. Extract token from "Authorization: Bearer <token>" header
 * 2. Verify it was signed with our secret
 * 3. Call validate() with the token's payload
 * 4. Return the user object (attached to request.user)
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      // Where to find the token in the request
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Don't accept expired tokens
      ignoreExpiration: false,
      // The secret key to verify tokens (must match when signing)
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  /**
   * Called after token is verified
   * @param payload - The data inside the token (userId, email)
   * @returns User object - attached to request.user
   */
  async validate(payload: { sub: string; email: string }) {
    // Find the user in database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // This object is attached to request.user
    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  }
}
