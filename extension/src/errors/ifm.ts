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
