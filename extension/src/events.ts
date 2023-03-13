import {
  Disposable,
  Event,
  TextDocument,
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
import { EventStream } from "./events/stream";
import { throttleEvent } from "./events/throttle";

const onDidInitiallyFindTextDocument: Event<TextDocument> = (
  ...[listener, thisArgs]: Parameters<Event<TextDocument>>
) => {
  for (const document of workspace.textDocuments) {
    listener.call(thisArgs, document);
  }
  return Disposable.from();
};

export const onDidInitiallyFindRelevantTextDocument: Event<TextDocument> =
  EventStream.of(onDidInitiallyFindTextDocument)
    .filter(excludeIrrelevantTextDocumentsByScheme)
    .filter(excludeIrrelevantTextDocumentsByLanguage);

export const onDidChangeRelevantTextDocument: Event<TextDocument> =
  EventStream.of(workspace.onDidChangeTextDocument)
    .filter(excludeIrrelevantChangeEventsByScheme)
    .filter(excludeIrrelevantChangeEventsByLanguage)
    .map(throttleEvent(CHANGE_EVENT_THROTTLE_MILLIS, (e) => e.document))
    .filter(ignoreIfAlreadyClosed);

export const onDidOpenRelevantTextDocument: Event<TextDocument> =
  EventStream.of(workspace.onDidOpenTextDocument)
    .filter(excludeIrrelevantTextDocumentsByScheme)
    .filter(excludeIrrelevantTextDocumentsByLanguage);

export const onDidCloseRelevantTextDocument: Event<TextDocument> =
  EventStream.of(workspace.onDidCloseTextDocument)
    .filter(excludeIrrelevantTextDocumentsByScheme)
    .filter(excludeIrrelevantTextDocumentsByLanguage);
