import {
  commands,
  DiagnosticCollection,
  languages,
  Uri,
  workspace,
} from "vscode";

import { Ifm } from "./cli-api";
import { IfmAdapter } from "./cli-api/impl";
import log from "./log";
import { Status } from "./status";

const diagnosticsByUri: Map<Uri, DiagnosticCollection> = new Map();

function isSchemeRelevant(uri: Uri) {
  return !["git", "gitfs", "output"].includes(uri.scheme);
}

function updateDiagnostics(
  uri: Uri,
  diagnosticCollection: DiagnosticCollection,
  reason: string
) {
  log.info(reason, uri.toString());
}

export async function activate() {
  const ifm: IfmAdapter = await IfmAdapter.newInstance();
  const status: Status = new Status(ifm);
  status.refresh();

  commands.registerCommand("ifm.action.refresh", ifm.refreshCli, ifm);
  commands.registerCommand("ifm.action.showLog", log.show, log);

  workspace.onDidChangeTextDocument((event) => {
    if (!isSchemeRelevant(event.document.uri)) {
      return;
    }
    const diagnostics = diagnosticsByUri.get(event.document.uri);
    if (!diagnostics) {
      log.warn("Missing DiagnosticCollection:", event.document.uri.toString());
      return;
    }
    updateDiagnostics(
      event.document.uri,
      diagnostics,
      "onDidChangeTextDocument"
    );
  });
  workspace.onDidOpenTextDocument((document) => {
    if (!isSchemeRelevant(document.uri)) {
      return;
    }
    if (diagnosticsByUri.has(document.uri)) {
      log.warn("Found orphaned DiagnosticCollection:", document.uri.toString());
      diagnosticsByUri.delete(document.uri);
    }
    const diagnostics = languages.createDiagnosticCollection(
      document.uri.toString()
    );
    diagnosticsByUri.set(document.uri, diagnostics);
    updateDiagnostics(document.uri, diagnostics, "onDidOpenTextDocument");
  });
  workspace.onDidCloseTextDocument((document) => {
    if (!isSchemeRelevant(document.uri)) {
      return;
    }
    if (!diagnosticsByUri.has(document.uri)) {
      log.warn("Missing DiagnosticCollection:", document.uri.toString());
      return;
    }
    diagnosticsByUri.delete(document.uri);
  });

  return { ifm } as { ifm: Ifm };
}

export function deactivate() {}
