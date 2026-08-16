import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  archiveAiConversation,
  createAiConversation,
  listAiConversations,
  listAiMessages,
  sendAiMessage,
  type AiAssistantRole,
  type AiMessage,
} from "./ai-assistant-api";
import AssistantMarkdown from "./AssistantMarkdown";
import "./assistant.css";

type AiAssistantProps = {
  accessToken: string;
  role: AiAssistantRole;
};

const roleCopy: Record<
  AiAssistantRole,
  { greeting: string; placeholder: string }
> = {
  borrower: {
    greeting:
      "Hello. I can help you review your applications, loans, monthly installments, repayments, KYC status, and available loan advertisements.",
    placeholder: "Ask about your borrower account",
  },
  lender: {
    greeting:
      "Hello. I can help you review your lender loans, borrowers, payments, daily collections, advertisements, and pending requests.",
    placeholder: "Ask about your lender workspace",
  },
  admin: {
    greeting:
      "Hello. I can help you review sanitized platform summaries for users, KYC submissions, listings, loans, transactions, disputes, legal documents, and audit activity.",
    placeholder: "Ask about platform operations",
  },
};

function AssistantIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <path d="M8 10h.01M12 10h.01M16 10h.01" />
      <path d="M5.5 18.5 4 21v-5.1A8 8 0 1 1 20 11a8 8 0 0 1-8 8H8.4c-1.1 0-2.1-.2-2.9-.5Z" />
    </svg>
  );
}

export default function AiAssistant({ accessToken, role }: AiAssistantProps) {
  const greeting = useMemo<AiMessage>(
    () => ({
      messageId: `local-greeting-${role}`,
      conversationId: "",
      role: "assistant",
      content: roleCopy[role].greeting,
      status: "completed",
      createdAt: null,
    }),
    [role],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([greeting]);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversationId(null);
    setMessages([greeting]);
    setDraft("");
    setError("");
    setIsOpen(false);
  }, [accessToken, greeting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  async function loadAssistant() {
    if (conversationId || isLoading) return;
    try {
      setIsLoading(true);
      setError("");
      const conversations = await listAiConversations(accessToken);
      const conversation =
        conversations[0] ?? (await createAiConversation(accessToken));
      setConversationId(conversation.conversationId);
      const storedMessages = await listAiMessages(
        accessToken,
        conversation.conversationId,
      );
      setMessages(storedMessages.length > 0 ? storedMessages : [greeting]);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "The AI assistant is unavailable.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleToggle() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) void loadAssistant();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || isSending) return;

    try {
      setIsSending(true);
      setError("");
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const conversation = await createAiConversation(accessToken);
        activeConversationId = conversation.conversationId;
        setConversationId(activeConversationId);
      }
      const optimisticMessage: AiMessage = {
        messageId: `pending-${Date.now()}`,
        conversationId: activeConversationId,
        role: "user",
        content,
        status: "completed",
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [
        ...current.filter(
          (message) => message.messageId !== greeting.messageId,
        ),
        optimisticMessage,
      ]);
      setDraft("");
      const response = await sendAiMessage(
        accessToken,
        activeConversationId,
        content,
      );
      setMessages((current) => [
        ...current.filter(
          (message) => message.messageId !== optimisticMessage.messageId,
        ),
        response.userMessage,
        response.assistantMessage,
      ]);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "The AI assistant could not send your message.",
      );
    } finally {
      setIsSending(false);
    }
  }

  async function handleNewConversation() {
    try {
      setIsLoading(true);
      setError("");
      if (conversationId) {
        await archiveAiConversation(accessToken, conversationId);
      }
      const conversation = await createAiConversation(accessToken);
      setConversationId(conversation.conversationId);
      setMessages([greeting]);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not start a new chat.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={`ai-assistant${isOpen ? " ai-assistant--open" : ""}`}>
      {isOpen ? (
        <section
          className="ai-assistant__panel"
          aria-label="Smart Credit AI Assistant"
        >
          <header className="ai-assistant__header">
            <div>
              <span className="ai-assistant__eyebrow">Smart Credit</span>
              <h2>AI Assistant</h2>
            </div>
            <div className="ai-assistant__header-actions">
              <button
                type="button"
                className="ai-assistant__text-button"
                onClick={() => void handleNewConversation()}
                disabled={isLoading || isSending}
              >
                New chat
              </button>
              <button
                type="button"
                className="ai-assistant__close"
                aria-label="Close AI assistant"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>
          </header>

          <div
            className="ai-assistant__messages"
            ref={scrollRef}
            aria-live="polite"
          >
            {isLoading ? (
              <p className="ai-assistant__status">Loading your assistant…</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.messageId}
                  className={`ai-assistant__message ai-assistant__message--${message.role}`}
                >
                  <span>
                    {message.role === "assistant" ? "Assistant" : "You"}
                  </span>
                  <div className="ai-assistant__bubble">
                    {message.role === "assistant" ? (
                      <AssistantMarkdown content={message.content} />
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </div>
                </div>
              ))
            )}
            {isSending ? (
              <p className="ai-assistant__status">Reviewing your records…</p>
            ) : null}
          </div>

          {error ? <p className="ai-assistant__error">{error}</p> : null}

          <form className="ai-assistant__composer" onSubmit={handleSubmit}>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={roleCopy[role].placeholder}
              maxLength={2000}
              rows={2}
              disabled={isLoading || isSending}
              aria-label="Message to AI assistant"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isLoading || isSending}
            >
              Send
            </button>
          </form>
          <p className="ai-assistant__notice">
            Read-only assistant. Verify important financial decisions.
          </p>
        </section>
      ) : null}

      <button
        type="button"
        className="ai-assistant__launcher"
        aria-label={isOpen ? "Close AI assistant" : "Open AI assistant"}
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <AssistantIcon />
        <span>Ask AI</span>
      </button>
    </div>
  );
}
