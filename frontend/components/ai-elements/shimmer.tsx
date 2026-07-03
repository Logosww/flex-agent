'use client';

import { cn } from '@/lib/utils';
import { m, useReducedMotion } from 'motion/react';
import type { CSSProperties, ElementType } from 'react';

export interface TextShimmerProps {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
}

export function Shimmer({
  children,
  as: Component = 'p',
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) {
  const prefersReducedMotion = useReducedMotion();
  const dynamicSpread = (children?.length ?? 0) * spread;

  const shimmerClassName = cn(
    'relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent',
    '[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]',
    className,
  );

  const shimmerStyle = {
    '--spread': `${dynamicSpread}px`,
    backgroundImage:
      'var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))',
  } as CSSProperties;

  if (prefersReducedMotion) {
    return (
      <Component className={cn('text-muted-foreground', className)}>{children}</Component>
    );
  }

  if (Component === 'p') {
    return (
      <m.p
        animate={{ backgroundPosition: '0% center' }}
        className={shimmerClassName}
        initial={{ backgroundPosition: '100% center' }}
        style={shimmerStyle}
        transition={{
          duration,
          ease: 'linear',
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        {children}
      </m.p>
    );
  }

  return (
    <Component className={className}>
      <m.p
        animate={{ backgroundPosition: '0% center' }}
        className={shimmerClassName}
        initial={{ backgroundPosition: '100% center' }}
        style={shimmerStyle}
        transition={{
          duration,
          ease: 'linear',
          repeat: Number.POSITIVE_INFINITY,
        }}
      >
        {children}
      </m.p>
    </Component>
  );
}
