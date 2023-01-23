import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  languages,
  Range,
  TextDocument,
} from "vscode";

import { DocumentParsedEvent, Ifm } from "./cli-api";
import log from "./log";

export class Diagnostics {
  #diagnosticCollection: DiagnosticCollection =
    languages.createDiagnosticCollection("IFM");

  constructor(ifm: Ifm) {
    ifm.onDidParseDocument(this.refresh, this);
  }

  async refresh(event: DocumentParsedEvent) {
    log.info("Refreshing diagnostics", event.document.uri.toString());
    log.warn("stderr:", event.stderr);
    log.warn("stderr prototype:", Object.getPrototypeOf(event.stderr));
    const diagnostics: Diagnostic[] = event.stderr
      .split("\n")
      .filter((line) => line.length)
      .map((line) => {
        const range: Range = new Range(0, 0, 0, 0);
        return new Diagnostic(range, line, DiagnosticSeverity.Warning);
      });
    this.#diagnosticCollection.set(event.document.uri, diagnostics);
  }

  delete(document: TextDocument) {
    this.#diagnosticCollection.delete(document.uri);
  }
}
