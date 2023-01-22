import { Disposable, Event } from "vscode";

import { throttle } from "throttle-debounce";

export function throttleEvent<T, U>(
  delayMs: number,
  groupBy: (event: T) => U,
  upstreamEvent: Event<T>
): Event<U> {
  return (
    listener: (eventGroup: U) => any,
    listenerThisArgs?: any,
    disposables?: Disposable[]
  ): Disposable => {
    const throttledListenersByGroup: Map<U, () => void> = new Map();
    const upstreamListener: (e: T) => void = (e) => {
      const eventGroup: U = groupBy(e);
      if (!throttledListenersByGroup.has(eventGroup)) {
        throttledListenersByGroup.set(
          eventGroup,
          throttle(delayMs, listener.bind(listenerThisArgs, eventGroup))
        );
      }
      throttledListenersByGroup.get(eventGroup)!();
    };
    return upstreamEvent(upstreamListener, undefined, disposables);
  };
}

