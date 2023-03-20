import { Event } from "vscode";

type Arr = readonly unknown[];

export interface EventStreamFunction<T, U, A extends Arr> {
  (...args: [...A, Event<T>]): Event<U>;
}

export interface EventStream<T> {
  select(fn: EventStreamFunction<T, T, []>): EventStream<T> & Event<T>;
  map<U>(fn: EventStreamFunction<T, U, []>): EventStream<U> & Event<U>;
}

export function stream<T>(event: Event<T>): EventStream<T> & Event<T> {
  const result: EventStream<T> & Event<T> = (...args) => event(...args);
  result.select = (fn) => stream(fn(event));
  result.map = (fn) => stream(fn(event));
  return result;
}
