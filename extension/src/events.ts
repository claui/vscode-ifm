import {
  Disposable,
  Event,
  TextDocument,
  TextDocumentChangeEvent,
  workspace,
} from "vscode";

import { excludeUriSchemes, ignoreIfAlreadyClosed } from "./events/filters";
import { streamEvents } from "./events/stream";
import { throttleEvent } from "./events/throttle";

const schemesToExclude: string[] = ["git", "gitfs", "output", "vscode"];

function excludeIrrelevantTextDocuments(
  event: Event<TextDocument>
): Event<TextDocument> {
  return excludeUriSchemes(
    schemesToExclude,
    (document: TextDocument) => document.uri,
    event
  );
}

function excludeIrrelevantTextDocumentChangeEvents(
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
    .through(excludeIrrelevantTextDocuments)
    .commit();

export const onDidChangeRelevantTextDocument: Event<TextDocument> =
  streamEvents(workspace.onDidChangeTextDocument)
    .through(excludeIrrelevantTextDocumentChangeEvents)
    .through(throttleEvent, 1000, (e: TextDocumentChangeEvent) => e.document)
    .through(ignoreIfAlreadyClosed)
    .commit();

export const onDidOpenRelevantTextDocument: Event<TextDocument> = streamEvents(
  workspace.onDidOpenTextDocument
)
  .through(excludeIrrelevantTextDocuments)
  .commit();

export const onDidCloseRelevantTextDocument: Event<TextDocument> = streamEvents(
  workspace.onDidCloseTextDocument
)
  .through(excludeIrrelevantTextDocuments)
  .commit();
