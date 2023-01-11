import { IfmCli } from "../ifm-cli";
import CliFailedError from "../errors/cli-failed";

const MAX_LENGTH = 256;
const VERSION_PATTERN = /IFM version (.*)/;

export const getIfmCliVersion = async (
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
