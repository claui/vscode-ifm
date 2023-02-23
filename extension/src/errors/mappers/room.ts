import {
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  Location,
  Range,
  TextDocument,
} from "vscode";

import { searchSubstring } from "../../text";
import { Room, RoomMessage } from "../ifm";

export function mapRoomMessage(message: RoomMessage, document: TextDocument) {
  if (!message.rooms.length) {
    throw new Error(`Invalid RoomMessage: ${JSON.stringify(message)}`);
  }
  const documentText: string = document.getText();

  function primaryRange(room: Room): Range {
    const roomText = `"${room.name}"`;
    const ranges: Range[] = [...searchSubstring(documentText, roomText)].map(
      (offset) => new Range(
        document.positionAt(offset),
        document.positionAt(offset + roomText.length),
      ));
    return ranges.length ? ranges[0] : new Range(0, 0, 0, 0);
  }

  const diagnostic = new Diagnostic(
    primaryRange(message.rooms[0]),
    message.description,
    DiagnosticSeverity.Warning,
  );
  if (message.rooms.length > 1) {
    diagnostic.relatedInformation = message.rooms.map((room) => {
      return new DiagnosticRelatedInformation(
        new Location(document.uri, primaryRange(room)),
        room.name,
      );
    });
  }
  diagnostic.source = "ifm";
  return diagnostic;
}
