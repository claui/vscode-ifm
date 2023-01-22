import { execFile } from "child_process";
import { promisify } from "util";

import { Disposable, TextDocument, workspace } from "vscode";

import { CliOutput, DocumentParsedEvent, Ifm, IfmCli } from "../cli-api";
import CliFailedError from "../errors";
import log from "../log";

const MAX_LENGTH = 256;
const VERSION_PATTERN = /IFM version (.*)/;

const execFileAsync = promisify(execFile);

async function getVersion(
  cliRun: (argv: string[]) => Promise<{ stdout: string; stderr: string }>
): Promise<string> {
  let stdout: string;
  try {
    stdout = (await cliRun(["--version"])).stdout;
  } catch (error) {
    throw new CliFailedError("Unable to obtain IFM CLI version", {
      cause: error,
    });
  }

  const matchingGroups = VERSION_PATTERN.exec(stdout);
  if (!matchingGroups || matchingGroups.length != 2) {
    throw new CliFailedError(
      `No version number found in IFM output: ${stdout}`
    );
  }
  const versionString = matchingGroups[1];
  if (versionString.length > MAX_LENGTH) {
    throw new CliFailedError(
      `Excessive length: ${versionString.substring(0, MAX_LENGTH)}[…]`
    );
  }
  return versionString.trim();
}

async function getCli(): Promise<IfmCli> {
  const getExecutable = (): string => {
    const executablePathSetting: string | undefined = workspace
      .getConfiguration("ifm")
      .get("executablePath");

    if (!executablePathSetting || executablePathSetting === "") {
      return "ifm";
    }
    return executablePathSetting;
  };

  const run = async (argv: string[]) => {
    return execFileAsync(getExecutable(), argv);
  };

  return {
    get version() {
      return getVersion(run);
    },

    run,
  };
}

export class IfmAdapter implements Ifm {
  #didCliChangeSubscriptions: Map<number, () => void> = new Map();
  #didParseDocumentSubscriptions: Map<
    number,
    (e: DocumentParsedEvent) => void
  > = new Map();
  #nextSubscriptionId = 0;
  cli: IfmCli;

  static async newInstance(): Promise<IfmAdapter> {
    const cli: IfmCli = await getCli();
    return new IfmAdapter(cli);
  }

  constructor(cli: IfmCli) {
    this.cli = cli;
    workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("ifm")) {
        this.refreshCli();
      }
    });
  }

  async refreshCli() {
    this.cli = await getCli();
    for (const subscription of this.#didCliChangeSubscriptions.values()) {
      subscription();
    }
  }

  onDidCliChange(
    listener: () => void,
    thisArgs?: any,
    disposables?: Disposable[]
  ) {
    const subscriptionId: number = this.#nextSubscriptionId++;
    this.#didCliChangeSubscriptions.set(
      subscriptionId,
      listener.bind(thisArgs)
    );

    const disposable = new Disposable(() => {
      log.info("Disposing of onDidCliChange subscription", subscriptionId);
      this.#didCliChangeSubscriptions.delete(subscriptionId);
    });
    if (disposables) {
      disposables?.push(disposable);
    }
    return disposable;
  }

  async parseDocument(document: TextDocument) {
    let cliOutput: CliOutput;
    try {
      cliOutput = {
        ok: true,
        ...(await this.cli.run([
          "--format",
          "yaml",
          "--items",
          "--map",
          "--tasks",
          document.uri.fsPath,
        ])),
      };
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
    listener: (e: DocumentParsedEvent) => void,
    thisArgs?: any,
    disposables?: Disposable[]
  ) {
    const subscriptionId: number = this.#nextSubscriptionId++;
    this.#didParseDocumentSubscriptions.set(
      subscriptionId,
      listener.bind(thisArgs)
    );

    const disposable = new Disposable(() => {
      log.info("Disposing of onDidParseDocument subscription", subscriptionId);
      this.#didParseDocumentSubscriptions.delete(subscriptionId);
    });
    if (disposables) {
      disposables?.push(disposable);
    }
    return disposable;
  }
}
