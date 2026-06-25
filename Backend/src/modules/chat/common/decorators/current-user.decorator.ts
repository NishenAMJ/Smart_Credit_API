import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() — HTTP context
 *
 * Reads the authenticated user's ID from the JWT payload.
 * JwtStrategy.validate() returns the raw payload as req.user.
 * The JWT is signed with { sub: user.uid, email, role } so we read sub.
 *
 * No fallback to x-user-id header — real auth only.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.sub;
  },
);

/**
 * @CurrentUserRole() — HTTP context
 *
 * Reads the authenticated user's active role from the JWT payload.
 * Used by routes that need role-aware logic (e.g. lender vs borrower).
 */
export const CurrentUserRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.role;
  },
);

/**
 * @WsCurrentUser() — WebSocket context
 *
 * Reads userId from socket.data.userId which is set in
 * ChatGateway.handleConnection() after verifying the JWT.
 */
export const WsCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const client = ctx.switchToWs().getClient();
    return client.data?.userId;
  },
);