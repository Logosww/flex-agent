'use client';

import { ChainOfThoughtStep } from '@/components/ai-elements/chain-of-thought';
import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from '@/components/ai-elements/plan';
import { cn } from '@/lib/utils';
import type { PlanData, PlanStepStatus } from '@/types/chat-ui';
import {
  CheckCircle2Icon,
  CircleIcon,
  LoaderCircleIcon,
  XCircleIcon,
  type LucideIcon,
} from 'lucide-react';

function mapStepStatus(status: PlanStepStatus): 'complete' | 'active' | 'pending' {
  if (status === 'running') return 'active';
  if (status === 'done' || status === 'failed') return 'complete';
  return 'pending';
}

function getStepIcon(status: PlanStepStatus): LucideIcon {
  switch (status) {
    case 'done':
      return CheckCircle2Icon;
    case 'running':
      return LoaderCircleIcon;
    case 'failed':
      return XCircleIcon;
    default:
      return CircleIcon;
  }
}

export function PlanSteps({
  plan,
  isStreaming = false,
  className,
}: {
  plan: PlanData;
  isStreaming?: boolean;
  className?: string;
}) {
  if (plan.steps.length <= 1) return null;

  let doneCount = 0;
  for (const step of plan.steps) {
    if (step.status === 'done') doneCount++;
  }

  return (
    <Plan className={className} defaultOpen isStreaming={isStreaming}>
      <PlanHeader>
        <PlanTitle>执行计划</PlanTitle>
        <PlanDescription>{`${doneCount}/${plan.steps.length} 已完成`}</PlanDescription>
        <PlanAction>
          <PlanTrigger />
        </PlanAction>
      </PlanHeader>
      <PlanContent>
        <div className="space-y-3">
          {plan.steps.map((step, index) => (
            <ChainOfThoughtStep
              key={step.id}
              className={cn(
                step.status === 'running' && '[&_svg]:animate-spin',
                step.status === 'failed' && 'text-destructive',
                index === plan.steps.length - 1 && '[&>div:first-child>div:last-child]:hidden',
              )}
              icon={getStepIcon(step.status)}
              label={
                <>
                  <span className="text-muted-foreground">{step.ordinal}.</span> {step.title}
                </>
              }
              status={mapStepStatus(step.status)}
            />
          ))}
        </div>
      </PlanContent>
    </Plan>
  );
}
