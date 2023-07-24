import {
  ConfigurationScope,
} from "vscode";

export { CliProvider } from "./cli/provider";

interface CliOk {
  readonly namespace: CliNamespace;
  readonly version: string;

  run(argv: string[]): Promise<{ stdout: string; stderr: string }>;

  runSync(
    argv: string[],
    input: string,
  ): { stdout: string; stderr: string; status: number | null; error?: Error };
}

interface CliNotOk {
  namespace: CliNamespace;
  reason: string;
  error: Error;
}

export type IfmCli =
  | { ok: true } & CliOk
  | { ok: false } & CliNotOk

export interface CliOutput {
  success: boolean;
  stdout: string;
  stderr: string;
}

export type CliResult =
  | { hasRun: true } & CliOutput
  | { hasRun: false, success: false } & CliNotOk

export type CliNamespace = string;

export interface ExecutableConfig {
  readonly executable: string;
  readonly maxRuntimeMillis: string | number;
}

export type ExecutableConfigProvider =
  (scope?: ConfigurationScope) => ExecutableConfig;
