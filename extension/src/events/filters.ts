import { Disposable, Event, TextDocument, Uri } from "vscode";

export function excludeUriSchemes<T>(
  schemesToExclude: Iterable<String>,
  extractUri: (event: T) => Uri,
  upstreamEvent: Event<T>
): Event<T> {
  const schemesToExcludeArray: String[] = Array.from(schemesToExclude);
  function isSchemeRelevant(uri: Uri): boolean {
    return !schemesToExcludeArray.includes(uri.scheme);
  }
  return select((e: T) => isSchemeRelevant(extractUri(e)), upstreamEvent);
}

export function ignoreIfAlreadyClosed(
  upstreamEvent: Event<TextDocument>
): Event<TextDocument> {
  return select((document: TextDocument) => !document.isClosed, upstreamEvent);
}

export function select<T>(
  match: (e: T) => boolean,
  upstreamEvent: Event<T>
): Event<T> {
  return (
    listener: (e: T) => any,
    listenerThisArgs?: any,
    disposables?: Disposable[]
  ): Disposable => {
    const upstreamListener: (e: T) => any = (e) => {
      return match(e) ? listener.call(listenerThisArgs, e) : undefined;
    };
    return upstreamEvent(upstreamListener, this, disposables);
  };
}
