import fs = require("fs");
import ohm = require("ohm-js");
import path = require("path");

import {
  Diagnostic,
  DiagnosticCollection,
  languages,
  TextDocument,
} from "vscode";

import { DocumentParsedEvent, Ifm } from "./cli-api";
import * as ifm from "./errors/ifm";
import log from "./log";

type Grammar = ohm.Grammar;
type Semantics = ohm.Semantics;

const contents: string = fs.readFileSync(
  path.join(__dirname, "../share/error-grammar.ohm"),
  "utf-8"
);
const grammar: Grammar = ohm.grammar(contents);
const semantics: Semantics = grammar.createSemantics();

semantics.addOperation("parseMessageGroup()", {
  MessageGroup(e) {
    return e.children.map((c) => c.parseMessage());
  },
});

semantics.addOperation("parseMessage()", {
  Message(e) {
    return e.parseMessageWithFullText(e.sourceString.trimEnd());
  },
} as ohm.ActionDict<ifm.Message>);

semantics.addOperation("parseMessageWithFullText(fullText)", {
  roomMessage(_1, _2, quotedRoomName, _4, trailingPredicate) {
    return {
      kind: "room",
      room: { name: quotedRoomName.roomName },
      predicate: trailingPredicate.sourceString.trimEnd(),
      fullText: this.args.fullText,
    };
  },
  cannotSolveMessage(cannotSolveHeader, reasonSections) {
    return {
      kind: "cannot solve",
      foo: "bar",
      fullText: this.args.fullText,
    };
  },
} as ohm.ActionDict<ifm.Message>);

semantics.addAttribute("roomName", {
  quotedRoomName(_1, roomName, _3) {
    return roomName.sourceString;
  },
});

export class Diagnostics {
  #diagnosticCollection: DiagnosticCollection =
    languages.createDiagnosticCollection("IFM");

  constructor(ifm: Ifm) {
    ifm.onDidParseDocument(this.refresh, this);
  }

  async refresh(event: DocumentParsedEvent) {
    log.info("Refreshing diagnostics", event.document.uri.toString());
    const matchResult = grammar.match(event.stderr);
    if (matchResult.failed()) {
      throw new Error(matchResult.message);
    }

    const ifmMessages: ifm.Message[] =
      semantics(matchResult).parseMessageGroup();
    const diagnostics: Diagnostic[] = ifmMessages.map((message) =>
      ifm.toDiagnostic(message, event.document)
    );
    this.#diagnosticCollection.set(event.document.uri, diagnostics);
  }

  delete(document: TextDocument) {
    this.#diagnosticCollection.delete(document.uri);
  }
}
