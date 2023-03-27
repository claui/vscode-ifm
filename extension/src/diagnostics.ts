import {
  Diagnostic,
  DiagnosticCollection,
  languages,
  TextDocument,
} from "vscode";

import { DocumentParsedEvent, Ifm } from "./cli-api";
import { grammar, semantics } from "./error-grammar";
import * as ifm from "./errors/ifm";
import { toDiagnostic } from "./errors/mappers";
import log from "./log";

export class Diagnostics {
  #diagnosticCollection: DiagnosticCollection =
    languages.createDiagnosticCollection("IFM");

  constructor(ifmApi: Ifm) {
    ifmApi.onDidParseDocument(this.refresh, this);
  }

  refresh(event: DocumentParsedEvent) {
    log.info("Refreshing diagnostics", event.document.uri.toString());
    if (!event.hasRun) {
      throw new Error(event.reason);
    }
    const matchResult = grammar.match(event.stderr);
    if (matchResult.failed()) {
      throw new Error(matchResult.message);
    }

    const ifmMessages: ifm.Message[] =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      semantics(matchResult).parseMessageGroup();
    const diagnostics: Diagnostic[] = ifmMessages.map((message) =>
      toDiagnostic(message, event.document),
    );
    this.#diagnosticCollection.set(event.document.uri, diagnostics);
  }

  delete(document: TextDocument) {
    this.#diagnosticCollection["delete"](document.uri);
  }
}
