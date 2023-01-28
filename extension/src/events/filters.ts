import {
  Disposable,
  DocumentSelector,
  Event,
  languages,
  TextDocument,
  TextDocumentChangeEvent,
  Uri,
} from "vscode";

const schemesToExclude: string[] = ["git", "gitfs", "output", "vscode"];
const ifmLanguageSelector: DocumentSelector = { language: "ifm" };

export function excludeIrrelevantChangeEventsByLanguage(
  event: Event<TextDocumentChangeEvent>
): Event<TextDocumentChangeEvent> {
  return select(
    (e: TextDocumentChangeEvent) =>
      !!languages.match(ifmLanguageSelector, e.document),
    event
  );
}

export function excludeIrrelevantTextDocumentsByLanguage(
  event: Event<TextDocument>
): Event<TextDocument> {
  return select(
    (document: TextDocument) =>
      !!languages.match(ifmLanguageSelector, document),
    event
  );
}

export function excludeIrrelevantChangeEventsByScheme(
  event: Event<TextDocumentChangeEvent>
): Event<TextDocumentChangeEvent> {
  return excludeUriSchemes(
    schemesToExclude,
    (e: TextDocumentChangeEvent) => e.document.uri,
    event
  );
}

export function excludeIrrelevantTextDocumentsByScheme(
  event: Event<TextDocument>
): Event<TextDocument> {
  return excludeUriSchemes(
    schemesToExclude,
    (document: TextDocument) => document.uri,
    event
  );
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