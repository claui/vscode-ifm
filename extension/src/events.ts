import {
  Disposable,
  DocumentSelector,
  Event,
  languages,
  TextDocument,
  TextDocumentChangeEvent,
  workspace,
} from "vscode";

import {
  excludeUriSchemes,
  ignoreIfAlreadyClosed,
  select,
} from "./events/filters";
import { streamEvents } from "./events/stream";
import { throttleEvent } from "./events/throttle";

const schemesToExclude: string[] = ["git", "gitfs", "output", "vscode"];
const ifmLanguageSelector: DocumentSelector = { language: "ifm" };

function excludeIrrelevantTextDocumentsByLanguage(
  event: Event<TextDocument>
): Event<TextDocument> {
  return select(
    (document: TextDocument) =>
      !!languages.match(ifmLanguageSelector, document),
    event
  );
}

function excludeIrrelevantChangeEventsByLanguage(
  event: Event<TextDocumentChangeEvent>
): Event<TextDocumentChangeEvent> {
  return select(
    (e: TextDocumentChangeEvent) =>
      !!languages.match(ifmLanguageSelector, e.document),
    event
  );
}

function excludeIrrelevantTextDocumentsByScheme(
  event: Event<TextDocument>
): Event<TextDocument> {
  return excludeUriSchemes(
    schemesToExclude,
    (document: TextDocument) => document.uri,
    event
  );
}

function excludeIrrelevantChangeEventsByScheme(
  event: Event<TextDocumentChangeEvent>
): Event<TextDocumentChangeEvent> {
  return excludeUriSchemes(
    schemesToExclude,
    (e: TextDocumentChangeEvent) => e.document.uri,
    event
  );
}

const onDidInitiallyFindTextDocument: Event<TextDocument> = (
  listener: (e: TextDocument) => any,
  thisArgs?: any
): Disposable => {
  for (const document of workspace.textDocuments) {
    listener.call(thisArgs, document);
  }
  return Disposable.from();
};

export const onDidInitiallyFindRelevantTextDocument: Event<TextDocument> =
  streamEvents(onDidInitiallyFindTextDocument)
    .through(excludeIrrelevantTextDocumentsByScheme)
    .through(excludeIrrelevantTextDocumentsByLanguage)
    .commit();

export const onDidChangeRelevantTextDocument: Event<TextDocument> =
  streamEvents(workspace.onDidChangeTextDocument)
    .through(excludeIrrelevantChangeEventsByScheme)
    .through(excludeIrrelevantChangeEventsByLanguage)
    .through(throttleEvent, 1000, (e: TextDocumentChangeEvent) => e.document)
    .through(ignoreIfAlreadyClosed)
    .commit();

export const onDidOpenRelevantTextDocument: Event<TextDocument> = streamEvents(
  workspace.onDidOpenTextDocument
)
  .through(excludeIrrelevantTextDocumentsByScheme)
  .through(excludeIrrelevantTextDocumentsByLanguage)
  .commit();

export const onDidCloseRelevantTextDocument: Event<TextDocument> = streamEvents(
  workspace.onDidCloseTextDocument
)
  .through(excludeIrrelevantTextDocumentsByScheme)
  .through(excludeIrrelevantTextDocumentsByLanguage)
  .commit();
