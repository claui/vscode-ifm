import {
  commands,
  ExtensionContext,
  OutputChannel,
  window,
} from "vscode";

import { Ifm } from "./cli-api";
import { IfmAdapter } from "./cli-api/impl";
import Logger from "./logger";
import { Status } from "./status";
import { getCurrentTimestamp } from "./time";

const channel: OutputChannel = window.createOutputChannel("IFM");

const log: Logger = {
  debug: function (...args) {
    this.log("DEBUG", ...args);
  },
  error: function (...args) {
    this.log("ERROR", ...args);
  },
  info: function (...args) {
    this.log("INFO", ...args);
  },
  log: function (level: string, ...args: any[]) {
    channel.appendLine(`${getCurrentTimestamp()} [${level}] ${args.join(" ")}`);
  },
};

export async function activate(context: ExtensionContext) {
  const ifm: Ifm = await IfmAdapter.newInstance(log);
  const status: Status = new Status(ifm, log);
  status.refresh();

  commands.registerCommand("ifm.action.refresh", status.refresh, status);
  commands.registerCommand("ifm.action.showLog", channel.show, channel);

  return { ifm };
}

export function deactivate() {}
