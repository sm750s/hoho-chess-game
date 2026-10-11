import type { BoardState, PieceType } from '../core/types';

const FILES = 'abcdefgh';
const PIECE_LETTER: Record<PieceType, string> = {
  K: 'K', Q: 'Q', R: 'R', B: 'B', N: 'N', P: '', A: 'A',
};

export function squareName(row: number, col: number): string {
  return `${FILES[col]}${8 - row}`;
}

export function moveNotation(
  board: BoardState,
  from: [number, number],
  to: [number, number],
  promotionType?: PieceType | null,
): string {
  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = board[fr][fc];
  if (!piece) return squareName(tr, tc);

  if (piece.type === 'K' && Math.abs(tc - fc) === 2) {
    return tc > fc ? 'O-O' : 'O-O-O';
  }

  const isCapture = board[tr][tc] !== null;
  const letter = PIECE_LETTER[piece.type] ?? piece.type;
  const toSq = squareName(tr, tc);

  if (piece.type === 'P') {
    const base = isCapture ? `${FILES[fc]}x${toSq}` : toSq;
    return promotionType ? `${base}=${PIECE_LETTER[promotionType] ?? promotionType}` : base;
  }

  return `${letter}${isCapture ? 'x' : ''}${toSq}`;
}
