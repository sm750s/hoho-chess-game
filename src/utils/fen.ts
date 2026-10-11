import type { BoardState, CastlingRights, Color, Piece } from '../core/types';
import type { GameContext } from '../core/MoveValidator';

const PIECE_TO_FEN: Record<string, string> = {
  'white-K': 'K', 'white-Q': 'Q', 'white-R': 'R',
  'white-B': 'B', 'white-N': 'N', 'white-P': 'P',
  'black-K': 'k', 'black-Q': 'q', 'black-R': 'r',
  'black-B': 'b', 'black-N': 'n', 'black-P': 'p',
};

const FILES = 'abcdefgh';

export function boardToFen(
  board: BoardState,
  turn: Color,
  context: GameContext,
  halfMoveClock: number,
  fullMove: number,
): string {
  const rows = board.map(row => {
    let s = '';
    let empty = 0;
    for (const sq of row) {
      if (sq === null) {
        empty++;
      } else {
        if (empty > 0) { s += empty; empty = 0; }
        s += PIECE_TO_FEN[`${sq.color}-${sq.type}`] ?? sq.type;
      }
    }
    if (empty > 0) s += empty;
    return s;
  });

  const activeColor = turn === 'white' ? 'w' : 'b';
  const { white, black } = context.castlingRights;
  const castling = [
    white.kingSide  ? 'K' : '',
    white.queenSide ? 'Q' : '',
    black.kingSide  ? 'k' : '',
    black.queenSide ? 'q' : '',
  ].join('') || '-';
  const ep = context.enPassantTarget
    ? `${FILES[context.enPassantTarget[1]]}${8 - context.enPassantTarget[0]}`
    : '-';

  return `${rows.join('/')} ${activeColor} ${castling} ${ep} ${halfMoveClock} ${fullMove}`;
}

// ── FEN 파싱 ──────────────────────────────────────────────────────────────────

export interface FenParseResult {
  board: BoardState;
  turn: Color;
  context: GameContext;
  halfMoveClock: number;
  fullMove: number;
}

const FEN_TO_PIECE: Record<string, Piece> = {
  K: { type: 'K', color: 'white' }, Q: { type: 'Q', color: 'white' },
  R: { type: 'R', color: 'white' }, B: { type: 'B', color: 'white' },
  N: { type: 'N', color: 'white' }, P: { type: 'P', color: 'white' },
  A: { type: 'A', color: 'white' },
  k: { type: 'K', color: 'black' }, q: { type: 'Q', color: 'black' },
  r: { type: 'R', color: 'black' }, b: { type: 'B', color: 'black' },
  n: { type: 'N', color: 'black' }, p: { type: 'P', color: 'black' },
  a: { type: 'A', color: 'black' },
};

export function fenToBoard(fen: string): FenParseResult | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return null;

  const [placement, activeColor, castling, epSquare, halfMoveStr = '0', fullMoveStr = '1'] = parts;

  // 기물 배치 파싱
  const rows = placement.split('/');
  if (rows.length !== 8) return null;

  const board: BoardState = [];
  for (const rowStr of rows) {
    const row: (Piece | null)[] = [];
    for (const ch of rowStr) {
      const num = parseInt(ch);
      if (!isNaN(num)) {
        for (let i = 0; i < num; i++) row.push(null);
      } else {
        const piece = FEN_TO_PIECE[ch];
        if (!piece) return null;
        row.push({ ...piece });
      }
    }
    if (row.length !== 8) return null;
    board.push(row);
  }

  // 턴
  if (activeColor !== 'w' && activeColor !== 'b') return null;
  const turn: Color = activeColor === 'w' ? 'white' : 'black';

  // 캐슬링 권한
  const castlingRights: CastlingRights = {
    white: { kingSide: castling.includes('K'), queenSide: castling.includes('Q') },
    black: { kingSide: castling.includes('k'), queenSide: castling.includes('q') },
  };

  // 앙파상
  let enPassantTarget: [number, number] | null = null;
  if (epSquare !== '-' && epSquare.length >= 2) {
    const file = FILES.indexOf(epSquare[0]);
    const rank = parseInt(epSquare[1]);
    if (file >= 0 && rank >= 1 && rank <= 8) {
      enPassantTarget = [8 - rank, file];
    }
  }

  const halfMoveClock = Math.max(0, parseInt(halfMoveStr) || 0);
  const fullMove = Math.max(1, parseInt(fullMoveStr) || 1);

  return {
    board,
    turn,
    context: { castlingRights, enPassantTarget },
    halfMoveClock,
    fullMove,
  };
}
