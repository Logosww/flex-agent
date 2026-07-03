import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export function pngBytesToDataUrl(png: Uint8Array): string {
  return `data:image/png;base64,${Buffer.from(png).toString('base64')}`;
}

export function userMessageWithImageDataUrl(
  text: string,
  dataUrl: string,
): ChatCompletionMessageParam {
  return {
    role: 'user',
    content: [
      { type: 'text', text },
      { type: 'image_url', image_url: { url: dataUrl } },
    ],
  };
}
