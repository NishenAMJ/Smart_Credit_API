import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @CurrentUser() — HTTP context
 * ──────────────────────────────────────────────────────────────
 * Extracts the authenticated userId from the incoming HTTP request.
 *
 * Your JWT / auth guard (in the parent AppModule) should populate
 * req.user = { id: string } before the request reaches any chat controller.
 *
 * Falls back to the x-user-id header for testing without a full auth guard.
 *
 * Usage:
 *   @Get()
 *   listConversations(@CurrentUser() userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id ?? request.headers['x-user-id'];
  },
);

/**
 * @WsCurrentUser() — WebSocket context
 * ──────────────────────────────────────────────────────────────
 * Extracts the userId from a Socket.IO socket for WebSocket handlers.
 *
 * The ChatGateway's handleConnection sets socket.data.userId on connect
 * (reading from handshake.auth.userId sent by the mobile app).
 *
 * Usage in a @SubscribeMessage handler:
 *   handleTyping(@WsCurrentUser() userId: string, ...) { ... }
 */
export const WsCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const client = ctx.switchToWs().getClient();
    return client.data?.userId ?? client.handshake?.auth?.userId;
  },
);