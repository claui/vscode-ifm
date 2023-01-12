import {
  DocumentSelector,
  languages,
  LanguageStatusItem,
  LanguageStatusSeverity,
} from "vscode";

import { Ifm } from "./cli-api";
import CliFailedError from "./errors";
import Logger from "./logger";
import { getCurrentTimestamp } from "./time";

const languageSelector: DocumentSelector = { language: "ifm" };

export class Status {
  ifm: Ifm;
  log: Logger;
  statusItem: LanguageStatusItem;

  constructor(ifm: Ifm, log: Logger) {
    this.ifm = ifm;
    this.log = log;

    this.statusItem = languages.createLanguageStatusItem(
      "ifm.status.item.version",
      languageSelector
    );
    this.statusItem.command = {
      command: "ifm.action.showLog",
      title: "Show extension log",
    };
    ifm.onDidCliChange(this.refresh, this);
  }

  async refresh() {
    try {
      this.statusItem.text = "Querying IFM CLI version";
      this.log.info(this.statusItem.detail);
      this.statusItem.busy = true;

      const versionNumber: string = await this.ifm.cli.version;
      this.statusItem.text = `IFM CLI v${versionNumber}`;
      this.statusItem.severity = LanguageStatusSeverity.Information;
      this.log.info(this.statusItem.text);
      this.statusItem.detail = `Last updated: ${getCurrentTimestamp()}`;
    } catch (error) {
      this.log.error(error?.message ?? error);
      this.statusItem.text = error.message;
      if (error instanceof CliFailedError && "cause" in error) {
        this.statusItem.detail = `Caused by: ${error.cause}`;
        this.log.error(`> ${error.cause}`);
      } else {
        this.statusItem.detail = undefined;
      }
      this.statusItem.severity = LanguageStatusSeverity.Error;
    } finally {
      this.statusItem.busy = false;
    }
  }
}
