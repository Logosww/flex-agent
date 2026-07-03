'use client';

import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronsUpDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { createContext, use } from 'react';

import { Shimmer } from './shimmer';

interface PlanContextValue {
  isStreaming: boolean;
}

const PlanContext = createContext<PlanContextValue | null>(null);

const usePlan = () => {
  const context = use(PlanContext);
  if (!context) {
    throw new Error('Plan components must be used within Plan');
  }
  return context;
};

export type PlanProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
};

export function Plan({ className, isStreaming = false, children, ...props }: PlanProps) {
  return (
    <PlanContext.Provider value={{ isStreaming }}>
      <Collapsible className="w-full min-w-0" data-slot="plan" {...props}>
        <Card
          className={cn(
            'w-full min-w-0 overflow-visible border border-border/60 bg-muted/20 shadow-none ring-0',
            className,
          )}
        >
          {children}
        </Card>
      </Collapsible>
    </PlanContext.Provider>
  );
}

export type PlanHeaderProps = ComponentProps<typeof CardHeader>;

export function PlanHeader({ className, ...props }: PlanHeaderProps) {
  return <CardHeader className={className} data-slot="plan-header" {...props} />;
}

export type PlanTitleProps = Omit<ComponentProps<typeof CardTitle>, 'children'> & {
  children: string;
};

export function PlanTitle({ children, ...props }: PlanTitleProps) {
  const { isStreaming } = usePlan();

  return (
    <CardTitle data-slot="plan-title" {...props}>
      {isStreaming ? <Shimmer>{children}</Shimmer> : children}
    </CardTitle>
  );
}

export type PlanDescriptionProps = Omit<ComponentProps<typeof CardDescription>, 'children'> & {
  children: string;
};

export function PlanDescription({ className, children, ...props }: PlanDescriptionProps) {
  const { isStreaming } = usePlan();

  return (
    <CardDescription
      className={cn('text-balance', className)}
      data-slot="plan-description"
      {...props}
    >
      {isStreaming ? <Shimmer>{children}</Shimmer> : children}
    </CardDescription>
  );
}

export type PlanActionProps = ComponentProps<typeof CardAction>;

export function PlanAction(props: PlanActionProps) {
  return <CardAction {...props} />;
}

export type PlanContentProps = ComponentProps<typeof CardContent>;

export function PlanContent(props: PlanContentProps) {
  return (
    <CollapsibleContent className="overflow-hidden">
      <CardContent data-slot="plan-content" {...props} />
    </CollapsibleContent>
  );
}

export type PlanFooterProps = ComponentProps<'div'>;

export function PlanFooter(props: PlanFooterProps) {
  return <CardFooter data-slot="plan-footer" {...props} />;
}

export type PlanTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export function PlanTrigger({ className, ...props }: PlanTriggerProps) {
  return (
    <CollapsibleTrigger
      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8', className)}
      data-slot="plan-trigger"
      {...props}
    >
      <ChevronsUpDownIcon className="size-4" />
      <span className="sr-only">Toggle plan</span>
    </CollapsibleTrigger>
  );
}
