
@Module({
  imports: [
    FirebaseModule,
    UsersModule,
    BlocksModule,
    ConversationsModule,
    MessagesModule,
    GatewayModule,
  ],
})
export class ChatModule {}   