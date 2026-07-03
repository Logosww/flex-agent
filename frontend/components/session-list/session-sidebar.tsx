'use client';

import { MessageSquareIcon, PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SessionListItem } from './session-list-item';
import { SessionListItemSkeleton } from './session-list-item-skeleton';
import { SessionSidebarToggle } from './session-sidebar-toggle';
import { cn } from '@/lib/utils';
import { useSessionsQuery } from '@/lib/queries/sessions';
import { isMobileSidebarViewport } from './use-responsive-sidebar';

interface SessionListProps {
  activeSessionId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onSessionDeleted?: (id: string) => void;
  onToggleSidebar?: () => void;
  sidebarExpanded?: boolean;
}

export function SessionList({
  activeSessionId,
  onSelect,
  onCreate,
  onSessionDeleted,
  onToggleSidebar,
  sidebarExpanded = true,
}: SessionListProps) {
  const { data: sessions = [], isLoading } = useSessionsQuery();

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-3 py-3">
        <span className="text-sm font-semibold text-foreground">会话</span>
        <div className="flex items-center gap-0.5">
          {onToggleSidebar ? (
            <SessionSidebarToggle expanded={sidebarExpanded} onToggle={onToggleSidebar} />
          ) : null}
          <Button variant="ghost" size="icon-sm" onClick={onCreate} aria-label="新建会话">
            <PlusIcon />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <ScrollArea className="min-w-0 flex-1 overflow-x-hidden">
          <div className="flex min-w-0 flex-col gap-0.5 p-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <SessionListItemSkeleton key={index} />
            ))}
          </div>
        </ScrollArea>
      ) : sessions.length === 0 ? (
        <Empty className="flex-1 border-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareIcon />
            </EmptyMedia>
            <EmptyTitle>暂无会话</EmptyTitle>
            <EmptyDescription>点击右上角新建会话</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ScrollArea className="min-w-0 flex-1 overflow-x-hidden">
          <div className="flex min-w-0 flex-col gap-0.5 p-2">
            {sessions.map((session) => (
              <SessionListItem
                key={session.id}
                session={session}
                active={session.id === activeSessionId}
                onSelect={onSelect}
                onDeleted={onSessionDeleted}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );
}

interface SessionSidebarProps extends SessionListProps {
  expanded: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export function SessionSidebar({
  activeSessionId,
  onSelect,
  onCreate,
  onSessionDeleted,
  expanded,
  onExpandedChange,
  onToggleSidebar,
}: SessionSidebarProps) {
  const handleSelect = (id: string) => {
    onSelect(id);
    if (isMobileSidebarViewport()) {
      onExpandedChange?.(false);
    }
  };

  return (
    <aside
      className={cn(
        'flex h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-muted/30 transition-[width] duration-200 ease-in-out',
        expanded ? 'w-64' : 'w-0',
      )}
    >
      <div className="flex h-full w-64 min-w-64 flex-col">
        <SessionList
          activeSessionId={activeSessionId}
          onSelect={handleSelect}
          onCreate={onCreate}
          onSessionDeleted={onSessionDeleted}
          onToggleSidebar={expanded ? onToggleSidebar : undefined}
          sidebarExpanded={expanded}
        />
      </div>
    </aside>
  );
}
