"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { SendIcon, SquareIcon } from "lucide-react";

export default function ChatPage() {
  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "http://localhost:3001/api/chat",
    }),
  });

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b px-4 py-3">
        <h1 className="font-semibold text-sm">Bedrock Chatbot</h1>
      </header>

      <Conversation className="flex-1">
        <ConversationContent>
          {messages.length === 0 && (
            <ConversationEmptyState
              title="How can I help you?"
              description="Start a conversation with the AI assistant."
            />
          )}
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, i) =>
                  part.type === "text" ? (
                    <span key={i}>{part.text}</span>
                  ) : null
                )}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-4">
        <PromptInput
          onSubmit={({ text }) => {
            if (text.trim()) sendMessage({ text });
          }}
        >
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Message..."
              disabled={isStreaming}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <div className="ml-auto">
              {isStreaming ? (
                <PromptInputButton type="button" tooltip="Stop" onClick={stop}>
                  <SquareIcon className="size-4" />
                </PromptInputButton>
              ) : (
                <PromptInputButton type="submit" tooltip="Send">
                  <SendIcon className="size-4" />
                </PromptInputButton>
              )}
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
