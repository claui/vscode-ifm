import { execFile } from "child_process";
import { promisify } from "util";

import { Disposable, workspace } from "vscode";

import { Ifm, IfmCli } from "../cli-api";
import CliFailedError from "../errors";
import log from "../log";

const MAX_LENGTH = 256;
const VERSION_PATTERN = /IFM version (.*)/;

const execFileAsync = promisify(execFile);

async function getVersion(
  cliRun: (argv: string[]) => Promise<Buffer | string>
): Promise<string> {
  let stdout: string | Buffer;
  try {
    stdout = await cliRun(["--version"]);
  } catch (error) {
    throw new CliFailedError("Unable to obtain IFM CLI version", {
      cause: error,
    });
  }

  const stdoutString = typeof stdout == "string" ? stdout : stdout.toString();
  const matchingGroups = VERSION_PATTERN.exec(stdoutString);
  if (!matchingGroups || matchingGroups.length != 2) {
    throw new CliFailedError(
      `No version number found in IFM output: ${stdoutString}`
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
    return execFileAsync(getExecutable(), argv).then((result) => result.stdout);
  };

  return {
    get version() {
      return getVersion(run);
    },

    run,
  };
}

export class IfmAdapter implements Ifm {
  #subscriptions: Map<number, () => void> = new Map();
  #nextSubscriptionId = 0;
  cli: IfmCli;

  static async newInstance(): Promise<Ifm> {
    const cli: IfmCli = await getCli();
    return new IfmAdapter(cli);
  }

  constructor(cli: IfmCli) {
    this.cli = cli;
    workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration("ifm")) {
        this.refreshCli(await getCli());
      }
    });
  }

  async refreshCli(cli: IfmCli) {
    this.cli = cli;
    for (const subscription of this.#subscriptions.values()) {
      subscription();
    }
  }

  onDidCliChange(
    listener: () => void,
    thisArgs?: any,
    disposables?: Disposable[]
  ) {
    const subscriptionId: number = this.#nextSubscriptionId++;
    this.#subscriptions.set(subscriptionId, listener.bind(thisArgs));

    const disposable = new Disposable(() => {
      log.info("Disposing of subscription", subscriptionId);
      this.#subscriptions.delete(subscriptionId);
    });
    if (disposables) {
      disposables?.push(disposable);
    }
    return disposable;
  }
}
