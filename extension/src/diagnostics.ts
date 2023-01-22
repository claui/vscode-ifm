import {
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  languages,
  Range,
  TextDocument,
} from "vscode";

import { Ifm } from "./cli-api";
import log from "./log";
import { getCurrentTimestamp } from "./time";

const diagnosticCollection: DiagnosticCollection =
  languages.createDiagnosticCollection("IFM");

export async function updateDiagnostics(
  document: TextDocument,
  ifm: Ifm,
  reason: string
) {
  log.info(reason, document.uri.toString());
  const diagnostics: Diagnostic[] = [
    new Diagnostic(
      new Range(4, 0, 7, 0),
      `Current time is ${getCurrentTimestamp()}`,
      DiagnosticSeverity.Error
    ),
  ];
  diagnosticCollection.set(document.uri, diagnostics);
}

export function deleteDiagnostics(document: TextDocument) {
  diagnosticCollection.delete(document.uri);
}
