import {
  Disposable,
  Event,
  TextDocument,
  TextDocumentChangeEvent,
  workspace,
} from "vscode";
import { CHANGE_EVENT_THROTTLE_MILLIS } from "./constants";

import {
  excludeIrrelevantChangeEventsByLanguage,
  excludeIrrelevantChangeEventsByScheme,
  excludeIrrelevantTextDocumentsByLanguage,
  excludeIrrelevantTextDocumentsByScheme,
  ignoreIfAlreadyClosed,
} from "./events/filters";
import { streamEvents } from "./events/stream";
import { throttleEvent } from "./events/throttle";

const onDidInitiallyFindTextDocument: Event<TextDocument> = (
  listener: (e: TextDocument) => any,
  thisArgs?: any,
): Disposable => {
  for (const document of workspace.textDocuments) {
    listener.call(thisArgs, document);
  }
  return Disposable.from();
};

export const onDidInitiallyFindRelevantTextDocument: Event<TextDocument> =
  streamEvents(onDidInitiallyFindTextDocument)
    .through(excludeIrrelevantTextDocumentsByScheme)
    .through(excludeIrrelevantTextDocumentsByLanguage);

export const onDidChangeRelevantTextDocument: Event<TextDocument> =
  streamEvents(workspace.onDidChangeTextDocument)
    .through(excludeIrrelevantChangeEventsByScheme)
    .through(excludeIrrelevantChangeEventsByLanguage)
    .through(
      throttleEvent,
      CHANGE_EVENT_THROTTLE_MILLIS,
      (e: TextDocumentChangeEvent) => e.document,
    )
    .through(ignoreIfAlreadyClosed);

export const onDidOpenRelevantTextDocument: Event<TextDocument> =
  streamEvents(workspace.onDidOpenTextDocument)
    .through(excludeIrrelevantTextDocumentsByScheme)
    .through(excludeIrrelevantTextDocumentsByLanguage);

export const onDidCloseRelevantTextDocument: Event<TextDocument> =
  streamEvents(workspace.onDidCloseTextDocument)
    .through(excludeIrrelevantTextDocumentsByScheme)
    .through(excludeIrrelevantTextDocumentsByLanguage);
