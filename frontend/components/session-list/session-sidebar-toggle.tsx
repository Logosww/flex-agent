'use client';

import { SidebarToggleIcon } from '@/components/unlumen-ui/sidebar-toggle-icon';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SessionSidebarToggleProps {
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}

export function SessionSidebarToggle({ expanded, onToggle, className }: SessionSidebarToggleProps) {
  const label = expanded ? '收起会话列表' : '展开会话列表';

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(className)}
            onClick={onToggle}
            aria-label={label}
          />
        }
      >
        <SidebarToggleIcon isOpen={expanded} className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
