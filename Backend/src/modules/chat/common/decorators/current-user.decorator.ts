import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the userId injected by the parent project's auth middleware.
 *
 * The parent project sets req.user = { id: string } via its own JWT guard
 * before requests reach this chat service. Use this decorator instead of
 * touching req directly so the extraction point is one place.
 *
 * Usage:
 *   @Get()
 *   getConversations(@CurrentUser() userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // Adjust this path to match what your parent auth middleware sets
    return request.user?.id ?? request.headers['x-user-id'];
  },
);

/**
 * Same but for WebSocket context.
 * The parent auth system should attach userId to socket.data on handshake.
 */
export const WsCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const client = ctx.switchToWs().getClient();
    return client.data?.userId ?? client.handshake?.auth?.userId;
  },
);