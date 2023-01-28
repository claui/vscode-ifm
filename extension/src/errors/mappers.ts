import { Diagnostic, TextDocument } from "vscode";

import { Message } from "./ifm";
import { mapCannotSolveMessage } from "./mappers/cannot-solve";
import { mapLineMessage } from "./mappers/line";
import { mapRoomMessage } from "./mappers/room";

type DiagnosticMapper = (
  message: Message,
  document: TextDocument
) => Diagnostic;

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

export function toDiagnostic(
  message: Message,
  document: TextDocument
): Diagnostic {
  const mapper: DiagnosticMapper = getDiagnosticMapper(message.kind);
  return mapper(message, document);
}
