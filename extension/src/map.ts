import {
  CancellationToken,
  Disposable,
  TextDocument,
  WebviewView,
  WebviewViewProvider,
  WebviewViewResolveContext,
  window,
} from "vscode";
// import { select } from "./events/filters";

export class Map {}

// function selectDocument(
//   document: TextDocument,
//   upstreamEvent: Event<TextDocumentChangeEvent>
// ): Event<TextDocumentChangeEvent> {
//   return select();
// }

export const MapViewProvider: WebviewViewProvider = {
  resolveWebviewView(
    webviewView: WebviewView,
    _context: WebviewViewResolveContext<Map>,
    token: CancellationToken,
  ) {
    const {activeTextEditor} = window;
    if (!activeTextEditor) {
      throw new Error("No active text editor found");
    }
    const backingDocument: TextDocument = activeTextEditor.document;
    webviewView.title = "Map preview";
    webviewView.description = backingDocument.uri.path;
    const disposables: Disposable[] = [];
    // disposables.push(backingDocument);
    token.onCancellationRequested(() => {
      disposables.forEach((d) => d.dispose);
    });
  },
};
