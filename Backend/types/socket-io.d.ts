declare module 'socket.io' {
  export interface SocketData {
    userId?: string;
    [key: string]: any;
  }

  export interface Socket {
    id: string;
    handshake: any;
    data: SocketData;
    on(event: string, callback: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): this;
    disconnect(close?: boolean): this;
  }

  export interface SocketWithMap {
    sockets: {
      sockets: Map<string, Socket>;
    };
  }

  export interface Server extends SocketWithMap {
    of(namespace: string): Server;
    on(event: string, callback: (...args: any[]) => void): this;
    to(room: string): { emit: (event: string, ...args: any[]) => void };
    emit(event: string, ...args: any[]): this;
  }
}