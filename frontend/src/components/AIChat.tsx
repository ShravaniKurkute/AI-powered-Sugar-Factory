import { useState } from "react";
import { ArrowUpRight, LoaderCircle, SendHorizonal } from "lucide-react";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
};

type AIChatProps = {
  onSendQuestion: (question: string) => Promise<string>;
  examples?: string[];
};

function AIChat({ onSendQuestion, examples = [] }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Ask about pending payments, farmer totals, or village-level performance.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: trimmed },
    ]);
    setInput("");
    setLoading(true);

    try {
      const answer = await onSendQuestion(trimmed);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: answer },
      ]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The assistant could not answer that prompt.";
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: `Error: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-shell">
      <div className="example-row">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className="example-chip"
            onClick={() => void handleSubmit(example)}
          >
            {example}
            <ArrowUpRight size={14} />
          </button>
        ))}
      </div>

      <div className="messages-panel">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-row ${message.role === "user" ? "user" : "assistant"}`}
          >
            <div className="message-bubble">{message.text}</div>
          </div>
        ))}
        {loading ? (
          <div className="message-row assistant">
            <div className="message-bubble status-bubble">
              <LoaderCircle className="spinner" size={16} />
              Thinking...
            </div>
          </div>
        ) : null}
      </div>

      <div className="composer">
        <textarea
          value={input}
          rows={3}
          placeholder="Ask a farmer question..."
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit(input);
            }
          }}
        />
        <button
          type="button"
          className="primary-button"
          onClick={() => void handleSubmit(input)}
          disabled={loading || !input.trim()}
        >
          <SendHorizonal size={16} />
          Send
        </button>
      </div>
    </div>
  );
}

export default AIChat;
