import {
  DocumentSelector,
  languages,
  LanguageStatusItem,
  LanguageStatusSeverity,
} from "vscode";

import { IfmCli, onDidCliChange } from "./cli-api";
import log from "./log";
import { getCurrentTimestamp } from "./time";

const languageSelector: DocumentSelector = { language: "ifm" };

export class Status {
  statusItem: LanguageStatusItem;

  constructor() {
    this.statusItem = languages.createLanguageStatusItem(
      "ifm.status.item.version",
      languageSelector,
    );
    this.statusItem.command = {
      command: "ifm.action.showLog",
      title: "Show extension log",
    };
    onDidCliChange(this.refresh, this);
  }

  busy(reason: string) {
    this.statusItem.busy = true;
    this.statusItem.text = reason;
    this.statusItem.detail = `Last updated: ${getCurrentTimestamp()}`;
    this.statusItem.severity = LanguageStatusSeverity.Information;
    log.info(this.statusItem.text);
  }

  refresh(cli: IfmCli) {
    this.statusItem.busy = false;
    if (cli.ok) {
      this.statusItem.text = `IFM CLI v${cli.version}`;
      this.statusItem.severity = LanguageStatusSeverity.Information;
      log.info(this.statusItem.text);
    } else {
      if (cli.error.cause) {
        log.error(cli.error.message);
        log.error("Caused by:", String(cli.error.cause));
      } else {
        log.error(cli.error);
      }
      this.statusItem.text = cli.reason;
      this.statusItem.severity = LanguageStatusSeverity.Error;
    }

    this.statusItem.detail = `Last updated: ${getCurrentTimestamp()}`;
  }
}
