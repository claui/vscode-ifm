import {
  commands,
  DocumentSelector,
  ExtensionContext,
  languages,
  LanguageStatusItem,
  LanguageStatusSeverity,
  window,
} from "vscode";

import { Ifm, IfmCli } from "./cli-api";
import { IfmAdapter } from "./cli-api/impl";
import CliFailedError from "./errors";
import Logger from "./logger";
import { getCurrentTimestamp } from "./time";

const outputChannel = window.createOutputChannel("IFM");
const languageSelector: DocumentSelector = { language: "ifm" };

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
    const timestamp = getCurrentTimestamp();
    outputChannel.appendLine(`${timestamp} [${level}] ${args.join(" ")}`);
  },
};

const statusItem: LanguageStatusItem = languages.createLanguageStatusItem(
  "ifm.status.item.version",
  languageSelector
);

const refreshStatus = async (ifmCli: IfmCli) => {
  try {
    statusItem.text = "Querying IFM CLI version";
    log.info(statusItem.detail);
    statusItem.busy = true;

    const versionNumber: string = await ifmCli.version;
    statusItem.text = `IFM CLI v${versionNumber}`;
    statusItem.severity = LanguageStatusSeverity.Information;
    log.info(statusItem.text);
    statusItem.detail = `Last updated: ${getCurrentTimestamp()}`;
  } catch (error) {
    log.error(error?.message ?? error);
    statusItem.text = error.message;
    if (error instanceof CliFailedError && "cause" in error) {
      statusItem.detail = `Caused by: ${error.cause}`;
      log.error(`> ${error.cause}`);
    } else {
      statusItem.detail = undefined;
    }
    statusItem.severity = LanguageStatusSeverity.Error;
  } finally {
    statusItem.busy = false;
  }
};

export async function activate(context: ExtensionContext) {
  const ifm: Ifm = await IfmAdapter.newInstance(log);
  refreshStatus(ifm.cli);
  ifm.onDidCliChange(() => refreshStatus(ifm.cli), this);

  commands.registerCommand("ifm.action.refresh", () => {
    refreshStatus(ifm.cli);
  });
  commands.registerCommand("ifm.action.showLog", () => {
    outputChannel.show();
  });
  statusItem.command = {
    command: "ifm.action.showLog",
    title: "Show extension log",
  };

  return { ifm };
}

export function deactivate() {}
