// A = Amazon (Queen + Knight 이동) — 커스텀 기물 예시
export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P' | 'A';
export type Color = 'white' | 'black';

export interface Piece {
  type: PieceType;
  color: Color;
}

// null = empty square
export type Square = Piece | null;

// [row][col]: row 0 = rank 8 (black side), row 7 = rank 1 (white side)
export type BoardState = Square[][];

export interface CastlingRights {
  white: { kingSide: boolean; queenSide: boolean };
  black: { kingSide: boolean; queenSide: boolean };
}

export interface PlayerNames {
  white: string;
  black: string;
}
