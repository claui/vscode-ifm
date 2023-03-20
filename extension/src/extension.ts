import { commands } from "vscode";

import { Ifm } from "./cli-api";
import { IfmAdapter } from "./cli-api/impl";
import { CHANGE_EVENT_THROTTLE_MILLIS } from "./constants";
import { Diagnostics } from "./diagnostics";

import { EventCurator } from "./event-curator";
import log from "./log";
import { Status } from "./status";

export async function activate() {
  const ifm: IfmAdapter = IfmAdapter.newInstance();
  const diagnostics: Diagnostics = new Diagnostics(ifm);
  const status: Status = new Status(ifm);
  await status.refresh();

  commands.registerCommand("ifm.action.refresh", ifm.refreshCli, ifm);
  commands.registerCommand("ifm.action.showLog", log.show, log);

  const curator = new EventCurator({
    language: "ifm",
    changeEventThrottleMillis: CHANGE_EVENT_THROTTLE_MILLIS,
  });

  curator.onDidInitiallyFindRelevantTextDocument(ifm.parseDocument, ifm);
  curator.onDidChangeRelevantTextDocument(ifm.parseDocument, ifm);
  curator.onDidOpenRelevantTextDocument(ifm.parseDocument, ifm);
  curator.onDidCloseRelevantTextDocument((document) => {
    diagnostics["delete"](document);
    log.debug("Diagnostics deleted");
  });

  return { ifm } as { ifm: Ifm };
}

export function deactivate() {
  return;
}
