import {
  execFile,
  spawnSync,
  SpawnSyncOptionsWithStringEncoding,
} from "child_process";
import { promisify } from "util";

import {
  ConfigurationScope,
} from "vscode";

import {
  CliNamespace,
  ExecutableConfig,
  ExecutableConfigProvider,
  IfmCli,
} from "../cli";

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

export class CliProvider {
  #namespace: CliNamespace;
  #provideConfig: ExecutableConfigProvider;

  constructor(
    namespace: CliNamespace, provideConfig: ExecutableConfigProvider) {
    this.#namespace = namespace;
    this.#provideConfig = provideConfig;
  }

  async cliFor(scope: ConfigurationScope): Promise<IfmCli> {
    const config: ExecutableConfig = this.#provideConfig(scope);

    function run(argv: string[])
      : Promise<{ stdout: string; stderr: string }> {
      log.debug(`Running executable: '${config.executable}'`
        + ` with args: ${JSON.stringify(argv)}`);
      return execFileAsync(config.executable, argv);
    }

    function runSync(argv: string[], input: string) {
      return spawnSync(config.executable, argv, {
        input,
        timeout: config.maxRuntimeMillis,
        encoding: "utf8",
      } as SpawnSyncOptionsWithStringEncoding);
    }

    try {
      return {
        ok: true,
        version: await getVersion(run),
        namespace: this.#namespace,
        run,
        runSync,
      };

    } catch (error) {
      return {
        ok: false,
        namespace: this.#namespace,
        reason: error.message,
        error,
      };
    }
  }
}
