import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * WsExceptionFilter
 * ──────────────────────────────────────────────────────────────
 * Catches all exceptions thrown inside WebSocket (Socket.IO) handlers
 * and emits a structured 'error' event back to the offending client
 * instead of crashing the gateway or silently swallowing the error.
 *
 * Applied globally on ChatGateway via @UseFilters(WsExceptionFilter).
 */
@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: WsException | Error, host: ArgumentsHost) {
    const client: Socket = host.switchToWs().getClient();

    // Extract a readable message from WsException or a plain Error
    const message =
      exception instanceof WsException
        ? exception.getError()
        : exception.message;

    this.logger.error(`WS error [${client.id}]: ${JSON.stringify(message)}`);

    // Emit the error back to the client so the frontend can handle it
    client.emit('error', { message });
  }
}