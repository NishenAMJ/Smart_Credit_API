import { createParamDecorator, ExecutionContext } from '@nestjs/common';


//This file creates custom decorators to easily get the current user's ID
 //from incoming requests (HTTP and WebSocket) in a NestJS app.

 //Instead of manually writing `req.user.id` everywhere, we use these decorators
 //to keep the code clean and reusable.

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    // Adjust this path to match what your parent auth middleware sets
    return request.user?.id ?? request.headers['x-user-id'];
  },
);

//current user-Used in controllers (REST APIs).
 // It extracts the userId from the request object.


export const WsCurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const client = ctx.switchToWs().getClient();
    return client.data?.userId ?? client.handshake?.auth?.userId;
  },
);

// Used in WebSocket gateways.
 // Extracts userId from the socket connection.
 //Gets the WebSocket client.
 // Tries to read: client.data.userId (set during handshake).
 // If not available, falls back to: client.handshake.auth.userId.


 //decorators used to Avoids repeating request parsing logic everywhere.
 // Keeps controllers clean and readable.