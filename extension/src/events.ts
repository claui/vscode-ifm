import {
  Disposable,
  Event,
  TextDocument,
  workspace,
} from "vscode";
import { CHANGE_EVENT_THROTTLE_MILLIS } from "./constants";

import {
  ignoreIfAlreadyClosed,
  relevantChangeEventsByLanguage,
  relevantChangeEventsByScheme,
  relevantTextDocumentsByLanguage,
  relevantTextDocumentsByScheme,
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
    .select(relevantTextDocumentsByScheme)
    .select(relevantTextDocumentsByLanguage);

export const onDidChangeRelevantTextDocument: Event<TextDocument> =
  EventStream.of(workspace.onDidChangeTextDocument)
    .select(relevantChangeEventsByScheme)
    .select(relevantChangeEventsByLanguage({language: "ifm"}))
    .map(throttleEvent(CHANGE_EVENT_THROTTLE_MILLIS, (e) => e.document))
    .select(ignoreIfAlreadyClosed);

export const onDidOpenRelevantTextDocument: Event<TextDocument> =
  EventStream.of(workspace.onDidOpenTextDocument)
    .select(relevantTextDocumentsByScheme)
    .select(relevantTextDocumentsByLanguage);

export const onDidCloseRelevantTextDocument: Event<TextDocument> =
  EventStream.of(workspace.onDidCloseTextDocument)
    .select(relevantTextDocumentsByScheme)
    .select(relevantTextDocumentsByLanguage);
