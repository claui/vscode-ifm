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
