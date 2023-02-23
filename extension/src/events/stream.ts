import { Event } from "vscode";

type Arr = readonly unknown[];

interface EventStreamFunction<T, U, A extends Arr> {
  (...args: [...A, Event<T>]): Event<U>;
}

export class EventStream<T> {
  event: Event<T>;

  map<U>(fn: (e: Event<T>) => Event<U>): EventStream<U> & Event<U> {
    return EventStream.of(fn(this.event));
  }

  through<U, A extends Arr>(
    fn: EventStreamFunction<T, U, A>,
    ...args: A
  ): EventStream<U> & Event<U> {
    return EventStream.of(fn(...args, this.event));
  }

  static of<T>(event: Event<T>): EventStream<T> & Event<T> {
    const result: EventStream<T> & Event<T> = (...args) => event(...args);
    result.map = EventStream.prototype.map;
    result.through = EventStream.prototype.through;
    result.event = event;
    return result;
  }
}
