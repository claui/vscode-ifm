import { Event, TextDocument } from "vscode";

interface CliOk {
  readonly version: string;

  run(argv: string[]): Promise<{ stdout: string; stderr: string }>;

  runSync(
    argv: string[],
    input: string,
    timeout: string | number
  ): { stdout: string; stderr: string; status: number | null; error?: Error };
}

type CliNotOk = { reason: string, error: Error };

export type CliOutput = { success: boolean; stdout: string; stderr: string };
export type CliResult =
  | { hasRun: true } & CliOutput
  | { hasRun: false, success: false } & CliNotOk

export type DocumentParsedEvent = { document: TextDocument } & CliResult;

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

  onDidCliChange: Event<void>;

  onDidParseDocument: Event<DocumentParsedEvent>;
}

export type IfmCli =
  | { ok: true } & CliOk
  | { ok: false } & CliNotOk
