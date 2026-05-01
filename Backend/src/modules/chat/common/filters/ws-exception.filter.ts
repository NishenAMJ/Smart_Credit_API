import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WsExceptionFilter
 * Catches all WebSocket handler exceptions and emits a structured
 * 'error' event back to the client instead of crashing the gateway.
 */
@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: WsException | Error, host: ArgumentsHost) {
    const client: Socket = host.switchToWs().getClient();
    const message =
      exception instanceof WsException
        ? exception.getError()
        : exception.message;

    this.logger.error(`WS error [${client.id}]: ${JSON.stringify(message)}`);
    client.emit('error', { message });
  }
}