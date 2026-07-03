'use client';

import { useEffect, useState } from 'react';

export const MOBILE_SIDEBAR_QUERY = '(max-width: 1023px)';

export function isMobileSidebarViewport() {
  return window.matchMedia(MOBILE_SIDEBAR_QUERY).matches;
}

function getInitialExpanded() {
  if (typeof window === 'undefined') return true;
  return !window.matchMedia(MOBILE_SIDEBAR_QUERY).matches;
}

export function useResponsiveSidebar() {
  const [expanded, setExpanded] = useState(getInitialExpanded);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_SIDEBAR_QUERY);
    const sync = () => setExpanded(!mq.matches);
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const toggle = () => setExpanded((prev) => !prev);

  return { expanded, setExpanded, toggle };
}
