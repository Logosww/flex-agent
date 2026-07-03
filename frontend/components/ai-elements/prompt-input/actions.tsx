'use client';

import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ImageIcon, Monitor } from 'lucide-react';
import type { ComponentProps } from 'react';

import { captureScreenshot } from './helpers';
import { usePromptInputAttachments } from './context';

export type PromptInputActionAddAttachmentsProps = ComponentProps<typeof DropdownMenuItem> & {
  label?: string;
};

export const PromptInputActionAddAttachments = ({
  label = 'Add photos or files',
  ...props
}: PromptInputActionAddAttachmentsProps) => {
  const attachments = usePromptInputAttachments();

  const handleSelect = (e: unknown) => {
    (e as Event).preventDefault?.();
    attachments.openFileDialog();
  };

  return (
    <DropdownMenuItem {...props} onSelect={handleSelect as never}>
      <ImageIcon className="mr-2 size-4" /> {label}
    </DropdownMenuItem>
  );
};

export type PromptInputActionAddScreenshotProps = ComponentProps<typeof DropdownMenuItem> & {
  label?: string;
};

export const PromptInputActionAddScreenshot = ({
  label = 'Take screenshot',
  onSelect,
  ...props
}: PromptInputActionAddScreenshotProps) => {
  const attachments = usePromptInputAttachments();

  const handleSelect = async (event: unknown) => {
    onSelect?.(event as never);
    if ((event as Event).defaultPrevented) {
      return;
    }

    try {
      const screenshot = await captureScreenshot();
      if (screenshot) {
        attachments.add([screenshot]);
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'AbortError')
      ) {
        return;
      }
      throw error;
    }
  };

  return (
    <DropdownMenuItem {...props} onSelect={handleSelect as never}>
      <Monitor className="mr-2 size-4" />
      {label}
    </DropdownMenuItem>
  );
};
