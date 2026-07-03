import { submitCollectUserInput } from '@/lib/ws/collect-user-input-session';
import { z } from 'zod';

const bodySchema = z.object({
  tool_call_id: z.string(),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: '参数无效' }, { status: 400 });
  }

  try {
    submitCollectUserInput(parsed.data.tool_call_id, parsed.data.values);
    return new Response(null, { status: 204 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '提交失败';
    return Response.json({ error: message }, { status: 409 });
  }
}
