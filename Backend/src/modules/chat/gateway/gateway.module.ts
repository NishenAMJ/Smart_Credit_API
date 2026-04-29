import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

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

/*This file is used to handle errors that happen
 during WebSocket communication in the chat system.
  Instead of letting the application crash or show
   unclear errors, it catches those errors, logs them 
   for debugging, and sends a simple error message back 
   to the client. This helps keep the real-time chat stable and 
   ensures users get proper feedback when something goes wrong.*/
