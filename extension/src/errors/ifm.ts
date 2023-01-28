import {
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  Location,
  Range,
  TextDocument,
} from "vscode";

type DiagnosticMapper = (
  message: Message,
  document: TextDocument
) => Diagnostic;

function* searchSubstring(haystack: string, needle: string) {
  let index: number = haystack.indexOf(needle);
  while (index >= 0) {
    yield index;
    index = haystack.indexOf(needle, index + needle.length);
  }
}

function mapLineMessage(message: LineMessage, document: TextDocument) {
  const diagnostic = new Diagnostic(
    document.lineAt(message.lineNumber - 1).range,
    message.predicate,
    DiagnosticSeverity.Error
  );
  return diagnostic;
}

function mapRoomMessage(message: RoomMessage, document: TextDocument) {
  if (!message.rooms.length) {
    throw new Error(`Invalid RoomMessage: ${JSON.stringify(message)}`);
  }
  const documentText: string = document.getText();

  function primaryRange(room: Room): Range {
    const roomText = `"${room.name}"`;
    const ranges: Range[] = [...searchSubstring(documentText, roomText)].map(
      (offset) =>
        new Range(
          document.positionAt(offset),
          document.positionAt(offset + roomText.length)
        )
    );
    return ranges.length ? ranges[0] : new Range(0, 0, 0, 0);
  }

  const diagnostic = new Diagnostic(
    primaryRange(message.rooms[0]),
    message.description,
    DiagnosticSeverity.Warning
  );
  if (message.rooms.length > 1) {
    diagnostic.relatedInformation = message.rooms.map((room) => {
      return new DiagnosticRelatedInformation(
        new Location(document.uri, primaryRange(room)),
        room.name
      );
    });
  }
  diagnostic.source = "ifm";
  return diagnostic;
}

function mapCannotSolveMessage(
  message: CannotSolveMessage,
  document: TextDocument
) {
  const pseudoRange = new Range(0, 0, 0, 0);
  const diagnostic = new Diagnostic(
    pseudoRange,
    message.description,
    DiagnosticSeverity.Error
  );
  diagnostic.relatedInformation = message.details.map(
    (detail) =>
      new DiagnosticRelatedInformation(
        new Location(document.uri, pseudoRange),
        `${detail.title}: ${detail.description}`
      )
  );
  diagnostic.source = "ifm";
  return diagnostic;
}

function getDiagnosticMapper(kind: Message["kind"]): DiagnosticMapper {
  switch (kind) {
    case "line":
      return mapLineMessage;
    case "room":
      return mapRoomMessage;
    case "cannot solve":
      return mapCannotSolveMessage;
    default:
      const _exhaustiveCheck: never = kind;
      return _exhaustiveCheck;
  }
}

interface BaseMessage {
  readonly description: string;
}

export interface LineMessage extends BaseMessage {
  readonly kind: "line";
  readonly lineNumber: number;
  readonly predicate: string;
}

export type Room = {
  readonly name: string;
};

export interface RoomMessage extends BaseMessage {
  readonly kind: "room";
  readonly rooms: Room[];
  readonly predicate: string;
}

export interface CannotSolveDetail {
  readonly title: string;
  readonly description: string;
}

export interface CannotSolveMessage extends BaseMessage {
  readonly kind: "cannot solve";
  readonly reasonSummary: string;
  readonly details: CannotSolveDetail[];
}

export type Message = LineMessage | RoomMessage | CannotSolveMessage;

export function toDiagnostic(
  message: Message,
  document: TextDocument
): Diagnostic {
  const mapper: DiagnosticMapper = getDiagnosticMapper(message.kind);
  return mapper(message, document);
}
