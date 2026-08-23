const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(
    /\/$/,
    "",
  ) ?? "http://localhost:3000/api";

export type AiAssistantRole = "borrower" | "lender" | "admin";

export type AiConversation = {
  conversationId: string;
  title: string;
  userRole: AiAssistantRole;
  messageCount: number;
  updatedAt: string | null;
};

export type AiMessage = {
  messageId: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  status: "completed" | "failed";
  createdAt: string | null;
};

async function request<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/ai-assistant${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      message?: string | string[];
    };
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;
    throw new Error(message || "The AI assistant is currently unavailable.");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function createAiConversation(accessToken: string) {
  const response = await request<{ conversation: AiConversation }>(
    accessToken,
    "/conversations",
    { method: "POST", body: JSON.stringify({}) },
  );
  return response.conversation;
}

export async function listAiConversations(accessToken: string) {
  const response = await request<{ conversations: AiConversation[] }>(
    accessToken,
    "/conversations",
  );
  return response.conversations;
}

export async function listAiMessages(
  accessToken: string,
  conversationId: string,
) {
  const response = await request<{ messages: AiMessage[] }>(
    accessToken,
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
  return response.messages;
}

export function sendAiMessage(
  accessToken: string,
  conversationId: string,
  content: string,
) {
  return request<{ userMessage: AiMessage; assistantMessage: AiMessage }>(
    accessToken,
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify({ content }) },
  );
}

export async function archiveAiConversation(
  accessToken: string,
  conversationId: string,
) {
  await request<void>(
    accessToken,
    `/conversations/${encodeURIComponent(conversationId)}`,
    { method: "DELETE" },
  );
}
