'use client';

import { useMutation } from '@tanstack/react-query';
import { submitCollectUserInput } from '@/lib/api/collect-user-input';

export function useSubmitCollectUserInputMutation() {
  return useMutation({
    mutationFn: ({
      toolCallId,
      values,
    }: {
      toolCallId: string;
      values: Record<string, string | number | boolean>;
    }) => submitCollectUserInput(toolCallId, values),
  });
}
