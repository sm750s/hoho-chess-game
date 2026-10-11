import type { BoardState, Color, PieceType } from '../core/types';
import type { GameContext } from '../core/MoveValidator';
import type { RuleSet } from '../rules/RuleSet';

export type AiMove =
  | { kind: 'move'; from: [number, number]; to: [number, number] }
  | { kind: 'drop'; pieceType: PieceType; color: Color; to: [number, number] };

// ── 기물 가치 ──────────────────────────────────────────────────────────────────

const PIECE_VALUES: Partial<Record<PieceType, number>> = {
  P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000, A: 1200,
};

// ── Piece-Square Tables ───────────────────────────────────────────────────────
// [boardRow][boardCol], row 0 = rank 8 (black's back), row 7 = rank 1 (white's back)
// 흰색: pst[boardRow][col], 검은색: pst[7 - boardRow][col]

const PAWN_PST = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [ 50, 50, 50, 50, 50, 50, 50, 50],
  [ 10, 10, 20, 30, 30, 20, 10, 10],
  [  5,  5, 10, 25, 25, 10,  5,  5],
  [  0,  0,  0, 20, 20,  0,  0,  0],
  [  5, -5,-10,  0,  0,-10, -5,  5],
  [  5, 10, 10,-20,-20, 10, 10,  5],
  [  0,  0,  0,  0,  0,  0,  0,  0],
];

const KNIGHT_PST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];

const BISHOP_PST = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];

const ROOK_PST = [
  [  0,  0,  0,  0,  0,  0,  0,  0],
  [  5, 10, 10, 10, 10, 10, 10,  5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [ -5,  0,  0,  0,  0,  0,  0, -5],
  [  0,  0,  0,  5,  5,  0,  0,  0],
];

const QUEEN_PST = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [ -5,  0,  5,  5,  5,  5,  0, -5],
  [  0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];

const KING_PST = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [ 20, 20,  0,  0,  0,  0, 20, 20],
  [ 20, 30, 10,  0,  0, 10, 30, 20],
];

const PST_MAP: Partial<Record<PieceType, number[][]>> = {
  P: PAWN_PST, N: KNIGHT_PST, B: BISHOP_PST,
  R: ROOK_PST, Q: QUEEN_PST,  K: KING_PST, A: QUEEN_PST,
};

function getPst(type: PieceType, color: Color, row: number, col: number): number {
  const pst = PST_MAP[type];
  if (!pst) return 0;
  return pst[color === 'white' ? row : 7 - row][col];
}

// ── 평가 함수 ──────────────────────────────────────────────────────────────────

function evaluate(board: BoardState, forColor: Color, context?: GameContext): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = (PIECE_VALUES[p.type] ?? 0) + getPst(p.type, p.color, r, c);
      score += p.color === forColor ? val : -val;
    }
  }
  // 패 기물 (Crazyhouse): 기본값의 80% — 아직 놓이지 않았지만 활용 가능
  if (context?.hand) {
    const opp: Color = forColor === 'white' ? 'black' : 'white';
    for (const t of context.hand[forColor]) score += (PIECE_VALUES[t as PieceType] ?? 0) * 0.8;
    for (const t of context.hand[opp])      score -= (PIECE_VALUES[t as PieceType] ?? 0) * 0.8;
  }
  return score;
}

// ── 합법 이동 수집 ────────────────────────────────────────────────────────────

function getAllAiMoves(
  board: BoardState,
  color: Color,
  context: GameContext,
  ruleset: RuleSet,
): AiMove[] {
  const moves: AiMove[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color !== color) continue;
      for (const to of ruleset.getLegalMoves(board, r, c, context)) {
        moves.push({ kind: 'move', from: [r, c], to });
      }
    }
  }
  // 드롭 이동 (Crazyhouse)
  if (ruleset.getDropTargets && ruleset.applyDrop && context.hand) {
    const uniqueTypes = [...new Set(context.hand[color])] as PieceType[];
    for (const pt of uniqueTypes) {
      for (const to of ruleset.getDropTargets(board, context, pt, color)) {
        moves.push({ kind: 'drop', pieceType: pt, color, to });
      }
    }
  }
  return moves;
}

