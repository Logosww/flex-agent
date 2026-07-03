export async function submitCollectUserInput(
  toolCallId: string,
  values: Record<string, string | number | boolean>,
): Promise<void> {
  const res = await fetch('/api/chat/form-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool_call_id: toolCallId, values }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? '提交失败');
  }
}
