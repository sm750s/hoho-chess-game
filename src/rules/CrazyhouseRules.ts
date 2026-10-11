import type { RuleSet, DropResult } from './RuleSet';
import { StandardRules } from './StandardRules';
import type { BoardState, Color, PieceType } from '../core/types';
import type { GameContext } from '../core/MoveValidator';

export const CrazyhouseRules: RuleSet = {
  name: 'Crazyhouse',
  description: '잡은 기물을 패에서 놓을 수 있음',

  createInitialBoard: StandardRules.createInitialBoard,

  createInitialContext(): GameContext {
    return {
      ...StandardRules.createInitialContext(),
      hand: { white: [], black: [] },
    };
  },

  getLegalMoves: StandardRules.getLegalMoves,

  applyMove(board, from, to, context) {
    const result = StandardRules.applyMove(board, from, to, context);
    const hand = context.hand ?? { white: [], black: [] };
    // 잡은 기물을 공격자 패에 추가 (킹 제외, 프로모션된 폰은 폰으로 복귀)
    const captured = result.capturedPiece;
    const turn: Color = board[from[0]][from[1]]!.color;
    if (captured && captured.type !== 'K') {
      const pieceToHand: PieceType = captured.type;
      const newHand = { ...hand };
      newHand[turn] = [...newHand[turn], pieceToHand];
      return {
        ...result,
        context: { castlingRights: result.castlingRights, enPassantTarget: result.enPassantTarget, hand: newHand },
      };
    }
    return { ...result, context: { castlingRights: result.castlingRights, enPassantTarget: result.enPassantTarget, hand } };
  },

  getGameStatus: StandardRules.getGameStatus,
  getAutoPromotion: () => null,

  getDropTargets(board: BoardState, _context: GameContext, pieceType: PieceType, _color: Color): [number, number][] {
    const targets: [number, number][] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] !== null) continue;
        // 폰은 첫/마지막 줄에 놓을 수 없음
        if (pieceType === 'P' && (r === 0 || r === 7)) continue;
        targets.push([r, c]);
      }
    }
    return targets;
  },

  applyDrop(board: BoardState, to: [number, number], pieceType: PieceType, color: Color, context: GameContext): DropResult {
    const next = board.map(r => [...r]);
    next[to[0]][to[1]] = { type: pieceType, color };
    const hand = context.hand ?? { white: [], black: [] };
    const newHand = { ...hand };
    const idx = newHand[color].indexOf(pieceType);
    if (idx >= 0) newHand[color] = [...newHand[color].slice(0, idx), ...newHand[color].slice(idx + 1)];
    return {
      board: next,
      context: { ...context, hand: newHand, enPassantTarget: null },
    };
  },
};
