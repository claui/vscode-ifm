import {
  execFile,
  spawnSync,
  SpawnSyncOptionsWithStringEncoding,
} from "child_process";
import { promisify } from "util";

import { EventEmitter, TextDocument, workspace } from "vscode";

import { CliOutput, DocumentParsedEvent, Ifm, IfmCli } from "../cli-api";
import { MAX_RUNTIME_MILLIS } from "../constants";
import CliFailedError from "../errors";
import log from "../log";

const MAX_LENGTH = 256;
const VERSION_PATTERN = /IFM version (?<version>.*)/;

const execFileAsync = promisify(execFile);

async function getVersion(
  cliRun: (argv: string[]) => Promise<{ stdout: string; stderr: string }>,
): Promise<string> {
  let stdout: string;
  try {
    ({ stdout } = await cliRun(["--version"]));
  } catch (error) {
    throw new CliFailedError("Unable to obtain IFM CLI version", {
      cause: error,
    });
  }

  const matchResult: RegExpExecArray | null = VERSION_PATTERN.exec(stdout);
  if (!matchResult) {
    throw new CliFailedError(
      `No version number found in IFM output: ${stdout}`,
    );
  }
  const versionString: string = matchResult.groups!.version;
  if (versionString.length > MAX_LENGTH) {
    throw new CliFailedError(
      `Excessive length: ${versionString.substring(0, MAX_LENGTH)}[…]`,
    );
  }
  return versionString.trim();
}

async function getCli(): Promise<IfmCli> {
  function getExecutable(): string {
    const executablePathSetting: string | undefined = workspace
      .getConfiguration("ifm")
      .get("executablePath");

    if (!executablePathSetting || executablePathSetting === "") {
      return "ifm";
    }
    return executablePathSetting;
  }

  function run(argv: string[]) {
    return execFileAsync(getExecutable(), argv);
  }

  function runSync(argv: string[], input: string, timeout: string | number) {
    return spawnSync(getExecutable(), argv, {
      input,
      timeout,
      encoding: "utf8",
    } as SpawnSyncOptionsWithStringEncoding);
  }

  try {
    return {
      ok: true,
      version: await getVersion(run),
      run,
      runSync,
    };

  } catch (error) {
    const reason: string = (error instanceof CliFailedError && "cause" in error)
      ? String(error.cause)
      : String(error.message);
    return {
      ok: false,
      reason,
      error,
    };
  }
}

export class IfmAdapter implements Ifm {
  #didCliChangeEventEmitter = new EventEmitter<void>();
  #didParseDocumentEventEmitter = new EventEmitter<DocumentParsedEvent>();

  #maxRuntimeMillis: string | number;
  cli: IfmCli;

  static async newInstance(): Promise<IfmAdapter> {
    const cli: IfmCli = await getCli();
    return new IfmAdapter(cli, MAX_RUNTIME_MILLIS);
  }

  constructor(cli: IfmCli, maxRuntimeMillis: string | number) {
    this.cli = cli;
    this.#maxRuntimeMillis = maxRuntimeMillis;
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("ifm")) {
        void this.refreshCli();
      }
    });
  }

  async refreshCli() {
    this.cli = await getCli();
    this.#didCliChangeEventEmitter.fire();
  }

  onDidCliChange = this.#didCliChangeEventEmitter.event;

  parseDocument(document: TextDocument) {
    if (!this.cli.ok) {
      this.#didParseDocumentEventEmitter.fire(
        { document, hasRun: false, success: false, ...this.cli });
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
      } = this.cli.runSync(cliArgs, document.getText(), this.#maxRuntimeMillis);
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

  onDidParseDocument = this.#didParseDocumentEventEmitter.event;
}
