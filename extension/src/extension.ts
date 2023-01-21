import {
  commands,
  DiagnosticCollection,
  Disposable,
  Event,
  languages,
  TextDocument,
  TextDocumentChangeEvent,
  Uri,
  workspace,
} from "vscode";

import { Ifm } from "./cli-api";
import { IfmAdapter } from "./cli-api/impl";
import { EventFilterByScheme, EventGroup, throttleEvent } from "./events";
import log from "./log";
import { Status } from "./status";

const diagnosticsByUri: Map<string, DiagnosticCollection> = new Map();

function updateDiagnostics(
  uri: Uri,
  diagnosticCollection: DiagnosticCollection,
  reason: string
) {
  log.info(reason, uri.toString());
}

export async function activate() {
  const ifm: IfmAdapter = await IfmAdapter.newInstance();
  const status: Status = new Status(ifm);
  await status.refresh();

  commands.registerCommand("ifm.action.refresh", ifm.refreshCli, ifm);
  commands.registerCommand("ifm.action.showLog", log.show, log);

  const schemesToExclude: string[] = ["git", "gitfs", "output"];
  const eventFilter = new EventFilterByScheme(schemesToExclude);

  const onDidChangeRelevantTextDocument: Event<
    EventGroup<TextDocumentChangeEvent, TextDocument>
  > = throttleEvent(
    1000,
    (e: TextDocumentChangeEvent) => e.document,
    eventFilter.filter(
      (event) => event.document.uri,
      workspace.onDidChangeTextDocument
    )
  );
  onDidChangeRelevantTextDocument(
    (eventGroup: EventGroup<TextDocumentChangeEvent, TextDocument>) => {
      const uri: Uri = eventGroup.group.uri;
      const diagnostics: DiagnosticCollection | undefined =
        diagnosticsByUri.get(uri.toString());
      if (!diagnostics) {
        log.warn("Missing DiagnosticCollection:", uri.toString());
        const diagnostics: DiagnosticCollection =
          languages.createDiagnosticCollection(uri.toString());
        diagnosticsByUri.set(uri.toString(), diagnostics);
        return;
      }
      updateDiagnostics(uri, diagnostics, "onDidChangeTextDocument");
    }
  );

  const onDidOpenRelevantTextDocument: Event<TextDocument> = eventFilter.filter(
    (document) => document.uri,
    workspace.onDidOpenTextDocument
  );
  onDidOpenRelevantTextDocument((document) => {
    if (diagnosticsByUri.has(document.uri.toString())) {
      log.warn("Found orphaned DiagnosticCollection:", document.uri.toString());
      diagnosticsByUri.delete(document.uri.toString());
    }
    const diagnostics = languages.createDiagnosticCollection(
      document.uri.toString()
    );
    diagnosticsByUri.set(document.uri.toString(), diagnostics);
    updateDiagnostics(document.uri, diagnostics, "onDidOpenTextDocument");
  });

  const onDidCloseRelevantTextDocument: Event<TextDocument> =
    eventFilter.filter(
      (document) => document.uri,
      workspace.onDidCloseTextDocument
    );
  onDidCloseRelevantTextDocument((document) => {
    if (!diagnosticsByUri.has(document.uri.toString())) {
      log.warn("Missing DiagnosticCollection:", document.uri.toString());
      return;
    }
    diagnosticsByUri.delete(document.uri.toString());
    log.debug("Diagnostics deleted");
  });

  const onDidInitiallyFindTextDocument: Event<TextDocument> = (
    listener: (e: TextDocument) => any,
    thisArgs?: any
  ): Disposable => {
    for (const document of workspace.textDocuments) {
      listener.call(thisArgs, document);
    }
    return Disposable.from();
  };
  const onDidInitiallyFindRelevantTextDocument: Event<TextDocument> =
    eventFilter.filter(
      (document) => document.uri,
      onDidInitiallyFindTextDocument
    );
  onDidInitiallyFindRelevantTextDocument((document) => {
    if (diagnosticsByUri.has(document.uri.toString())) {
      return;
    }
    const diagnostics: DiagnosticCollection =
      languages.createDiagnosticCollection(document.uri.toString());
    diagnosticsByUri.set(document.uri.toString(), diagnostics);
    updateDiagnostics(document.uri, diagnostics, "initial state of workspace");
  });

  return { ifm } as { ifm: Ifm };
}

export function deactivate() {}
