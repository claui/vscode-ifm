/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import fs = require("fs");
import ohm = require("ohm-js");
import path = require("path");

import * as ifm from "./errors/ifm";
import { capitalizeString } from "./text";

type Grammar = ohm.Grammar;
type Semantics = ohm.Semantics;

const contents: string = fs.readFileSync(
  path.join(__dirname, "../share/error-grammar.ohm"),
  "utf-8",
);

export const grammar: Grammar = ohm.grammar(contents);
export const semantics: Semantics = grammar.createSemantics();

semantics.addOperation("parseMessageGroup()", {
  MessageGroup(e) {
    return e.children.map((c) => c.parseMessage());
  }});

semantics.addOperation("parseMessage()", {
  Message(e) {
    return e.parseMessageWithDescription(e.sourceString.trimEnd());
  }} as ohm.ActionDict<ifm.Message>);

semantics.addOperation("parseMessageWithDescription(description)", {
  lineMessage(_1, _2, _3, _4, lineNumber, _6, trailingPredicate) {
    return {
      kind: "line",
      lineNumber: parseInt(lineNumber.sourceString, 10),
      predicate: trailingPredicate.capitalize(),
      description: this.args.description,
    };
  },
  roomMessage(_1, _2, quotedRoomName, _4, trailingPredicate) {
    return {
      kind: "room",
      rooms: [{ name: quotedRoomName.roomName }],
      predicate: trailingPredicate.sourceString.trimEnd(),
      description: capitalizeString(this.args.description),
    };
  },
  roomsMessage(_1, _2, quotedRoomNames, _4, trailingPredicate) {
    return {
      kind: "room",
      rooms: quotedRoomNames.roomNames.children.map(
        (quotedRoomName: ohm.Dict) => ({
          name: quotedRoomName.roomName,
        }),
      ),
      predicate: trailingPredicate.sourceString.trimEnd(),
      description: capitalizeString(this.args.description),
    };
  },
  cannotSolveMessage(cannotSolveHeader, detailSections) {
    return {
      kind: "cannot solve",
      reasonSummary: cannotSolveHeader.reasonSummary,
      details: detailSections
        .child(0)
        .children.map((section) => section.parseDetail()),
      description: capitalizeString(cannotSolveHeader.sourceString.trimEnd()),
    };
  },
} as ohm.ActionDict<ifm.Message>);

semantics.addOperation("capitalize()", {
  trailingPredicate(predicate, _2) {
    return capitalizeString(predicate.sourceString);
  }});

semantics.addOperation("parseDetail()", {
  detailSection(sectionHeader, sectionDescription) {
    return {
      title: sectionHeader.text,
      description: sectionDescription.text,
    };
  }} as ohm.ActionDict<ifm.CannotSolveDetail>);

semantics.addAttribute("reasonSummary", {
  cannotSolveHeader(_1, _2, _3, reasonSummary, _5) {
    return reasonSummary.sourceString;
  }});

semantics.addAttribute("roomName", {
  quotedRoomName(_1, roomName, _3) {
    return roomName.sourceString;
  }});

semantics.addAttribute("roomNames", {
  quotedRoomNames(_1, quotedRoomNames) {
    return quotedRoomNames;
  }});

semantics.addAttribute("text", {
  sectionHeader(_1, sectionTitle, _3, _4) {
    return sectionTitle.sourceString;
  },
  sectionDescription(_1, _2, textLine) {
    return textLine.sourceString.trimEnd();
  },
});
