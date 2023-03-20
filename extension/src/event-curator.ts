import {
  Disposable,
  DocumentSelector,
  Event,
  TextDocument,
  workspace,
} from "vscode";

import {
  ignoreIfAlreadyClosed,
  relevantChangeEventsByLanguage,
  relevantChangeEventsByScheme,
  relevantTextDocumentsByLanguage,
  relevantTextDocumentsByScheme,
} from "./event-curator/filters";
import { stream } from "./event-curator/stream";
import { throttleEvent } from "./event-curator/throttle";

export class EventCurator {
  #config;

  constructor(config: DocumentSelector & {
    changeEventThrottleMillis: number,
  }) {
    this.#config = config;
  }

  static #onDidInitiallyFindTextDocument(
    ...[listener, thisArgs]: Parameters<Event<TextDocument>>
  ) {
    for (const document of workspace.textDocuments) {
      listener.call(thisArgs, document);
    }
    return Disposable.from();
  }

  onDidInitiallyFindRelevantTextDocument(
    ...args: Parameters<Event<TextDocument>>
  ) {
    return stream(EventCurator.#onDidInitiallyFindTextDocument)
      .select(relevantTextDocumentsByScheme)
      .select(relevantTextDocumentsByLanguage(this.#config),
      )(...args);
  }

  onDidChangeRelevantTextDocument(
    ...args: Parameters<Event<TextDocument>>
  ) {
    return stream(workspace.onDidChangeTextDocument)
      .select(relevantChangeEventsByScheme)
      .select(relevantChangeEventsByLanguage(this.#config))
      .map(throttleEvent(
        this.#config.changeEventThrottleMillis, (e) => e.document))
      .select(ignoreIfAlreadyClosed,
      )(...args);
  }

  onDidOpenRelevantTextDocument(
    ...args: Parameters<Event<TextDocument>>
  ) {
    return stream(workspace.onDidOpenTextDocument)
      .select(relevantTextDocumentsByScheme)
      .select(relevantTextDocumentsByLanguage(this.#config),
      )(...args);
  }

  onDidCloseRelevantTextDocument(
    ...args: Parameters<Event<TextDocument>>
  ) {
    return stream(workspace.onDidCloseTextDocument)
      .select(relevantTextDocumentsByScheme)
      .select(relevantTextDocumentsByLanguage(this.#config),
      )(...args);
  }
}
