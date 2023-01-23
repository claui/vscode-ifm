import { commands } from "vscode";

import { Ifm } from "./cli-api";
import { IfmAdapter } from "./cli-api/impl";
import { Diagnostics } from "./diagnostics";
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
  const diagnostics: Diagnostics = new Diagnostics(ifm);
  const status: Status = new Status(ifm);
  await status.refresh();

  commands.registerCommand("ifm.action.refresh", ifm.refreshCli, ifm);
  commands.registerCommand("ifm.action.showLog", log.show, log);

  onDidInitiallyFindRelevantTextDocument(async (document) => {
    ifm.parseDocument(document);
  });

  onDidChangeRelevantTextDocument(async (document) => {
    ifm.parseDocument(document);
  });

  onDidOpenRelevantTextDocument(async (document) => {
    ifm.parseDocument(document);
  });

  onDidCloseRelevantTextDocument((document) => {
    diagnostics.delete(document);
    log.debug("Diagnostics deleted");
  });

  return { ifm } as { ifm: Ifm };
}

export function deactivate() {}
