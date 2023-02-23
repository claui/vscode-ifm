import { Diagnostic, DiagnosticSeverity, TextDocument } from "vscode";
import { LineMessage } from "../ifm";

export function mapLineMessage(message: LineMessage, document: TextDocument) {
  const diagnostic = new Diagnostic(
    document.lineAt(message.lineNumber - 1).range,
    message.predicate,
    DiagnosticSeverity.Error,
  );
  return diagnostic;
}
