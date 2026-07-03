'use client';

import type { FileUIPart, SourceDocumentUIPart } from 'ai';
import { nanoid } from 'nanoid';
import type {
  ChangeEventHandler,
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
} from 'react';
import { useEffect, useRef, useState } from 'react';

import type { AttachmentsContext, ReferencedSourcesContext } from './context';
import { useOptionalPromptInputController } from './context';
import { convertBlobUrlToDataUrl } from './helpers';

export interface PromptInputMessage {
  text: string;
  files: FileUIPart[];
}

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onError'> & {
  accept?: string;
  multiple?: boolean;
  globalDrop?: boolean;
  syncHiddenInput?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  onError?: (err: { code: 'max_files' | 'max_file_size' | 'accept'; message: string }) => void;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
};

export function usePromptInputForm({
  accept,
  globalDrop,
  maxFiles,
  maxFileSize,
  onError,
  onSubmit,
  syncHiddenInput,
}: Pick<
  PromptInputProps,
  'accept' | 'globalDrop' | 'maxFiles' | 'maxFileSize' | 'onError' | 'onSubmit' | 'syncHiddenInput'
>) {
  const controller = useOptionalPromptInputController();
  const usingProvider = !!controller;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const [items, setItems] = useState<(FileUIPart & { id: string })[]>([]);
  const files = usingProvider ? controller.attachments.files : items;

  const [referencedSources, setReferencedSources] = useState<
    (SourceDocumentUIPart & { id: string })[]
  >([]);

  const filesRef = useRef(files);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const openFileDialogLocal = () => {
    inputRef.current?.click();
  };

  const matchesAccept = (f: File) => {
    if (!accept || accept.trim() === '') {
      return true;
    }

    const patterns = accept
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return patterns.some((pattern) => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -1);
        return f.type.startsWith(prefix);
      }
      return f.type === pattern;
    });
  };

  const addLocal = (fileList: File[] | FileList) => {
    const incoming = [...fileList];
    const accepted = incoming.filter((f) => matchesAccept(f));
    if (incoming.length && accepted.length === 0) {
      onError?.({
        code: 'accept',
        message: 'No files match the accepted types.',
      });
      return;
    }
    const withinSize = (f: File) => (maxFileSize ? f.size <= maxFileSize : true);
    const sized = accepted.filter(withinSize);
    if (accepted.length > 0 && sized.length === 0) {
      onError?.({
        code: 'max_file_size',
        message: 'All files exceed the maximum size.',
      });
      return;
    }

    setItems((prev) => {
      const capacity =
        typeof maxFiles === 'number' ? Math.max(0, maxFiles - prev.length) : undefined;
      const capped = typeof capacity === 'number' ? sized.slice(0, capacity) : sized;
      if (typeof capacity === 'number' && sized.length > capacity) {
        onError?.({
          code: 'max_files',
          message: 'Too many files. Some were not added.',
        });
      }
      const next: (FileUIPart & { id: string })[] = [];
      for (const file of capped) {
        next.push({
          filename: file.name,
          id: nanoid(),
          mediaType: file.type,
          type: 'file',
          url: URL.createObjectURL(file),
        });
      }
      return [...prev, ...next];
    });
  };

  const removeLocal = (id: string) =>
    setItems((prev) => {
      const found = prev.find((file) => file.id === id);
      if (found?.url) {
        URL.revokeObjectURL(found.url);
      }
      return prev.filter((file) => file.id !== id);
    });

  const addWithProviderValidation = (fileList: File[] | FileList) => {
    const incoming = [...fileList];
    const accepted = incoming.filter((f) => matchesAccept(f));
    if (incoming.length && accepted.length === 0) {
      onError?.({
        code: 'accept',
        message: 'No files match the accepted types.',
      });
      return;
    }
    const withinSize = (f: File) => (maxFileSize ? f.size <= maxFileSize : true);
    const sized = accepted.filter(withinSize);
    if (accepted.length > 0 && sized.length === 0) {
      onError?.({
        code: 'max_file_size',
        message: 'All files exceed the maximum size.',
      });
      return;
    }

    const currentCount = files.length;
    const capacity =
      typeof maxFiles === 'number' ? Math.max(0, maxFiles - currentCount) : undefined;
    const capped = typeof capacity === 'number' ? sized.slice(0, capacity) : sized;
    if (typeof capacity === 'number' && sized.length > capacity) {
      onError?.({
        code: 'max_files',
        message: 'Too many files. Some were not added.',
      });
    }

    if (capped.length > 0) {
      controller?.attachments.add(capped);
    }
  };

  const clearAttachments = () =>
    usingProvider
      ? controller?.attachments.clear()
      : setItems((prev) => {
          for (const file of prev) {
            if (file.url) {
              URL.revokeObjectURL(file.url);
            }
          }
          return [];
        });

  const clearReferencedSources = () => setReferencedSources([]);

  const add = usingProvider ? addWithProviderValidation : addLocal;
  const remove = usingProvider ? controller.attachments.remove : removeLocal;
  const openFileDialog = usingProvider
    ? controller.attachments.openFileDialog
    : openFileDialogLocal;

  const clear = () => {
    clearAttachments();
    clearReferencedSources();
  };

  useEffect(() => {
    if (!usingProvider) {
      return;
    }
    controller.__registerFileInput(inputRef, () => inputRef.current?.click());
  }, [usingProvider, controller]);

  useEffect(() => {
    if (syncHiddenInput && inputRef.current && files.length === 0) {
      inputRef.current.value = '';
    }
  }, [files, syncHiddenInput]);

  useEffect(() => {
    const form = formRef.current;
    if (!form) {
      return;
    }
    if (globalDrop) {
      return;
    }

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    };
    form.addEventListener('dragover', onDragOver);
    form.addEventListener('drop', onDrop);
    return () => {
      form.removeEventListener('dragover', onDragOver);
      form.removeEventListener('drop', onDrop);
    };
  }, [add, globalDrop]);

  useEffect(() => {
    if (!globalDrop) {
      return;
    }

    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };
    const onDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        add(e.dataTransfer.files);
      }
    };
    document.addEventListener('dragover', onDragOver);
    document.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('dragover', onDragOver);
      document.removeEventListener('drop', onDrop);
    };
  }, [add, globalDrop]);

  useEffect(
    () => () => {
      if (!usingProvider) {
        for (const f of filesRef.current) {
          if (f.url) {
            URL.revokeObjectURL(f.url);
          }
        }
      }
    },
    [usingProvider],
  );

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.currentTarget.files) {
      add(event.currentTarget.files);
    }
    event.currentTarget.value = '';
  };

  const attachmentsCtx: AttachmentsContext = {
    add,
    clear: clearAttachments,
    fileInputRef: inputRef,
    files: files.map((item) => ({ ...item, id: item.id })),
    openFileDialog,
    remove,
  };

  const refsCtx: ReferencedSourcesContext = {
    add: (incoming) => {
      const array = Array.isArray(incoming) ? incoming : [incoming];
      setReferencedSources((prev) => [...prev, ...array.map((s) => ({ ...s, id: nanoid() }))]);
    },
    clear: clearReferencedSources,
    remove: (id: string) => {
      setReferencedSources((prev) => prev.filter((s) => s.id !== id));
    },
    sources: referencedSources,
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const text = usingProvider
      ? controller.textInput.value
      : (() => {
          const formData = new FormData(form);
          return (formData.get('message') as string) || '';
        })();

    if (!usingProvider) {
      form.reset();
    }

    try {
      const convertedFiles: FileUIPart[] = await Promise.all(
        files.map(async ({ id: _id, ...item }) => {
          if (item.url?.startsWith('blob:')) {
            const dataUrl = await convertBlobUrlToDataUrl(item.url);
            return {
              ...item,
              url: dataUrl ?? item.url,
            };
          }
          return item;
        }),
      );

      const result = onSubmit({ files: convertedFiles, text }, event);

      if (result instanceof Promise) {
        try {
          await result;
          clear();
          if (usingProvider) {
            controller.textInput.clear();
          }
        } catch {}
      } else {
        clear();
        if (usingProvider) {
          controller.textInput.clear();
        }
      }
    } catch {}
  };

  return {
    attachmentsCtx,
    formRef,
    handleChange,
    handleSubmit,
    inputRef,
    refsCtx,
  };
}
