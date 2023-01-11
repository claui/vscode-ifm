import { execFileSync } from "child_process";

import { Disposable, ExtensionContext, workspace } from "vscode";

import { Ifm, IfmCli } from "../cli-api";
import CliFailedError from "../errors";
import Logger from "../logger";

const MAX_LENGTH = 256;
const VERSION_PATTERN = /IFM version (.*)/;

const getIfmCliVersion = async (
  cliRun: (argv: string[]) => Promise<Buffer | string>
): Promise<string> => {
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
};

export async function getIfmCli(context: ExtensionContext): Promise<IfmCli> {
  const getIfmExecutable = async (): Promise<string> => {
    const executablePathSetting: string | undefined = workspace
      .getConfiguration("ifm")
      .get("executablePath");

    if (!executablePathSetting || executablePathSetting === "") {
      return "ifm";
    }
    return executablePathSetting;
  };

  const run = async (argv: string[]) => {
    return execFileSync(await getIfmExecutable(), argv);
  };

  return {
    get version() {
      return getIfmCliVersion(run);
    },

    run,
  };
}

export class IfmAdapter implements Ifm {
  #log: Logger;
  #subscriptions: Map<number, () => void> = new Map();
  #nextSubscriptionId = 0;
  cli: IfmCli;

  constructor(cli: IfmCli, log: Logger) {
    this.#log = log;
    this.cli = cli;
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
      this.#log.info(`Disposing of subscription #${subscriptionId}`);
      this.#subscriptions.delete(subscriptionId);
    });
    if (disposables) {
      disposables?.push(disposable);
    }
    return disposable;
  }
}
