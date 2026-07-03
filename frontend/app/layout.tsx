import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { RuntimeEnvProvider } from '@/components/runtime-env-provider';
import { LazyMotionProvider } from '@/components/motion/lazy-motion-provider';
import { QueryProvider } from '@/components/query-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Flex Agent',
  description: '具备生成式界面的多模态计算机控制代理',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const modelId = process.env.MODEL_ID ?? DEFAULT_MODEL_ID;
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full min-h-0 flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LazyMotionProvider>
            <RuntimeEnvProvider modelId={modelId}>
              <QueryProvider>
                <TooltipProvider>
                  <div className="flex min-h-0 flex-1 flex-col w-full">{children}</div>
                </TooltipProvider>
              </QueryProvider>
            </RuntimeEnvProvider>
          </LazyMotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
