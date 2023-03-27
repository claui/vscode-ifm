import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  languages,
  Range,
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
    ifmApi.onDidParseDocument((event) => {
      try {
        this.refresh(event);
      } catch (error) {
        const pseudoRange = new Range(0, 0, 0, 0);
        const diagnostic = new Diagnostic(
          pseudoRange,
          "Unable to provide diagnostics."
            + ` See extension log “${log.name}” for details.`,
          DiagnosticSeverity.Error,
        );
        diagnostic.source = "ifm";
        this.#diagnosticCollection.set(event.document.uri, [diagnostic]);
      }
    });
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
