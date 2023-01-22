import { commands } from "vscode";

import { Ifm } from "./cli-api";
import { IfmAdapter } from "./cli-api/impl";
import { deleteDiagnostics, updateDiagnostics } from "./diagnostics";
import {
  onDidChangeRelevantTextDocument,
  onDidCloseRelevantTextDocument,
  onDidInitiallyFindRelevantTextDocument,
  onDidOpenRelevantTextDocument,
} from "./events";
import log from "./log";
import { Status } from "./status";

export async function activate() {
  const ifm: IfmAdapter = await IfmAdapter.newInstance();
  const status: Status = new Status(ifm);
  await status.refresh();

  commands.registerCommand("ifm.action.refresh", ifm.refreshCli, ifm);
  commands.registerCommand("ifm.action.showLog", log.show, log);

  onDidInitiallyFindRelevantTextDocument(async (document) => {
    await updateDiagnostics(
      document,
      ifm,
      "onDidInitiallyFindRelevantTextDocument"
    );
  });

  onDidChangeRelevantTextDocument(async (textDocument) => {
    await updateDiagnostics(
      textDocument,
      ifm,
      "onDidChangeRelevantTextDocument"
    );
  });

  onDidOpenRelevantTextDocument(async (document) => {
    await updateDiagnostics(document, ifm, "onDidOpenRelevantTextDocument");
  });

  onDidCloseRelevantTextDocument((document) => {
    deleteDiagnostics(document);
    log.debug("Diagnostics deleted");
  });

  return { ifm } as { ifm: Ifm };
}

export function deactivate() {}
