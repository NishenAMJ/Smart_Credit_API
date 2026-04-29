import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 
 
  This is a custom WebSocket exception filter in NestJS.
  It catches errors that happen inside WebSocket handlers
  and sends a clean error message back to the client.
 
  Instead of crashing or showing messy errors, this ensures:
  Errors are logged properly
  Clients receive a simple error response
 **/

@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: WsException | Error, host: ArgumentsHost) {
    const client: Socket = host.switchToWs().getClient();
    const message =
      exception instanceof WsException
        ? exception.getError()
        : exception.message;

    this.logger.error(`WS error [${client.id}]: ${message}`);
    client.emit('error', { message });
  }
}

// Prevents server crashes from unhandled WebSocket errors