declare module '@nestjs/websockets' {
  export declare function SubscribeMessage(event?: string): PropertyDecorator;
  export declare function WebSocketGateway(options?: { namespace?: string; cors?: any; transports?: string[] }): ClassDecorator;
  export declare function ConnectedSocket(): ParameterDecorator;
  export declare function MessageBody(): ParameterDecorator;
  export declare function WebSocketServer(): PropertyDecorator;
  export declare class WsException extends Error {
    constructor(message: string);
    getError(): string;
  }
  export declare abstract class BaseWsExceptionFilter<TError = any> {
    catch(exception: TError, host: any): void;
  }
  export interface OnGatewayConnection {
    handleConnection(client: any, ...args: any[]): any;
  }
  export interface OnGatewayDisconnect {
    handleDisconnect(client: any): any;
  }
}