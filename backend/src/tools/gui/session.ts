import { AsyncLocalStorage } from 'node:async_hooks';

type GuiSessionStore = { connectionId: string };

const guiSessionAls = new AsyncLocalStorage<GuiSessionStore>();

const viewMapsByConnection = new Map<string, Map<string, Bun.WebView>>();

export function getViewMap(): Map<string, Bun.WebView> | null {
  const connectionId = guiSessionAls.getStore()?.connectionId;
  if (!connectionId) return null;
  let map = viewMapsByConnection.get(connectionId);
  if (!map) {
    map = new Map();
    viewMapsByConnection.set(connectionId, map);
  }
  return map;
}

export function runWithGuiConnection<T>(connectionId: string, fn: () => T): T {
  return guiSessionAls.run({ connectionId }, fn);
}

export function releaseConnectionGui(connectionId: string): void {
  const map = viewMapsByConnection.get(connectionId);
  if (!map) return;
  for (const view of map.values()) {
    view.close();
  }
  viewMapsByConnection.delete(connectionId);
}
