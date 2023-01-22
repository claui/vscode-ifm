import { Event } from "vscode";

type Arr = readonly unknown[];

interface EventStreamFunction<T, U, A extends Arr> {
  (...args: [...A, Event<T>]): Event<U>;
}

class EventStream<T> {
  #upstreamEvent: Event<T>;

  constructor(event: Event<T>) {
    this.#upstreamEvent = event;
  }

  through<U, A extends Arr>(
    fn: EventStreamFunction<T, U, A>,
    ...args: A
  ): EventStream<U> {
    return streamEvents(fn(...args, this.#upstreamEvent));
  }

  commit(): Event<T> {
    return this.#upstreamEvent;
  }
}

export function streamEvents<T>(event: Event<T>): EventStream<T> {
  return new EventStream(event);
}