function applyAiMove(
  board: BoardState,
  move: AiMove,
  context: GameContext,
  ruleset: RuleSet,
): { board: BoardState; context: GameContext } {
  if (move.kind === 'move') {
    const result = ruleset.applyMove(board, move.from, move.to, context);
    return {
      board: result.board,
      context: result.context ?? { castlingRights: result.castlingRights, enPassantTarget: result.enPassantTarget },
    };
  }
  return ruleset.applyDrop!(board, move.to, move.pieceType, move.color, context);
}

// ── 미니맥스 + 알파-베타 가지치기 ─────────────────────────────────────────────

function minimax(
  board: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  forColor: Color,
  context: GameContext,
  ruleset: RuleSet,
): number {
  const turnColor: Color = maximizing ? forColor : (forColor === 'white' ? 'black' : 'white');
  const status = ruleset.getGameStatus(board, turnColor, context);
  if (status === 'checkmate') return maximizing ? -15000 + depth * 100 : 15000 - depth * 100;
  if (status === 'stalemate') return 0;
  if (depth === 0) return evaluate(board, forColor, context);

  const moves = getAllAiMoves(board, turnColor, context, ruleset);
  if (moves.length === 0) return evaluate(board, forColor, context);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const { board: nb, context: nc } = applyAiMove(board, move, context, ruleset);
      const val = minimax(nb, depth - 1, alpha, beta, false, forColor, nc, ruleset);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const { board: nb, context: nc } = applyAiMove(board, move, context, ruleset);
      const val = minimax(nb, depth - 1, alpha, beta, true, forColor, nc, ruleset);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ── 난이도 ────────────────────────────────────────────────────────────────────

export type AiDifficulty = 'easy' | 'medium' | 'hard';

// 초급: depth 1 + 50% 확률로 랜덤 수 선택
// 중급: depth 3
// 고급: depth 4
const DIFFICULTY_DEPTH: Record<AiDifficulty, number> = { easy: 1, medium: 3, hard: 4 };
const DIFFICULTY_RANDOM_RATE: Record<AiDifficulty, number> = { easy: 0.5, medium: 0, hard: 0 };

// AI 항복 임계값 (centipawn): 이 점수 이하면 항복 고려
// medium: 퀸+나이트(~1220) 이상 불리 / hard: 퀸+루크+비숍(~1730) 이상 불리
const RESIGN_THRESHOLD: Record<AiDifficulty, number> = { easy: -Infinity, medium: -2000, hard: -2500 };

// ── 공개 API ──────────────────────────────────────────────────────────────────

export function getBestMove(
  board: BoardState,
  aiColor: Color,
  context: GameContext,
  ruleset: RuleSet,
  difficulty: AiDifficulty = 'medium',
  moveCount = 0,
): AiMove | null | 'resign' {
  const moves = getAllAiMoves(board, aiColor, context, ruleset);
  if (moves.length === 0) return null;

  // 같은 점수 수 중 랜덤 선택으로 다양성 확보 (항상 셔플)
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j], moves[i]];
  }

  // 초급: 일정 확률로 최선이 아닌 랜덤 수 선택 (항복 없음)
  if (Math.random() < DIFFICULTY_RANDOM_RATE[difficulty]) {
    return moves[0];
  }

  // Crazyhouse: 분기 수가 많아지므로 탐색 깊이 1 감소
  const hasDrops = !!(ruleset.getDropTargets && context.hand?.[aiColor]?.length);
  const depth = Math.max(1, DIFFICULTY_DEPTH[difficulty] - (hasDrops ? 1 : 0));

  let bestMove = moves[0];
  let bestVal  = -Infinity;

  for (const move of moves) {
    const { board: nb, context: nc } = applyAiMove(board, move, context, ruleset);
    const val = minimax(nb, depth - 1, -Infinity, Infinity, false, aiColor, nc, ruleset);
    if (val > bestVal) { bestVal = val; bestMove = move; }
  }

  // AI 항복: 탐색 결과가 임계값 이하이고 게임이 충분히 진행된 경우
  if (moveCount >= 14 && bestVal <= RESIGN_THRESHOLD[difficulty]) return 'resign';

  return bestMove;
}
