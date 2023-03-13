import { Event } from "vscode";

type Arr = readonly unknown[];

interface EventStreamFunction<T, U, A extends Arr> {
  (...args: [...A, Event<T>]): Event<U>;
}

export abstract class EventStream<T> {
  abstract filter(fn: EventStreamFunction<T, T, []>): EventStream<T> & Event<T>;

  abstract map<U>(fn: EventStreamFunction<T, U, []>): EventStream<U> & Event<U>;

  abstract through<U, A extends Arr>(
    fn: EventStreamFunction<T, U, A>,
    ...args: A
  ): EventStream<U> & Event<U>;

  static of<T>(event: Event<T>): EventStream<T> & Event<T> {
    const result: EventStream<T> & Event<T> = (...args) => event(...args);
    result.filter = (fn) => EventStream.of(fn(event));
    result.map = (fn) => EventStream.of(fn(event));
    result.through = (fn, ...args) => EventStream.of(fn(...args, event));
    return result;
  }
}
