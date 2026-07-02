import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ChatStackParamList } from "../types";

import ChatListScreen from "../screens/chat/ChatListScreen";
import ChatScreen from "../screens/chat/ChatScreen";
import NewChatScreen from "../screens/chat/NewChatScreen";
import ChatInfoScreen from "../screens/chat/ChatInfoScreen";
import BlockedUsersScreen from "../screens/chat/BlockedUsersScreen";

const Stack = createNativeStackNavigator<ChatStackParamList>();

export default function ChatNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="NewChat" component={NewChatScreen} />
      <Stack.Screen name="ChatInfo" component={ChatInfoScreen} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
    </Stack.Navigator>
  );
}
