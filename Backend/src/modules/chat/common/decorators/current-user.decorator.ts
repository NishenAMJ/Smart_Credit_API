import { createParamDecorator, ExecutionContext } from '@nestjs/common';


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
