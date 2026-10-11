import type { BoardState, CastlingRights, Color, Piece, PieceType } from './types';

export interface GameContext {
  castlingRights: CastlingRights;
  enPassantTarget: [number, number] | null;
  // Crazyhouse: 패에서 놓을 수 있는 기물 목록
  hand?: { white: PieceType[]; black: PieceType[] };
}

export interface MoveResult {
  board: BoardState;
  castlingRights: CastlingRights;
  enPassantTarget: [number, number] | null;
  promotionSquare: [number, number] | null;
  resetsHalfMoveClock: boolean;
  capturedPiece: Piece | null;
  context?: GameContext;
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function getPseudoLegalMoves(
  board: BoardState,
  row: number,
  col: number,
  enPassantTarget: [number, number] | null,
): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];
  const { type, color } = piece;
  const moves: [number, number][] = [];

  const slide = (dirs: ReadonlyArray<readonly [number, number]>) => {
    for (const [dr, dc] of dirs) {
      let nr = row + dr, nc = col + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (target === null) {
          moves.push([nr, nc]);
        } else {
          if (target.color !== color) moves.push([nr, nc]);
          break;
        }
        nr += dr; nc += dc;
      }
    }
  };

  switch (type) {
    case 'P': {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      if (inBounds(row + dir, col) && board[row + dir][col] === null) {
        moves.push([row + dir, col]);
        if (row === startRow && board[row + 2 * dir][col] === null) {
          moves.push([row + 2 * dir, col]);
        }
      }
      for (const dc of [-1, 1]) {
        const nr = row + dir, nc = col + dc;
        if (inBounds(nr, nc)) {
          const target = board[nr][nc];
          const isEP = enPassantTarget?.[0] === nr && enPassantTarget[1] === nc;
          if ((target !== null && target.color !== color) || isEP) {
            moves.push([nr, nc]);
          }
        }
      }
      break;
    }
    case 'N': {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] as [number,number][]) {
        const nr = row + dr, nc = col + dc;
        if (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (target === null || target.color !== color) moves.push([nr, nc]);
        }
      }
      break;
    }
    case 'B': slide([[-1,-1],[-1,1],[1,-1],[1,1]]); break;
    case 'R': slide([[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'Q': slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]); break;
    case 'K': {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]] as [number,number][]) {
        const nr = row + dr, nc = col + dc;
        if (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (target === null || target.color !== color) moves.push([nr, nc]);
        }
      }
      break;
    }
    case 'A': {
      // Amazon = Queen + Knight
      slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] as [number,number][]) {
        const nr = row + dr, nc = col + dc;
        if (inBounds(nr, nc)) {
          const target = board[nr][nc];
          if (target === null || target.color !== color) moves.push([nr, nc]);
        }
      }
      break;
    }
  }

  return moves;
}

// 변형 규칙용 유틸리티 export
export { getPseudoLegalMoves as getUncheckedMoves, isAttackedBy, findKing };

// 폰은 이동 방향(앞)과 공격 방향(대각선)이 달라 별도 처리
function getPawnAttacks(row: number, col: number, color: Color): [number, number][] {
  const dir = color === 'white' ? -1 : 1;
  return ([-1, 1] as const)
    .map((dc): [number, number] => [row + dir, col + dc])
    .filter(([r, c]) => inBounds(r, c));
}

function isAttackedBy(board: BoardState, row: number, col: number, byColor: Color): boolean {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.color !== byColor) continue;
      const attacks = piece.type === 'P'
        ? getPawnAttacks(r, c, byColor)
        : getPseudoLegalMoves(board, r, c, null);
      if (attacks.some(([ar, ac]) => ar === row && ac === col)) return true;
    }
  }
  return false;
}

function findKing(board: BoardState, color: Color): [number, number] | null {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq?.type === 'K' && sq.color === color) return [r, c];
    }
  }
  return null;
}

export function isInCheck(board: BoardState, color: Color): boolean {
  const king = findKing(board, color);
  if (!king) return false;
  const enemy: Color = color === 'white' ? 'black' : 'white';
  return isAttackedBy(board, king[0], king[1], enemy);
}

// 체크 검증용 시뮬레이션 — 앙파상 캡처 시 잡힌 폰도 제거
function simulateForCheck(
  board: BoardState,
  from: [number, number],
  to: [number, number],
  enPassantTarget: [number, number] | null,
): BoardState {
  const next = board.map(row => [...row]);
  const piece = next[from[0]][from[1]];
  if (piece?.type === 'P' && enPassantTarget?.[0] === to[0] && enPassantTarget[1] === to[1]) {
    next[from[0]][to[1]] = null;
  }
  next[to[0]][to[1]] = piece;
  next[from[0]][from[1]] = null;
  return next;
}

