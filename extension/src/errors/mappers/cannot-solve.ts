import {
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  Location,
  Range,
  TextDocument,
} from "vscode";

import { CannotSolveMessage } from "../ifm";

export function mapCannotSolveMessage(
  message: CannotSolveMessage,
  document: TextDocument,
) {
  const pseudoRange = new Range(0, 0, 0, 0);
  const diagnostic = new Diagnostic(
    pseudoRange,
    message.description,
    DiagnosticSeverity.Error,
  );
  diagnostic.relatedInformation = message.details.map(
    (detail) =>
      new DiagnosticRelatedInformation(
        new Location(document.uri, pseudoRange),
        `${detail.title}: ${detail.description}`,
      ),
  );
  diagnostic.source = "ifm";
  return diagnostic;
}
