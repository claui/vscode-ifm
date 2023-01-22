import { commands, DiagnosticCollection, languages, Uri } from "vscode";

import { Ifm } from "./cli-api";
import { IfmAdapter } from "./cli-api/impl";
import { updateDiagnostics } from "./diagnostics";
import {
  onDidChangeRelevantTextDocument,
  onDidCloseRelevantTextDocument,
  onDidInitiallyFindRelevantTextDocument,
  onDidOpenRelevantTextDocument,
} from "./events";
import log from "./log";
import { Status } from "./status";

const diagnosticsByUri: Map<string, DiagnosticCollection> = new Map();

export async function activate() {
  const ifm: IfmAdapter = await IfmAdapter.newInstance();
  const status: Status = new Status(ifm);
  await status.refresh();

  commands.registerCommand("ifm.action.refresh", ifm.refreshCli, ifm);
  commands.registerCommand("ifm.action.showLog", log.show, log);

  onDidInitiallyFindRelevantTextDocument(async (document) => {
    if (diagnosticsByUri.has(document.uri.toString())) {
      return;
    }
    const diagnostics: DiagnosticCollection =
      languages.createDiagnosticCollection(document.uri.toString());
    diagnosticsByUri.set(document.uri.toString(), diagnostics);
    await updateDiagnostics(document.uri, diagnostics, ifm, "onDidInitiallyFindRelevantTextDocument");
  });

  onDidChangeRelevantTextDocument(async (textDocument) => {
    const uri: Uri = textDocument.uri;
    const diagnostics: DiagnosticCollection | undefined = diagnosticsByUri.get(
      uri.toString()
    );
    if (!diagnostics) {
      log.warn("Missing DiagnosticCollection:", uri.toString());
      const diagnostics: DiagnosticCollection =
        languages.createDiagnosticCollection(uri.toString());
      diagnosticsByUri.set(uri.toString(), diagnostics);
      return;
    }
    await updateDiagnostics(uri, diagnostics, ifm, "onDidChangeRelevantTextDocument");
  });

  onDidOpenRelevantTextDocument(async (document) => {
    if (diagnosticsByUri.has(document.uri.toString())) {
      log.warn("Found orphaned DiagnosticCollection:", document.uri.toString());
      diagnosticsByUri.delete(document.uri.toString());
    }
    const diagnostics: DiagnosticCollection = languages.createDiagnosticCollection(
      document.uri.toString()
    );
    diagnosticsByUri.set(document.uri.toString(), diagnostics);
    await updateDiagnostics(document.uri, diagnostics, ifm, "onDidOpenRelevantTextDocument");
  });

  onDidCloseRelevantTextDocument((document) => {
    if (!diagnosticsByUri.has(document.uri.toString())) {
      log.warn("Missing DiagnosticCollection:", document.uri.toString());
      return;
    }
    diagnosticsByUri.delete(document.uri.toString());
    log.debug("Diagnostics deleted");
  });

  return { ifm } as { ifm: Ifm };
}

export function deactivate() {}
