# Chat Backend-Frontend Integration Guide

## Overview

This guide explains how to properly connect the **Smart Credit Chat Backend** (NestJS with WebSocket) to the **Mobile Frontend** (React Native/Expo).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React Native)                   │
├─────────────────────────────────────────────────────────────┤
│  • socketService.ts   → WebSocket (Real-time events)        │
│  • chatService.ts     → REST API (HTTP calls)               │
│  • CHAT_INTEGRATION.ts → Integration examples               │
└─────────┬───────────────────────────────────────────────────┘
          │
          │ Socket.io + HTTP
          ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS)                          │
├─────────────────────────────────────────────────────────────┤
│  • chat.gateway.ts         → WebSocket events               │
│  • conversations.controller.ts → Conversation API           │
│  • messages.controller.ts      → Message API                │
│  • users/ services        → User management                 │
│  • Firebase              → Data persistence                 │
└─────────────────────────────────────────────────────────────┘
```

## Setup Steps

### 1. Backend Configuration

**File: `.env` (Backend)**

```bash
# Database
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_API_KEY=your-api-key
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# CORS (Allow frontend to connect)
CLIENT_ORIGIN=http://localhost:19006  # Expo default
# Or for production:
# CLIENT_ORIGIN=https://yourmobileapp.com
```

**Verify WebSocket is enabled in `chat.module.ts`:**
```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.CLIENT_ORIGIN ?? '*',
    credentials: true,
  },
  transports: ['websocket'],
})
```

### 2. Frontend Configuration

**File: `.env` (Frontend)**

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000    # During development
# Or for production:
# EXPO_PUBLIC_API_URL=https://api.smartcredit.com
```

### 3. Authentication Setup

The chat system expects JWT authentication. Each socket connection must include the JWT token.

**Backend expects token in one of these locations:**
```typescript
// Option 1: In socket auth object
socket.handshake.auth?.userId  // Direct userId
socket.handshake.auth?.token   // JWT token (verified & decoded)

// Option 2: In headers
socket.handshake.headers['x-user-id']  // Direct userId
socket.handshake.headers['authorization']  // Bearer token
```

**Frontend implementation:**
```typescript
import { chatSocket } from './services/socketService';

// After user logs in, get JWT token
const jwtToken = getJWTFromAuthStore();  // Your auth implementation

// Connect socket with token
chatSocket.connect(jwtToken);
```

## API Reference

### WebSocket Events (Real-time)

#### Client → Server Events

```typescript
// Join conversation room
emit('joinConversation', { conversationId: string })

// Leave conversation room
emit('leaveConversation', { conversationId: string })

// Send typing indicator
emit('typing', { conversationId: string, isTyping: boolean })

// Send read receipt
emit('readReceipt', { conversationId: string, messageId: string })
```

#### Server → Client Events

```typescript
// New message received
on('receiveMessage', (data: {
  id: string,
  conversationId: string,
  senderId: string,
  text: string,
  createdAt: timestamp
}) => { /* handle */ })

// User typing status
on('userTyping', (data: {
  conversationId: string,
  userId: string,
  isTyping: boolean
}) => { /* handle */ })

// Message read status
on('messageRead', (data: {
  conversationId: string,
  messageId: string
}) => { /* handle */ })

// User online/offline
on('userOnline', (data: {
  userId: string,
  isOnline: boolean
}) => { /* handle */ })
```

### REST API Endpoints

#### Conversations

```bash
# Get all conversations for current user
GET /conversations
Authorization: Bearer {JWT_TOKEN}

Response: Conversation[]

---

# Start new 1-on-1 conversation
POST /conversations
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
{
  "targetUserId": "user_123"
}

Response: Conversation

---

# Get single conversation
GET /conversations/:conversationId
Authorization: Bearer {JWT_TOKEN}

Response: Conversation

---

# Mark conversation as read
PATCH /conversations/:conversationId/read
Authorization: Bearer {JWT_TOKEN}

---

# Mute/unmute conversation
PATCH /conversations/:conversationId/mute
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
{
  "muted": true
}

---

# Delete conversation
DELETE /conversations/:conversationId
Authorization: Bearer {JWT_TOKEN}
```

#### Messages

```bash
# Get messages (paginated)
GET /conversations/:conversationId/messages?page=0&limit=30
Authorization: Bearer {JWT_TOKEN}

Response: Message[]

---

# Send text message
POST /conversations/:conversationId/messages
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
{
  "text": "Hello World!"
}

Response: Message

---

# Upload media
POST /conversations/:conversationId/messages/upload
Authorization: Bearer {JWT_TOKEN}
Content-Type: multipart/form-data
[binary file data]

Response: Message
```

#### Users

```bash
# Search users
GET /users/search?q=john
Authorization: Bearer {JWT_TOKEN}

Response: User[]

---

# Get blocked users
GET /users/blocked
Authorization: Bearer {JWT_TOKEN}

Response: BlockedUser[]

---

# Block user
POST /users/block/:userId
Authorization: Bearer {JWT_TOKEN}

---

# Unblock user
DELETE /users/block/:userId
Authorization: Bearer {JWT_TOKEN}
```

## Frontend Usage Examples

### 1. Initialize Chat on App Start

```typescript
// In your auth/app setup
import { chatSocket } from './services/socketService';
import { useAuthStore } from './stores/authStore';

export function AppInitializer() {
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      chatSocket.connect(token);
    }

    return () => {
      chatSocket.disconnect();
    };
  }, [isAuthenticated, token]);

  return null; // Or return your app content
}
```

### 2. Conversation List Screen

