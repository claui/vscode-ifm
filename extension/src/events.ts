import { Event, Uri, Disposable } from "vscode";

import { throttle } from "throttle-debounce";

export interface EventGroup<T, U> {
  group: U,
  events: T[],
};

export function throttleEvent<T, U>(
  delayMs: number,
  groupBy: (event: T) => U,
  event: Event<T>
): Event<EventGroup<T, U>> {
  return (
    listener: (eventGroup: EventGroup<T, U>) => any,
    listenerThisArgs?: any,
    disposables?: Disposable[]
  ): Disposable => {
    const pendingEventsByGroup: Map<U, T[]> = new Map();
    const throttledListenersByGroup: Map<U, () => void> = new Map();
    const upstreamListener: (e: T) => void = (e) => {
      const group: U = groupBy(e);
      if (!pendingEventsByGroup.has(group)) {
        pendingEventsByGroup.set(group, []);
      }
      if (!throttledListenersByGroup.has(group)) {
        throttledListenersByGroup.set(group, throttle(delayMs, () => {
          const events: T[] = pendingEventsByGroup.get(group)!;
          pendingEventsByGroup.delete(group);
          listener.call(listenerThisArgs, { group, events });
        }));
      }
      pendingEventsByGroup.get(group)!.push(e);
      throttledListenersByGroup.get(group)!();
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
