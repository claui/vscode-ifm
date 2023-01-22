import { DiagnosticCollection, Uri } from "vscode";

import { Ifm } from "./cli-api";
import log from "./log";

export async function updateDiagnostics(
  uri: Uri,
  diagnosticCollection: DiagnosticCollection,
  ifm: Ifm,
  reason: string
) {
  log.info(reason, uri.toString());
}
