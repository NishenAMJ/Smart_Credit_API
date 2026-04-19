import { SubscribeMessage, WebSocketGateway,  MessageBody } from "@nestjs/websockets";
import { Socket} from 'socket.io';

@WebSocketGateway(3000, {})
export class ChatGateway {
    @SubscribeMessage('newMessage')
    handleNewMessage(client:Socket, message:any ){
        console.log(message);
        client.emit('reply', 'this is a reply');
    }


} 
