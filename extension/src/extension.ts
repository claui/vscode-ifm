import {
  ExtensionContext,
  LanguageStatusItem,
  commands,
  languages,
  window,
  DocumentSelector,
  workspace,
  LanguageStatusSeverity,
  Disposable,
} from "vscode";

import CliFailedError from "./errors/cli-failed";
import Logger from "./logger";

import { getIfmCli } from "./cli-adapter";
import { getIfmCliVersion, Ifm, IfmCli } from "./ifm-cli";
import { getCurrentTimestamp } from "./time";
import { IfmAdapter } from "./adapter";

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

    const versionNumber: string = await getIfmCliVersion(ifmCli.run);
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
  const ifm: IfmAdapter = new IfmAdapter(await getIfmCli(context), log);
  refreshStatus(ifm.cli);
  ifm.onDidCliChange(() => refreshStatus(ifm.cli), this);

  commands.registerCommand("ifm.action.refresh", () => {
    refreshStatus(ifm.cli);
  });
  commands.registerCommand("ifm.action.showLog", () => {
    outputChannel.show();
  });
  workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration("ifm")) {
      ifm.refreshCli(await getIfmCli(context));
    }
  });
  statusItem.command = {
    command: "ifm.action.showLog",
    title: "Show extension log",
  };

  return { ifm } as { ifm: Ifm };
}

export function deactivate() {}
