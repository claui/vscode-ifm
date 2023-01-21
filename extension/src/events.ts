import { Event, Uri, Disposable } from "vscode";
import log from "./log";

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
