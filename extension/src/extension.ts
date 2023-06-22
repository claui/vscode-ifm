import {
  commands, ConfigurationScope, ExtensionContext, workspace,
} from "vscode";

import { EventCurator } from "vscode-event-curator";

import { CliProvider, ExecutableConfigProvider } from "./cli";
import { CHANGE_EVENT_THROTTLE_MILLIS, MAX_RUNTIME_MILLIS } from "./constants";
import { Diagnostics } from "./diagnostics";
import log from "./log";
import { Parser } from "./parser";
import { Status } from "./status";

function createParser(): Parser {
  const executableConfigProvider: ExecutableConfigProvider =
    (scope?: ConfigurationScope) => ({
      executable: workspace
        .getConfiguration("ifm", scope)
        .get("executablePath") || "ifm",
      maxRuntimeMillis: MAX_RUNTIME_MILLIS,
    })
  const cliProvider = new CliProvider("ifm", executableConfigProvider);
  return new Parser(cliProvider);
}

export function activate(context: ExtensionContext) {
  const status: Status = new Status();
  status.busy("Initializing");
  const parser: Parser = createParser();

  const diagnostics: Diagnostics = new Diagnostics(parser);

  commands.registerCommand("ifm.action.refresh", () => log.info("Refreshing"));
  commands.registerCommand("ifm.action.showLog", log.show, log);

  const curator = new EventCurator({
    language: "ifm",
    changeEventThrottleMillis: CHANGE_EVENT_THROTTLE_MILLIS,
  });

  curator.onDidInitiallyFindRelevantTextDocument(parser.parseDocument, parser);
  curator.onDidChangeRelevantTextDocument(parser.parseDocument, parser);
  curator.onDidOpenRelevantTextDocument(parser.parseDocument, parser);
  curator.onDidCloseRelevantTextDocument((document) => {
    diagnostics["delete"](document);
    log.debug("Diagnostics deleted");
  });

  return { parser } as { parser: Parser };
}

export function deactivate() {
  return;
}
