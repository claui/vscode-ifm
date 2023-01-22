import { Event, Uri, Disposable, TextDocument } from "vscode";

import { throttle } from "throttle-debounce";

type Arr = readonly unknown[];

export interface FilterFunction<T, U, A extends Arr> {
  (...args: [...A, Event<T>]): Event<U>;
}

export function filterEvent<T>(event: Event<T>): FilterEvent<T> {
  return new FilterEvent(event);
}

class FilterEvent<T> {
  #upstreamEvent: Event<T>;

  constructor(event: Event<T>) {
    this.#upstreamEvent = event;
  }

  through<U, A extends Arr>(
    fn: FilterFunction<T, U, A>,
    ...args: A
  ): FilterEvent<U> {
    return filterEvent(fn(...args, this.#upstreamEvent));
  }

  commit(): Event<T> {
    return this.#upstreamEvent;
  }
}

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

export function excludeUriSchemes<T>(
  schemesToExclude: Iterable<String>,
  extractUri: (event: T) => Uri,
  upstreamEvent: Event<T>
): Event<T> {
  const schemesToExcludeArray: String[] = Array.from(schemesToExclude);

  function isSchemeRelevant(uri: Uri): boolean {
    return !schemesToExcludeArray.includes(uri.scheme);
  }

  return (
    listener: (e: T) => any,
    listenerThisArgs?: any,
    disposables?: Disposable[]
  ): Disposable => {
    const upstreamListener: (e: T) => any = (e) => {
      if (!isSchemeRelevant(extractUri(e))) {
        return;
      }
      return listener.call(listenerThisArgs, e);
    };
    return upstreamEvent(upstreamListener, this, disposables);
  };
}

export function ignoreIfAlreadyClosed(
  upstreamEvent: Event<TextDocument>
): Event<TextDocument> {
  return (
    listener: (document: TextDocument) => any,
    listenerThisArgs?: any,
    disposables?: Disposable[]
  ): Disposable => {
    const upstreamListener: (document: TextDocument) => any = (document) => {
      if (document.isClosed) {
        return;
      }
      return listener.call(listenerThisArgs, document);
    };
    return upstreamEvent(upstreamListener, this, disposables);
  };
}
