'use client';

import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import { ConfirmDialog } from './confirm-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { useDeleteSessionMutation, useUpdateSessionMutation } from '@/lib/queries/sessions';
import type { ChatSessionMeta } from '@/lib/api/sessions';

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

interface SessionListItemProps {
  session: ChatSessionMeta;
  active: boolean;
  onSelect: (id: string) => void;
  onDeleted?: (id: string) => void;
}

export function SessionListItem({ session, active, onSelect, onDeleted }: SessionListItemProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState('');
  const updateMutation = useUpdateSessionMutation();
  const deleteMutation = useDeleteSessionMutation();

  const openRename = () => {
    setRenameDraft(session.title);
    setRenameOpen(true);
  };

  const handleRenameOpenChange = (open: boolean) => {
    setRenameOpen(open);
  };

  const handleRename = () => {
    const nextTitle = renameDraft.trim();
    if (!nextTitle || nextTitle === session.title) {
      setRenameOpen(false);
      return;
    }
    updateMutation.mutate(
      { id: session.id, patch: { title: nextTitle } },
      { onSuccess: () => setRenameOpen(false) },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(session.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        onDeleted?.(session.id);
      },
    });
  };

  return (
    <>
      <div
        className={cn(
          'group flex items-center gap-0.5 rounded-lg pr-1 transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_3.5rem]',
          active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(session.id)}
          className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2.5 text-left"
        >
          <span className="line-clamp-1 w-full text-sm font-medium">{session.title}</span>
          <span
            className={cn(
              'text-xs',
              active ? 'text-accent-foreground/70' : 'text-muted-foreground',
            )}
          >
            {formatRelativeTime(session.updatedAt)}
          </span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                aria-label="会话操作"
                onClick={(e) => e.stopPropagation()}
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            sideOffset={4}
            className="min-w-36 w-auto shadow-lg"
          >
            <DropdownMenuItem onClick={openRename}>
              <PencilIcon />
              重命名
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2Icon />
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={renameOpen} onOpenChange={handleRenameOpenChange}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重命名会话</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            placeholder="会话标题"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
            }}
          />
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              取消
            </Button>
            <Button onClick={handleRename} disabled={!renameDraft.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? <Spinner data-icon="inline-start" /> : null}
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除会话"
        description={`确定删除「${session.title}」？此操作无法撤销。`}
        confirmLabel="删除"
        onConfirm={handleDelete}
        loading={deleteMutation.isPending}
      />
    </>
  );
}
