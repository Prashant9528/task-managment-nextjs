import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() Decorator
 * 
 * Instead of writing: request.user
 * You can write: @CurrentUser() user
 * 
 * Usage in controller:
 * @Get('profile')
 * getProfile(@CurrentUser() user) {
 *   return user; // { id, email, name }
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
