import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  languages,
  Range,
  TextDocument,
} from "vscode";

import { grammar, semantics } from "./error-grammar";
import * as ifm from "./errors/ifm";
import { toDiagnostic } from "./errors/mappers";
import log from "./log";
import { DocumentParsedEvent, Parser } from "./parser";

export class Diagnostics {
  #diagnosticCollection: DiagnosticCollection =
    languages.createDiagnosticCollection("IFM");

  constructor(parser: Parser) {
    parser.onDidParseDocument((event) => {
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
        log.error(error);
        if ("cause" in error) {
          log.error("Caused by:");
          log.error(error.cause);
        }
        this.#diagnosticCollection.set(event.document.uri, [diagnostic]);
      }
    });
  }

  refresh(event: DocumentParsedEvent) {
    log.info("Refreshing diagnostics", event.document.uri.toString());
    if (!event.hasRun) {
      throw new Error(event.reason, {
        cause: ("cause" in event.error) ? event.error.cause : event.error,
      });
    }
    /*
     * Pseudo-code for interface segregation:
     * const ifmMessages: ifm.Message[] = ifm.parseCliStderr(event.stderr);
     * const diagnostics: Diagnostic[] = ifmMessages.map((message) =>
     *   toDiagnostic(message, event.document),
     * );
     * this.#diagnosticCollection.set(event.document.uri, diagnostics);
     */
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

  remove(document: TextDocument) {
    this.#diagnosticCollection.delete(document.uri);
  }
}
