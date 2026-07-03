'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { ChatMessageItem } from './chat-message-item';
import { useRuntimeEnv } from '@/components/runtime-env-provider';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent } from '@/components/ai-elements/message';
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputTextarea,
  PromptInputSubmit,
} from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { ChatPanelSkeleton } from './chat-panel-skeleton';
import { SessionSidebarToggle } from '@/components/session-list/session-sidebar-toggle';
import { parsePendingCollect } from '@/lib/chat/pending-collect';
import {
  deriveSessionTitle,
  useCreateSessionMutation,
  useSessionQuery,
  useUpdateSessionMutation,
} from '@/lib/queries/sessions';
import type { ChatUIMessage } from '@/types/chat-ui';

const CollectUserInputForm = dynamic(
  () =>
    import('./collect-user-input-form').then((mod) => ({
      default: mod.CollectUserInputForm,
    })),
  { ssr: false },
);

const enablePlanning = process.env.NEXT_PUBLIC_ENABLE_PLANNING === 'true';

function noopRegenerate() {}

interface ChatPanelProps {
  sessionId: string;
  isDraft?: boolean;
  sidebarExpanded?: boolean;
  onToggleSidebar?: () => void;
  onSessionPersisted?: (sessionId: string) => void;
}

function ChatPanelInner({
  sessionId,
  initialMessages,
  sessionTitle,
  isDraft = false,
  sidebarExpanded,
  onToggleSidebar,
  onSessionPersisted,
}: {
  sessionId: string;
  initialMessages: ChatUIMessage[];
  sessionTitle: string;
  isDraft?: boolean;
  sidebarExpanded?: boolean;
  onToggleSidebar?: () => void;
  onSessionPersisted?: (sessionId: string) => void;
}) {
  const { modelId } = useRuntimeEnv();
  const [input, setInput] = useState('');
  const lastSavedRef = useRef('');
  const draftPersistedRef = useRef(false);
  const createMutation = useCreateSessionMutation();
  const updateMutation = useUpdateSessionMutation();

  useEffect(() => {
    draftPersistedRef.current = false;
    lastSavedRef.current = JSON.stringify(initialMessages);
  }, [sessionId, initialMessages]);

  const transport = new DefaultChatTransport<ChatUIMessage>({
    api: '/api/chat',
    body: () => ({
      session_id: sessionId,
      ...(enablePlanning ? { enable_planning: true } : {}),
    }),
  });

  const { messages, sendMessage, status, regenerate } = useChat<ChatUIMessage>({
    id: sessionId,
    messages: initialMessages,
    transport,
  });

  useEffect(() => {
    if (messages.length === 0) return;

    const serialized = JSON.stringify(messages);
    const title = deriveSessionTitle(messages);

    if (isDraft && !draftPersistedRef.current) {
      const shouldPersist =
        status === 'submitted' ||
        status === 'streaming' ||
        (status === 'ready' && messages.some((message) => message.role === 'user'));

      if (shouldPersist) {
        draftPersistedRef.current = true;
        lastSavedRef.current = serialized;
        createMutation.mutate(
          {
            id: sessionId,
            title: title ?? sessionTitle,
            messages,
          },
          {
            onSuccess: () => onSessionPersisted?.(sessionId),
          },
        );
      }
      return;
    }

    if (status !== 'ready') return;
    if (isDraft) return;
    if (serialized === lastSavedRef.current) return;
    lastSavedRef.current = serialized;

    const patch: { messages: ChatUIMessage[]; title?: string } = { messages };
    if (title && sessionTitle === '新对话') {
      patch.title = title;
    }
    updateMutation.mutate({ id: sessionId, patch });
  }, [
    messages,
    status,
    sessionId,
    sessionTitle,
    isDraft,
    createMutation,
    updateMutation,
    onSessionPersisted,
  ]);

  const lastMessage = messages[messages.length - 1];
  const isStreamingOrSubmitted = status === 'streaming' || status === 'submitted';

  const isReasoningStreaming =
    isStreamingOrSubmitted &&
    !!lastMessage &&
    lastMessage.role === 'assistant' &&
    lastMessage.parts.at(-1)?.type === 'reasoning';

  const awaitingFirstTextToken =
    isStreamingOrSubmitted &&
    (!lastMessage ||
      lastMessage.role !== 'assistant' ||
      !lastMessage.parts.some((part) => part.type === 'text' && part.text.length > 0));

  const pendingProviderToolInvocation =
    status === 'streaming' &&
    !!lastMessage &&
    lastMessage.role === 'assistant' &&
    lastMessage.parts.some((part) => {
      if (part.type !== 'dynamic-tool') return false;
      if (part.toolName === 'collect_user_input' || !part.providerExecuted) return false;
      return part.state === 'input-streaming' || part.state === 'input-available';
    });

  const awaitingFollowupTokensAfterTools =
    status === 'streaming' &&
    !pendingProviderToolInvocation &&
    !!lastMessage &&
    lastMessage.role === 'assistant' &&
    (() => {
      const ps = lastMessage.parts;
      if (ps.length === 0) return false;
      const tail = ps[ps.length - 1];
      if (tail.type === 'dynamic-tool') {
        if (tail.state === 'input-streaming' || tail.state === 'input-available') return false;
        return tail.state === 'output-available' || tail.state === 'output-error';
      }
      if (tail.type === 'text' && tail.text === '' && tail.state === 'streaming') {
        const idx = ps.length - 1;
        return ps
          .slice(0, idx)
          .some(
            (p) =>
              p.type === 'dynamic-tool' &&
              (p.state === 'output-available' || p.state === 'output-error'),
          );
      }
      return false;
    })();

  const pendingCollect = parsePendingCollect(lastMessage);

  const showStatusShimmer =
    !pendingCollect &&
    (status === 'submitted' ||
      pendingProviderToolInvocation ||
      awaitingFollowupTokensAfterTools ||
      awaitingFirstTextToken);
  const statusShimmerLabel = pendingProviderToolInvocation ? '调用工具中' : '思考中…';
  const showStandaloneStatusShimmer = showStatusShimmer && !!lastMessage && lastMessage.role !== 'assistant';

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text?.trim();
    if (!text || status !== 'ready' || pendingCollect) return;
    sendMessage({ text });
    setInput('');
  };

  const isInitialEmpty = messages.length === 0 && status === 'ready' && !pendingCollect;

  const promptInput = (
    <PromptInput onSubmit={handleSubmit} className="relative w-full">
      <PromptInputTextarea
        value={input}
        onChange={(e) => setInput(e.currentTarget.value)}
        placeholder="输入消息"
        className="pr-12"
        disabled={status !== 'ready' || !!pendingCollect}
      />
      <PromptInputSubmit
        status={status}
        disabled={(!input.trim() && status === 'ready') || status !== 'ready' || !!pendingCollect}
        className="absolute bottom-1 right-1"
      />
    </PromptInput>
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          {onToggleSidebar && !sidebarExpanded ? (
            <SessionSidebarToggle expanded={false} onToggle={onToggleSidebar} />
          ) : null}
          <h1 className="text-sm font-semibold text-foreground">Flex Agent</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{modelId}</Badge>
          <ThemeToggle />
        </div>
      </header>

      {isInitialEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8">
          <div className="flex w-full max-w-3xl flex-col items-center gap-8">
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyTitle>有什么可以帮你的？</EmptyTitle>
                <EmptyDescription>输入消息开始对话</EmptyDescription>
              </EmptyHeader>
            </Empty>
            {promptInput}
          </div>
        </div>
      ) : (
        <>
          <Conversation className="flex-1">
            <ConversationContent className="mx-auto max-w-3xl px-4">
              {messages.map((message, messageIndex) => {
                const isLastMessage = messageIndex === messages.length - 1;
                const isLastAssistant = message.role === 'assistant' && isLastMessage;
                const isAssistantStreaming =
                  isLastMessage &&
                  message.role === 'assistant' &&
                  (status === 'streaming' || status === 'submitted');

                const itemShowStatusShimmer =
                  isLastAssistant && showStatusShimmer && !isReasoningStreaming;
                const showActions = isLastAssistant && status === 'ready' && !pendingCollect;

                return (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    display={{
                      isLastMessage,
                      isAssistantStreaming,
                      showStatusShimmer: itemShowStatusShimmer,
                      statusShimmerLabel: itemShowStatusShimmer ? statusShimmerLabel : '',
                      showActions,
                    }}
                    onRegenerate={showActions ? regenerate : noopRegenerate}
                  />
                );
              })}
              {showStandaloneStatusShimmer ? (
                <Message from="assistant">
                  <MessageContent>
                    <Shimmer duration={1.5}>{statusShimmerLabel}</Shimmer>
                  </MessageContent>
                </Message>
              ) : null}
              {pendingCollect ? (
                <div className="pb-4">
                  <CollectUserInputForm
                    toolCallId={pendingCollect.toolCallId}
                    description={pendingCollect.description}
                  />
                </div>
              ) : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <div className="mx-auto w-full max-w-3xl px-4 py-3">{promptInput}</div>
        </>
      )}
    </div>
  );
}

export function ChatPanel({
  sessionId,
  isDraft = false,
  sidebarExpanded,
  onToggleSidebar,
  onSessionPersisted,
}: ChatPanelProps) {
  const { data: session, isLoading } = useSessionQuery(isDraft ? null : sessionId);

  if (!isDraft && (isLoading || !session)) {
    return <ChatPanelSkeleton />;
  }

  return (
    <ChatPanelInner
      key={sessionId}
      sessionId={sessionId}
      initialMessages={isDraft ? [] : (session!.messages as ChatUIMessage[])}
      sessionTitle={isDraft ? '新对话' : session!.title}
      isDraft={isDraft}
      sidebarExpanded={sidebarExpanded}
      onToggleSidebar={onToggleSidebar}
      onSessionPersisted={onSessionPersisted}
    />
  );
}
