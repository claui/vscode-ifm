import {
  DocumentSelector,
  Event,
  languages,
  TextDocument,
  TextDocumentChangeEvent,
  Uri,
} from "vscode";
import { EventStreamFunction } from "./stream";

const schemesToExclude: string[] = ["git", "gitfs", "output", "vscode"];
const ifmLanguageSelector: DocumentSelector = { language: "ifm" };

export function relevantChangeEventsByLanguage(
  selector: DocumentSelector,
): EventStreamFunction<TextDocumentChangeEvent, TextDocumentChangeEvent, []> {
  return (event) => {
    return select((e) => !!languages.match(selector, e.document), event);
  }
}

export function relevantTextDocumentsByLanguage(
  event: Event<TextDocument>,
): Event<TextDocument> {
  return select(
    (document: TextDocument) =>
      !!languages.match(ifmLanguageSelector, document),
    event,
  );
}

export function relevantChangeEventsByScheme(
  event: Event<TextDocumentChangeEvent>,
): Event<TextDocumentChangeEvent> {
  return excludeUriSchemes(
    (e: TextDocumentChangeEvent) => e.document.uri,
    event,
  );
}

export function relevantTextDocumentsByScheme(
  event: Event<TextDocument>,
): Event<TextDocument> {
  return excludeUriSchemes(
    (document: TextDocument) => document.uri,
    event,
  );
}

export function excludeUriSchemes<T>(
  extractUri: (event: T) => Uri,
  upstreamEvent: Event<T>,
): Event<T> {
  const schemesToExcludeArray: String[] = Array.from(schemesToExclude);
  function isSchemeRelevant(uri: Uri): boolean {
    return !schemesToExcludeArray.includes(uri.scheme);
  }
  return select((e: T) => isSchemeRelevant(extractUri(e)), upstreamEvent);
}

export function ignoreIfAlreadyClosed(
  upstreamEvent: Event<TextDocument>,
): Event<TextDocument> {
  return select((document: TextDocument) => !document.isClosed, upstreamEvent);
}

/**
 * @this any passed through to the upstream event.
 */
export function select<T>(
  match: (e: T) => boolean,
  upstreamEvent: Event<T>,
): Event<T> {
  return (
    ...[listener, listenerThisArgs, disposables]: Parameters<Event<T>>
  ) => {
    const upstreamListener: (e: T) => any = (e) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return match(e) ? listener.call(listenerThisArgs, e) : null;
    };
    return upstreamEvent(upstreamListener, this, disposables);
  };
}