```typescript
import { useEffect, useState } from 'react';
import { conversationService } from './services/chatService';
import type { Conversation } from './types/chat.types';

export function ConversationListScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    async function load() {
      const data = await conversationService.getAll();
      setConversations(data);
    }
    load();
  }, []);

  return (
    <FlatList
      data={conversations}
      renderItem={({ item }) => (
        <ConversationItem conversation={item} />
      )}
    />
  );
}
```

### 3. Chat Screen with Real-time Updates

```typescript
import { useEffect, useState } from 'react';
import { chatSocket } from './services/socketService';
import { messageService, conversationService } from './services/chatService';
import type { Message } from './types/chat.types';

export function ChatScreen({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');

  // Load messages and set up real-time listener
  useEffect(() => {
    // Load initial messages
    conversationService
      .getMessages(conversationId, { page: 0, limit: 30 })
      .then(setMessages);

    // Join room for real-time updates
    chatSocket.joinConversation(conversationId);

    // Listen for new messages
    chatSocket.on('receiveMessage', (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages((prev) => [message, ...prev]);
      }
    });

    return () => {
      chatSocket.leaveConversation(conversationId);
    };
  }, [conversationId]);

  // Send message
  async function handleSend() {
    if (!text.trim()) return;
    
    try {
      await messageService.send(conversationId, text);
      setText('');
    } catch (error) {
      console.error('Failed to send:', error);
    }
  }

  // Send typing indicator
  function handleTyping() {
    chatSocket.sendTyping(conversationId, text.length > 0);
  }

  return (
    <View>
      <FlatList
        data={messages}
        renderItem={({ item }) => <MessageBubble message={item} />}
        keyExtractor={(item) => item.id}
      />
      <TextInput
        value={text}
        onChangeText={(value) => {
          setText(value);
          handleTyping();
        }}
        placeholder="Type message..."
      />
      <Button title="Send" onPress={handleSend} />
    </View>
  );
}
```

## Troubleshooting

### Socket Connection Issues

**Problem: "Cannot connect to WebSocket"**

1. Check backend is running: `npm run start:dev` in Backend folder
2. Verify `EXPO_PUBLIC_API_URL` matches backend URL
3. Check WebSocket port (usually 3000)
4. Check CORS settings in `chat.gateway.ts`

```bash
# Test backend connectivity
curl http://localhost:3000

# Expected: Some response from the API
```

**Problem: "Socket connected but authentication failed"**

1. JWT token is invalid or expired
2. Token not passed to `chatSocket.connect()`
3. Backend JWT verification failed

Solution:
```typescript
// Debug: Check token
const token = getAuthToken();
console.log('Token:', token);

// Debug: Check socket status
console.log('Socket status:', chatSocket.getStatus());
```

### Message Not Appearing

**Problem: Messages sent but not appearing**

1. Check if user is in conversation room: `joinConversation()`
2. Firebase permissions might be wrong
3. Check backend logs for errors

**Problem: Pagination not loading older messages**

```typescript
// Load older messages
conversationService.getMessages(conversationId, { 
  page: 1,  // Next page
  limit: 30 
})
```

### Authentication Issues

**Problem: 401 Unauthorized errors**

Ensure JWT is included in every request:

```typescript
// Frontend - Auto-attach token in interceptor (done in chatService.ts)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Backend - Verify token is being validated
// Check: CurrentUser decorator extracting userId from token
```

## Firebase Setup

Ensure Firestore collections exist with proper structure:

```
Firestore Collections:

conversations/
  ├─ conversationId
  │  ├─ participantIds: [userId1, userId2]
  │  ├─ lastMessage: {...}
  │  ├─ unreadCounts: { userId1: 0, userId2: 5 }
  │  ├─ mutedBy: [userId1]
  │  └─ createdAt: timestamp

messages/{conversationId}/
  ├─ messageId
  │  ├─ conversationId
  │  ├─ senderId
  │  ├─ text
  │  ├─ mediaUrl: null
  │  ├─ readAt: null
  │  └─ createdAt: timestamp

users/
  ├─ userId
  │  ├─ fullName
  │  ├─ email
  │  ├─ photoURL
  │  ├─ isOnline: true
  │  └─ lastSeen: timestamp
```

## Performance Optimization

### Pagination Strategy

Load messages in chunks to avoid performance issues:

```typescript
// Load 30 messages per page
const limit = 30;

// Initial load
conversationService.getMessages(convId, { page: 0, limit })

// Load older (scroll up)
conversationService.getMessages(convId, { page: 1, limit })

// Load newer (should be via WebSocket for real-time)
```

### Connection Management

```typescript
// Auto-reconnect with exponential backoff (built-in)
chatSocket.connect(token)

// Manual disconnect on logout
chatSocket.disconnect()

// Check connection status
if (chatSocket.isConnected) {
  // Safe to emit
  chatSocket.sendTyping(convId, true)
}
```

## Security Considerations

1. **JWT Verification**: Backend validates all JWT tokens
2. **Access Control**: Users can only access their own conversations
3. **CORS**: Only allow frontend origin
4. **Firebase Rules**: Restrict database access to authenticated users

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /conversations/{doc=**} {
      allow read, write: if request.auth != null;
    }
    match /messages/{doc=**} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

## Next Steps

1. ✅ Configure environment variables
2. ✅ Implement auth integration (JWT token)
3. ✅ Start both backend and frontend
4. ✅ Test socket connection in browser DevTools
5. ✅ Test REST endpoints with Postman
6. ✅ Implement UI screens using the examples above
7. ✅ Handle real-time events (messages, typing, presence)
8. ✅ Test pagination and performance

## Support Files

- **Backend**: `src/modules/chat/` - All chat logic
- **Frontend**: `src/services/` - Chat integration services
- **Integration Guide**: `CHAT_INTEGRATION.ts` - Complete examples
- **Type Definitions**: `types/chat.types.ts` - TypeScript types
