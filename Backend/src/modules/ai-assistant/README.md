# Smart Credit AI Assistant

This module is a read-only assistant for authenticated borrower and lender roles.
It is intentionally separate from the human-to-human `chat` module.

## Security boundary

- The active role and user ID come only from the verified JWT.
- Clients send a message and conversation ID; they never send a role, borrower ID,
  or lender ID.
- The role router exposes only the tools for the active JWT role.
- Every detail tool verifies ownership before returning a record.
- The assistant has no create, update, approval, repayment-recording, SMS, KYC,
  dispute-resolution, or deletion tools.
- Tool results omit credentials, tokens, NICs, bank data, private file URLs, and
  KYC documents.

## Configuration

Keep the feature disabled until the server has a valid provider key:

```env
AI_ASSISTANT_ENABLED=true
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.6-terra
AI_MESSAGE_LIMIT_PER_5_MINUTES=20
AI_CONVERSATION_RETENTION_DAYS=30
AI_SAFETY_IDENTIFIER_SALT=a_private_random_value
```

Never expose `OPENAI_API_KEY` through a frontend environment variable.

## API

All routes require a borrower or lender bearer token.

```text
POST   /api/ai-assistant/conversations
GET    /api/ai-assistant/conversations
GET    /api/ai-assistant/conversations/:id/messages
POST   /api/ai-assistant/conversations/:id/messages
DELETE /api/ai-assistant/conversations/:id
```

`DELETE` archives the conversation; it does not remove its audit history.

## Firestore

```text
aiConversations/{conversationId}
aiConversations/{conversationId}/messages/{messageId}
aiUsage/{hashedUserAndWindow}
```

Deploy the root `firestore.indexes.json` before enabling the feature in Firebase.
Configure Firestore TTL for the `expiresAt` field on `aiConversations` and
`aiUsage` when automatic retention cleanup is required.
