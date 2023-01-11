import { Event } from "vscode";

/**
 * Internal API to be consumed by clients of the CLI.
 *
 * For example, a component that provides diagnostics
 * (warnings and errors) can be a client of this API.
 *
 * These clients shouldn’t have to concern themselves
 * with details such as monitoring the `ifm.executablePath`
 * setting for changes. This is where this API comes in.
 */
export interface Ifm {
  readonly cli: IfmCli;

  onDidCliChange: Event<void>
}

export interface IfmCli {
  get version(): Promise<string>

  run(argv: string[]): Promise<Buffer | string>;
}
