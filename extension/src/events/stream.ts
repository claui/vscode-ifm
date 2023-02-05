import { Event } from "vscode";

type Arr = readonly unknown[];

interface EventStreamFunction<T, U, A extends Arr> {
  (...args: [...A, Event<T>]): Event<U>;
}

interface EventStream<T> extends Event<T> {
  through<U, A extends Arr>(
    fn: EventStreamFunction<T, U, A>,
    ...args: A
  ): EventStream<U>;
}

export function streamEvents<T>(event: Event<T>): EventStream<T> {
  const stream: EventStream<T> = function (...args) {
    return event(...args);
  };
  stream.through = (fn, ...args) => {
    return streamEvents(fn(...args, event));
  };
  return stream;
}
