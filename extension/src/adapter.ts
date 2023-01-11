import { Disposable, ExtensionContext } from "vscode";
import { Ifm, IfmCli } from "./ifm-cli";
import Logger from "./logger";

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
