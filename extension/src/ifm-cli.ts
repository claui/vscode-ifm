import { Event } from "vscode";

export { getIfmCliVersion } from "./ifm-cli/version";

export interface Ifm {
  readonly cli: IfmCli;

  onDidCliChange: Event<void>
}

export interface IfmCli {
  get version(): Promise<string>

  run(argv: string[]): Promise<Buffer | string>;
}
