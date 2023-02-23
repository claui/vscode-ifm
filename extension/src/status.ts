import {
  DocumentSelector,
  languages,
  LanguageStatusItem,
  LanguageStatusSeverity,
} from "vscode";

import { Ifm } from "./cli-api";
import CliFailedError from "./errors";
import log from "./log";
import { getCurrentTimestamp } from "./time";

const languageSelector: DocumentSelector = { language: "ifm" };

export class Status {
  ifm: Ifm;
  statusItem: LanguageStatusItem;

  constructor(ifm: Ifm) {
    this.ifm = ifm;
    this.statusItem = languages.createLanguageStatusItem(
      "ifm.status.item.version",
      languageSelector,
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
      this.statusItem.busy = true;

      const versionNumber: string = await this.ifm.cli.version;
      this.statusItem.text = `IFM CLI v${versionNumber}`;
      this.statusItem.severity = LanguageStatusSeverity.Information;
      log.info(this.statusItem.text);
    } catch (error) {
      if (error instanceof CliFailedError && "cause" in error) {
        log.error(error.message);
        log.error("Caused by:", String(error.cause));
        this.statusItem.text = String(error.cause);
      } else {
        log.error(error);
        this.statusItem.text = error.message;
      }
      this.statusItem.severity = LanguageStatusSeverity.Error;
    } finally {
      this.statusItem.busy = false;
      this.statusItem.detail = `Last updated: ${getCurrentTimestamp()}`;
    }
  }
}
