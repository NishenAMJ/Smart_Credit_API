declare module 'socket.io-client' {
  export interface SocketOptions {
    auth?: { userId?: string };
    transports?: string[];
    reconnection?: boolean;
    reconnectionDelay?: number;
    reconnectionDelayMax?: number;
    reconnectionAttempts?: number;
  }

  export interface Socket {
    id: string;
    connected: boolean;
    on(event: string, callback: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): this;
    disconnect(): this;
  }

  export function io(url: string, options?: SocketOptions): Socket;
}