import { Event, Uri, Disposable } from "vscode";

import { throttle } from "throttle-debounce";

export function throttleEvent<T, U>(
  delayMs: number,
  groupBy: (event: T) => U,
  event: Event<T>
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
    return event(upstreamListener, undefined, disposables);
  };
}

export class EventFilterByScheme {
  #schemesToExclude: Array<String>;

  constructor(schemesToExclude: Iterable<String>) {
    this.#schemesToExclude = Array.from(schemesToExclude);
  }

  isSchemeRelevant(uri: Uri): boolean {
    return !this.#schemesToExclude.includes(uri.scheme);
  }

  filter<T>(uriSupplier: (event: T) => Uri, event: Event<T>): Event<T> {
    return (
      listener: (e: T) => any,
      listenerThisArgs?: any,
      disposables?: Disposable[]
    ): Disposable => {
      const filterThis: this = this;
      const upstreamListener: (e: T) => any = (e) => {
        const uri = uriSupplier(e);
        if (!this.isSchemeRelevant(uri)) {
          return;
        }
        return listener.call(listenerThisArgs, e);
      };
      return event(upstreamListener, filterThis, disposables);
    };
  }
}
