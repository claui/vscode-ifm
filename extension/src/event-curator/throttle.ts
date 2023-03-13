import { Event } from "vscode";

import { throttle } from "throttle-debounce";

/*
 * Each entry in this map corresponds to a single invocation of the
 * throttled listener.
 *
 * A key represents the group of events that will be handed to the
 * invocation as an argument. It is defined as the result of invoking
 * the `groupBy` function on any member of the group,
 *
 * A map value is an invocation of `listener`, wrapped in `throttle`
 * so that we’re going to invoke `listener` exactly once per entry.
 */
type _ListenerMap<U> = Map<U, () => void>;

function _throttleEvent<T, U>(
  delayMs: number,
  groupBy: (event: T) => U,
  upstreamEvent: Event<T>,
  ...[listener, listenerThisArgs, disposables]: Parameters<Event<U>>
) {

  // Keys: compound payloads
  // Values: throttled invocations of compound events
  const listenerMap: _ListenerMap<U> = new Map();

  function upstreamListener(groupableEvent: T): void {
    const key: U = groupBy(groupableEvent);

    if (!listenerMap.has(key)) {
      const boundUpstreamListener: () => void =
        listener.bind(listenerThisArgs, key);
      listenerMap.set(key, throttle(delayMs, boundUpstreamListener));
    }

    const throttledListener: () => void = listenerMap.get(key)!;
    throttledListener();
  }

  return upstreamEvent(upstreamListener, null, disposables);
}

/**
 * Fires a single compound event for each group of individual upstream events
 * which occur in a given time window.
 *
 * @param delayMs how long the throttled event should wait before firing.
 *
 * @param groupBy maps an upstream event to an event group.
 * If multiple upstream events share a group and occur within the given
 * time window, they will trigger a single compound event. The compound event
 * will fire after the time window has elapsed.
 *
 * @returns a function that transforms a fine-grained VS Code event source
 * to a coarser, throttled event source, so that a single compound event fires
 * at most every `delayMs` milliseconds for each event group.
 *
 * @type T Original payload type of the upstream event.
 *
 * @type U Output payload type, which will be passed as a parameter to the
 *         compound event when it fires.
 *         Instances of U may not have internal state, and they cannot be
 *         mutable.
 */
export function throttleEvent<T, U>(delayMs: number, groupBy: (event: T) => U) {
  return (upstreamEvent: Event<T>) => {
    return (...eventArgs: Parameters<Event<U>>) => {
      return _throttleEvent(delayMs, groupBy, upstreamEvent, ...eventArgs);
    };
  };
}
