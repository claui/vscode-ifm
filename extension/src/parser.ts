import { Event, EventEmitter, TextDocument } from "vscode";

import { CliOutput, CliProvider, CliResult, IfmCli } from "./cli";
import log from "./log";

export type DocumentParsedEvent = { document: TextDocument } & CliResult;

export class Parser {
  readonly onDidParseDocument: Event<DocumentParsedEvent>;

  #cliProvider: CliProvider;
  #didParseDocumentEventEmitter = new EventEmitter<DocumentParsedEvent>();

  constructor(cliProvider: CliProvider) {
    this.#cliProvider = cliProvider;
    this.onDidParseDocument = this.#didParseDocumentEventEmitter.event;
  }

  async parseDocument(document: TextDocument) {
    const cli: IfmCli = await this.#cliProvider.cliFor(document);
    if (!cli.ok) {
      this.#didParseDocumentEventEmitter.fire(
        { document, hasRun: false, success: false, ...cli });
      return;
    }

    const cliArgs: string[] = [
      "--format",
      "yaml",
      "--items",
      "--map",
      "--tasks",
    ];
    let cliOutput: CliOutput;
    try {
      const runSyncResult: {
        stdout: string;
        stderr: string;
        status: number | null;
        error?: Error;
      } = cli.runSync(cliArgs, document.getText());
      cliOutput = {
        success: runSyncResult.status === 0,
        ...runSyncResult,
      };
      if (!cliOutput.success) {
        log.error("exit status:", runSyncResult.status);
        log.error("error:", runSyncResult.error);
      }
    } catch (error) {
      cliOutput = {
        success: false,
        ...(error as { stdout: string; stderr: string }),
      };
      log.error(error);
    }
    this.#didParseDocumentEventEmitter.fire(
      { document, hasRun: true, ...cliOutput });
  }
}
