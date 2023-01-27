import {
  Diagnostic,
  DiagnosticSeverity,
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

function mapRoomMessage(message: RoomMessage, document: TextDocument) {
  const subjectText = `"${message.room.name}"`;
  const ranges: Range[] = [
    ...searchSubstring(document.getText(), subjectText),
  ].map(
    (offset) =>
      new Range(
        document.positionAt(offset),
        document.positionAt(offset + subjectText.length)
      )
  );
  const primaryRange: Range = ranges.length ? ranges[0] : new Range(0, 0, 0, 0);
  const diagnostic = new Diagnostic(
    primaryRange,
    message.fullText,
    DiagnosticSeverity.Warning
  );
  diagnostic.source = "ifm";
  return diagnostic;
}

function mapCannotSolveMessage(message: CannotSolveMessage) {
  return new Diagnostic(new Range(0, 0, 0, 0), message.fullText);
}

function getDiagnosticMapper(kind: Message["kind"]): DiagnosticMapper {
  switch (kind) {
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
  readonly fullText: string;
}

export type Room = {
  readonly name: string;
};

export interface RoomMessage extends BaseMessage {
  readonly kind: "room";
  readonly room: Room;
  readonly predicate: string;
}

export interface CannotSolveMessage extends BaseMessage {
  readonly kind: "cannot solve";
  readonly foo: string;
}

export type Message = RoomMessage | CannotSolveMessage;

export function toDiagnostic(
  message: Message,
  document: TextDocument
): Diagnostic {
  const mapper: DiagnosticMapper = getDiagnosticMapper(message.kind);
  return mapper(message, document);
}
