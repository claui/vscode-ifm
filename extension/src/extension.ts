import { commands, ExtensionContext, LogOutputChannel, window } from "vscode";

import { Ifm } from "./cli-api";
import { IfmAdapter } from "./cli-api/impl";
import log from "./log";
import { Status } from "./status";

export async function activate() {
  const ifm: Ifm = await IfmAdapter.newInstance();
  const status: Status = new Status(ifm);
  status.refresh();

  commands.registerCommand("ifm.action.refresh", status.refresh, status);
  commands.registerCommand("ifm.action.showLog", log.show, log);

  return { ifm };
}

export function deactivate() {}
