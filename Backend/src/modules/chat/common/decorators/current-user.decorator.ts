import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
  @CurrentUser() — HTTP
  Extracts userId from req.user.id (set by JWT guard) or
  falls back to x-user-id header for development/legacy support.
  When real JWT auth is wired up, req.user.id will take over automatically.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.id ?? request.headers['x-user-id'];
  },
);

/**
  @WsCurrentUser() — WebSocket
  Extracts userId from socket.data.userId (set in handleConnection).
 */
export const WsCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const client = ctx.switchToWs().getClient();
    return client.data?.userId ?? client.handshake?.auth?.userId;
  },
);
