import { execFileSync } from "child_process";

import { ExtensionContext, workspace } from "vscode";

import { getIfmCliVersion, IfmCli } from "./ifm-cli";

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
