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

const diagnosticsByUri: Map<string, DiagnosticCollection> = new Map();

function isSchemeRelevant(uri: Uri) {
  const isExcluded: boolean = ["git", "gitfs", "output"].includes(uri.scheme);
  if (!isExcluded) {
    log.debug("Checking URI:", uri.toString());
    log.debug("Scheme:", uri.scheme);
    log.debug("Verdict:", !isExcluded);
  }
  return !isExcluded;
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
  await status.refresh();

  commands.registerCommand("ifm.action.refresh", ifm.refreshCli, ifm);
  commands.registerCommand("ifm.action.showLog", log.show, log);

  workspace.onDidChangeTextDocument((event) => {
    if (!isSchemeRelevant(event.document.uri)) {
      return;
    }
    const diagnostics: DiagnosticCollection | undefined = diagnosticsByUri.get(
      event.document.uri.toString()
    );
    if (!diagnostics) {
      log.warn("Missing DiagnosticCollection:", event.document.uri.toString());
      const diagnostics: DiagnosticCollection =
        languages.createDiagnosticCollection(event.document.uri.toString());
      diagnosticsByUri.set(event.document.uri.toString(), diagnostics);
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
    if (diagnosticsByUri.has(document.uri.toString())) {
      log.warn("Found orphaned DiagnosticCollection:", document.uri.toString());
      diagnosticsByUri.delete(document.uri.toString());
    }
    const diagnostics = languages.createDiagnosticCollection(
      document.uri.toString()
    );
    diagnosticsByUri.set(document.uri.toString(), diagnostics);
    updateDiagnostics(document.uri, diagnostics, "onDidOpenTextDocument");
  });
  workspace.onDidCloseTextDocument((document) => {
    if (!isSchemeRelevant(document.uri)) {
      return;
    }
    if (!diagnosticsByUri.has(document.uri.toString())) {
      log.warn("Missing DiagnosticCollection:", document.uri.toString());
      return;
    }
    diagnosticsByUri.delete(document.uri.toString());
    log.debug("Diagnostics deleted");
  });
  for (const document of workspace.textDocuments) {
    if (
      !isSchemeRelevant(document.uri) ||
      diagnosticsByUri.has(document.uri.toString())
    ) {
      continue;
    }
    const diagnostics = languages.createDiagnosticCollection(
      document.uri.toString()
    );
    diagnosticsByUri.set(document.uri.toString(), diagnostics);
    updateDiagnostics(document.uri, diagnostics, "initial state of workspace");
  }

  return { ifm } as { ifm: Ifm };
}

export function deactivate() {}
