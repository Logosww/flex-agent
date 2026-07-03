'use client';

import { CopyIcon, RefreshCcwIcon } from 'lucide-react';

import { PlanSteps } from './plan-steps';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from '@/components/ai-elements/message';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import type { ChatUIMessage } from '@/types/chat-ui';

const enablePlanning = process.env.NEXT_PUBLIC_ENABLE_PLANNING === 'true';

function renderThinkingMessage(streaming: boolean, duration?: number) {
  if (streaming || duration === 0) {
    return <Shimmer duration={1}>思考中…</Shimmer>;
  }
  if (duration === undefined) {
    return <p>思考完成</p>;
  }
  return <p>思考了 {duration} 秒</p>;
}

function copyMessageText(message: ChatUIMessage) {
  const chunks: string[] = [];
  for (const part of message.parts) {
    if (part.type === 'text' || part.type === 'reasoning') {
      chunks.push('text' in part ? part.text : '');
    }
  }
  return chunks.join('\n\n');
}

export type ChatMessageDisplayState = {
  isLastMessage: boolean;
  isAssistantStreaming: boolean;
  showStatusShimmer: boolean;
  statusShimmerLabel: string;
  showActions: boolean;
};

export type ChatMessageItemProps = {
  message: ChatUIMessage;
  display: ChatMessageDisplayState;
  onRegenerate: () => void;
};

export function ChatMessageItem({ message, display, onRegenerate }: ChatMessageItemProps) {
  const {
    isLastMessage,
    isAssistantStreaming,
    showStatusShimmer,
    statusShimmerLabel,
    showActions,
  } = display;

  const planPart = enablePlanning
    ? message.parts.find((part) => part.type === 'data-plan')
    : undefined;
  const plan = planPart?.type === 'data-plan' ? planPart.data : null;
  const isPlanStreaming =
    !!plan &&
    isLastMessage &&
    isAssistantStreaming &&
    plan.steps.some((step) => step.status === 'running');

  const reasoningParts = message.parts.filter((part) => part.type === 'reasoning');
  const reasoningText = reasoningParts.map((part) => part.text).join('\n\n');
  const hasReasoning = reasoningParts.length > 0;
  const lastPart = message.parts.at(-1);
  const messageReasoningStreaming =
    isLastMessage && isAssistantStreaming && lastPart?.type === 'reasoning';

  return (
    <>
      <Message from={message.role}>
        {plan ? (
          <PlanSteps className="mb-2" isStreaming={isPlanStreaming} plan={plan} />
        ) : null}
        <MessageContent className={hasReasoning ? 'w-full min-w-0 max-w-full' : undefined}>
          {hasReasoning ? (
            <Reasoning isStreaming={messageReasoningStreaming}>
              <ReasoningTrigger getThinkingMessage={renderThinkingMessage} />
              <ReasoningContent>{reasoningText}</ReasoningContent>
            </Reasoning>
          ) : null}
          {message.parts.map((part, i) => {
            if (part.type === 'text') {
              return (
                <MessageResponse
                  key={`${message.id}-${part.type}-${i}`}
                  isAnimating={isAssistantStreaming}
                >
                  {part.text}
                </MessageResponse>
              );
            }
            if (part.type === 'data-plan' || part.type === 'reasoning') {
              return null;
            }
            return null;
          })}
          {showStatusShimmer ? (
            <Shimmer duration={1.5}>{statusShimmerLabel}</Shimmer>
          ) : null}
        </MessageContent>
      </Message>
      {showActions ? (
        <MessageActions>
          <MessageAction onClick={onRegenerate} tooltip="重新生成" label="重新生成">
            <RefreshCcwIcon className="size-3" />
          </MessageAction>
          <MessageAction
            onClick={() => {
              void navigator.clipboard.writeText(copyMessageText(message));
            }}
            tooltip="复制"
            label="复制"
          >
            <CopyIcon className="size-3" />
          </MessageAction>
        </MessageActions>
      ) : null}
    </>
  );
}
