'use client';

import { ChatPanel } from '@/components/chat-panel/chat-panel';
import { ChatPanelSkeleton } from '@/components/chat-panel/chat-panel-skeleton';
import { ServiceUnavailable } from '@/components/service-unavailable';
import { SessionListItemSkeleton } from '@/components/session-list/session-list-item-skeleton';
import { SessionSidebar } from '@/components/session-list/session-sidebar';
import { useResponsiveSidebar } from '@/components/session-list/use-responsive-sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useActiveSession } from '@/lib/hooks/use-active-session';

export default function HomeClient() {
  const {
    expanded: sidebarExpanded,
    setExpanded: setSidebarExpanded,
    toggle: toggleSidebar,
  } = useResponsiveSidebar();
  const {
    activeSessionId,
    isDraftActive,
    isReady,
    isSessionsError,
    selectSession,
    createNewSession,
    markSessionPersisted,
    handleSessionDeleted,
  } = useActiveSession();

  if (isSessionsError) {
    return <ServiceUnavailable />;
  }

  if (!isReady || !activeSessionId) {
    return (
      <div className="flex h-full min-h-0 w-full flex-1">
        <aside
          className={cn(
            'shrink-0 overflow-hidden border-r border-border bg-muted/30 transition-[width] duration-200',
            sidebarExpanded ? 'w-64' : 'w-0',
          )}
        >
          <div className="flex h-full w-64 min-w-64 flex-col">
            <div className="border-b border-border px-3 py-3">
              <Skeleton className="h-5 w-8" />
            </div>
            <div className="flex min-w-0 flex-col gap-0.5 p-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <SessionListItemSkeleton key={index} />
              ))}
            </div>
          </div>
        </aside>
        <ChatPanelSkeleton />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1">
      <SessionSidebar
        activeSessionId={activeSessionId}
        onSelect={selectSession}
        onCreate={createNewSession}
        onSessionDeleted={handleSessionDeleted}
        expanded={sidebarExpanded}
        onExpandedChange={setSidebarExpanded}
        onToggleSidebar={toggleSidebar}
      />
      <ChatPanel
        key={activeSessionId}
        sessionId={activeSessionId}
        isDraft={isDraftActive}
        sidebarExpanded={sidebarExpanded}
        onToggleSidebar={toggleSidebar}
        onSessionPersisted={markSessionPersisted}
      />
    </div>
  );
}
