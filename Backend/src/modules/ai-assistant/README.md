# Smart Credit AI Assistant

This module is a read-only assistant for authenticated borrower, lender, and
admin roles.
It is intentionally separate from the human-to-human `chat` module.

## Security boundary

- The active role and user ID come only from the verified JWT.
- Clients send a message and conversation ID; they never send a role, borrower ID,
  or lender ID.
- The role router exposes only the tools for the active JWT role.
- Every detail tool verifies ownership before returning a record.
- Admin tools return bounded, field-allowlisted operational summaries and never
  raw Firestore records.
- The assistant has no create, update, approval, repayment-recording, SMS, KYC,
  dispute-resolution, or deletion tools.
- Tool results omit credentials, tokens, NICs, bank data, private file URLs, and
  KYC documents.

## Configuration

Keep the feature disabled until the server has a valid provider key. Select
either `openai` or `gemini`:

```env
AI_ASSISTANT_ENABLED=true
AI_PROVIDER=openai
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-5.6-terra
AI_MESSAGE_LIMIT_PER_5_MINUTES=20
AI_CONVERSATION_RETENTION_DAYS=30
AI_SAFETY_IDENTIFIER_SALT=a_private_random_value
```

For Gemini:

```env
AI_ASSISTANT_ENABLED=true
AI_PROVIDER=gemini
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-flash-latest
```

Never expose provider API keys through frontend environment variables.

## API

All routes require a borrower, lender, or admin bearer token.

```text
POST   /api/ai-assistant/conversations
GET    /api/ai-assistant/conversations
GET    /api/ai-assistant/conversations/:id/messages
POST   /api/ai-assistant/conversations/:id/messages
DELETE /api/ai-assistant/conversations/:id
```

`DELETE` archives the conversation; it does not remove its audit history.

Admin access is intentionally read-only. The assistant can summarize users,
KYC submissions, listings, loans, transactions, disputes, legal documents, and
audit activity, but it cannot approve, reject, suspend, resolve, reverse, or
otherwise change application data.

## Firestore

```text
aiConversations/{conversationId}
aiConversations/{conversationId}/messages/{messageId}
aiUsage/{hashedUserAndWindow}
```

Deploy the root `firestore.indexes.json` before enabling the feature in Firebase.
Configure Firestore TTL for the `expiresAt` field on `aiConversations` and
`aiUsage` when automatic retention cleanup is required.
