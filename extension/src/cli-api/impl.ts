import {
  execFile,
  spawnSync,
  SpawnSyncOptionsWithStringEncoding,
  SpawnSyncReturns,
} from "child_process";
import { promisify } from "util";

import { Disposable, Event, TextDocument, workspace } from "vscode";

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
    ({stdout} = await cliRun(["--version"]));
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

function getCli(): IfmCli {
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

  function runSync(
    argv: string[],
    input: string,
    timeout: string | number,
  ): SpawnSyncReturns<string> {
    return spawnSync(getExecutable(), argv, {
      input,
      timeout,
      encoding: "utf8",
    } as SpawnSyncOptionsWithStringEncoding);
  }

  return {
    get version() {
      return getVersion(run);
    },
    run,
    runSync,
  };
}

export class IfmAdapter implements Ifm {
  #didCliChangeSubscriptions: Map<number, () => void> = new Map();
  #didParseDocumentSubscriptions: Map<
    number,
    (e: DocumentParsedEvent) => void
  > = new Map();

  #maxRuntimeMillis: string | number;
  #nextSubscriptionId = 0;
  cli: IfmCli;

  static newInstance(): IfmAdapter {
    const cli: IfmCli = getCli();
    return new IfmAdapter(cli, MAX_RUNTIME_MILLIS);
  }

  constructor(cli: IfmCli, maxRuntimeMillis: string | number) {
    this.cli = cli;
    this.#maxRuntimeMillis = maxRuntimeMillis;
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("ifm")) {
        this.refreshCli();
      }
    });
  }

  refreshCli() {
    this.cli = getCli();
    for (const subscription of this.#didCliChangeSubscriptions.values()) {
      subscription();
    }
  }

  onDidCliChange(
    ...[listener, thisArgs, disposables]: Parameters<Event<void>>
  ) {
    const subscriptionId: number = this.#nextSubscriptionId++;
    this.#didCliChangeSubscriptions.set(
      subscriptionId,
      listener.bind(thisArgs),
    );

    const disposable = new Disposable(() => {
      log.info("Disposing of onDidCliChange subscription", subscriptionId);
      this.#didCliChangeSubscriptions["delete"](subscriptionId);
    });
    if (disposables) {
      disposables?.push(disposable);
    }
    return disposable;
  }

  parseDocument(document: TextDocument) {
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
        ok: runSyncResult.status === 0,
        ...runSyncResult,
      };
      if (!cliOutput.ok) {
        log.error("exit status:", runSyncResult.status);
        log.error("error:", runSyncResult.error);
      }
    } catch (error) {
      cliOutput = {
        ok: false,
        ...(error as { stdout: string; stderr: string }),
      };
      log.error(error);
    }
    for (const subscription of this.#didParseDocumentSubscriptions.values()) {
      subscription({ document, ...cliOutput });
    }
  }

  onDidParseDocument(
    ...[listener, thisArgs, disposables]: Parameters<Event<DocumentParsedEvent>>
  ) {
    const subscriptionId: number = this.#nextSubscriptionId++;
    this.#didParseDocumentSubscriptions.set(
      subscriptionId,
      listener.bind(thisArgs),
    );

    const disposable = new Disposable(() => {
      log.info("Disposing of onDidParseDocument subscription", subscriptionId);
      this.#didParseDocumentSubscriptions["delete"](subscriptionId);
    });
    if (disposables) {
      disposables?.push(disposable);
    }
    return disposable;
  }
}
