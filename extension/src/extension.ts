import {
  commands, ConfigurationScope, ExtensionContext, workspace,
  WorkspaceConfiguration,
} from "vscode";

import { EventCurator } from "vscode-event-curator";

import { CliProvider, ExecutableConfigProvider } from "./cli";
import { Diagnostics } from "./diagnostics";
import log from "./log";
import { Parser } from "./parser";
import { Status } from "./status";

function createParser(): Parser {
  const executableConfigProvider: ExecutableConfigProvider =
    (scope?: ConfigurationScope) => {
      const ifmConfig: WorkspaceConfiguration = workspace
        .getConfiguration("ifm", scope);
      const maxRuntimeMillis: number | undefined = ifmConfig
        .get("runtimeLimitInMilliseconds");
      if (!maxRuntimeMillis) {
        throw new Error("Process runtime limit not configured");
      }
      return {
        executable:
          /* eslint-disable-next-line
             @typescript-eslint/prefer-nullish-coalescing
          -- falsy is what we want here because of the empty string */
          ifmConfig.get("executablePath") || "ifm",
        maxRuntimeMillis,
      };
    }
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
    changeEventThrottleMillis: 2 * context.extension.packageJSON.contributes
      .configuration.properties["ifm.runtimeLimitInMilliseconds"].default,
  });

  curator.onDidInitiallyFindRelevantTextDocument(parser.parseDocument, parser);
  curator.onDidChangeRelevantTextDocument(parser.parseDocument, parser);
  curator.onDidOpenRelevantTextDocument(parser.parseDocument, parser);
  curator.onDidCloseRelevantTextDocument((document) => {
    diagnostics.remove(document);
    log.debug("Diagnostics deleted");
  });

  const version = context.extension.packageJSON.version as string;
  log.info(`Extension v${version} startup successful`);
  return { parser } as { parser: Parser };
}

export function deactivate() {
  return;
}