export function getLegalMoves(
  board: BoardState,
  row: number,
  col: number,
  context: GameContext,
): [number, number][] {
  const piece = board[row][col];
  if (!piece) return [];

  const pseudoMoves = getPseudoLegalMoves(board, row, col, context.enPassantTarget);
  const legalMoves = pseudoMoves.filter(([tr, tc]) => {
    const sim = simulateForCheck(board, [row, col], [tr, tc], context.enPassantTarget);
    return !isInCheck(sim, piece.color);
  });

  // 캐슬링: 킹이 체크 상태가 아닐 때만 가능
  if (piece.type === 'K' && !isInCheck(board, piece.color)) {
    const rights = context.castlingRights[piece.color];
    const enemy: Color = piece.color === 'white' ? 'black' : 'white';
    const kingRow = piece.color === 'white' ? 7 : 0;

    // 킹사이드: 킹 col4→6, 룩 col7→5, f·g 칸 비어 있고 공격 안 받음
    if (rights.kingSide &&
        board[kingRow][5] === null && board[kingRow][6] === null &&
        !isAttackedBy(board, kingRow, 5, enemy) &&
        !isAttackedBy(board, kingRow, 6, enemy)) {
      legalMoves.push([kingRow, 6]);
    }

    // 퀸사이드: 킹 col4→2, 룩 col0→3, b·c·d 칸 비어 있고 c·d 공격 안 받음
    if (rights.queenSide &&
        board[kingRow][1] === null && board[kingRow][2] === null && board[kingRow][3] === null &&
        !isAttackedBy(board, kingRow, 3, enemy) &&
        !isAttackedBy(board, kingRow, 2, enemy)) {
      legalMoves.push([kingRow, 2]);
    }
  }

  return legalMoves;
}

export function applyMoveToBoard(
  board: BoardState,
  from: [number, number],
  to: [number, number],
  context: GameContext,
): MoveResult {
  const next = board.map(row => [...row]);
  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = next[fr][fc]!;

  // 캐슬링: 킹이 2칸 이동
  if (piece.type === 'K' && Math.abs(tc - fc) === 2) {
    const isKingside = tc > fc;
    const rookFromCol = isKingside ? 7 : 0;
    const rookToCol = isKingside ? 5 : 3;
    next[tr][rookToCol] = next[tr][rookFromCol];
    next[tr][rookFromCol] = null;
  }

  // 앙파상: 대각선 이동인데 목적지가 비어 있음 → 지나간 폰 제거
  if (piece.type === 'P' && context.enPassantTarget?.[0] === tr && context.enPassantTarget[1] === tc) {
    next[fr][tc] = null;
  }

  next[tr][tc] = piece;
  next[fr][fc] = null;

  // 다음 앙파상 타겟: 폰이 2칸 이동했을 때 지나간 칸
  const newEnPassantTarget: [number, number] | null =
    piece.type === 'P' && Math.abs(tr - fr) === 2 ? [(fr + tr) / 2, fc] : null;

  // 캐슬링 권리 갱신
  const cr = context.castlingRights;
  const newCr: CastlingRights = {
    white: { ...cr.white },
    black: { ...cr.black },
  };
  if (piece.type === 'K') {
    newCr[piece.color].kingSide = false;
    newCr[piece.color].queenSide = false;
  }
  if (piece.type === 'R') {
    if (fc === 7) newCr[piece.color].kingSide = false;
    if (fc === 0) newCr[piece.color].queenSide = false;
  }
  // 룩이 잡혔을 때도 권리 소멸
  if (tr === 7 && tc === 7) newCr.white.kingSide = false;
  if (tr === 7 && tc === 0) newCr.white.queenSide = false;
  if (tr === 0 && tc === 7) newCr.black.kingSide = false;
  if (tr === 0 && tc === 0) newCr.black.queenSide = false;

  const promotionSquare: [number, number] | null =
    piece.type === 'P' && (tr === 0 || tr === 7) ? [tr, tc] : null;

  // 캡처된 기물 기록 (이동 전 원본 보드에서 확인)
  const capturedPiece: Piece | null =
    board[tr][tc] ??
    (piece.type === 'P' && context.enPassantTarget?.[0] === tr && context.enPassantTarget[1] === tc
      ? board[fr][tc]
      : null);

  const resetsHalfMoveClock = piece.type === 'P' || capturedPiece !== null;

  return { board: next, castlingRights: newCr, enPassantTarget: newEnPassantTarget, promotionSquare, resetsHalfMoveClock, capturedPiece };
}

export type GameStatus = 'playing' | 'checkmate' | 'stalemate';

export function getGameStatus(
  board: BoardState,
  turn: Color,
  context: GameContext,
): GameStatus {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece?.color === turn && getLegalMoves(board, r, c, context).length > 0) {
        return 'playing';
      }
    }
  }
  return isInCheck(board, turn) ? 'checkmate' : 'stalemate';
}

export function promotePawn(
  board: BoardState,
  square: [number, number],
  type: PieceType,
  color: Color,
): BoardState {
  const next = board.map(row => [...row]);
  next[square[0]][square[1]] = { type, color };
  return next;
}
